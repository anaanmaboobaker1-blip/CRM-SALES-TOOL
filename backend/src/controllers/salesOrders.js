const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { generatePDF } = require('../utils/pdf');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// Helper to calculate totals
function calculateSalesOrderTotals(items, discountAmountInput = 0) {
  let subtotal = 0;
  let taxAmount = 0;

  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    const discPercent = parseFloat(item.discount) || 0;
    const taxPercent = parseFloat(item.tax) || 0;

    const baseTotal = qty * price;
    const itemDiscount = baseTotal * (discPercent / 100);
    const afterDiscount = baseTotal - itemDiscount;
    const itemTax = afterDiscount * (taxPercent / 100);
    const total = afterDiscount + itemTax;

    subtotal += afterDiscount;
    taxAmount += itemTax;

    return {
      name: item.name,
      quantity: qty,
      unitPrice: price,
      discount: discPercent,
      tax: taxPercent,
      total,
    };
  });

  const discountAmount = parseFloat(discountAmountInput) || 0;
  const grandTotal = Math.max(0, subtotal - discountAmount + taxAmount);

  return {
    processedItems,
    subtotal,
    discountAmount,
    taxAmount,
    grandTotal,
  };
}

// List Sales Orders
async function listSalesOrders(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'salespersonId');
    const { status, salespersonId, customerId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const where = {
      deletedAt: null,
      ...roleFilter,
    };

    if (status) where.status = status;
    if (salespersonId) where.salespersonId = parseInt(salespersonId);
    if (customerId) where.customerId = parseInt(customerId);

    if (search) {
      where.OR = [
        { salesOrderNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [orders, total] = await prisma.$transaction([
      prisma.salesOrder.findMany({
        where,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true } },
        },
      }),
      prisma.salesOrder.count({ where }),
    ]);

    res.json({
      success: true,
      data: orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    next(err);
  }
}

// Get single Sales Order
async function getSalesOrderById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        contact: true,
        items: true,
      },
    });

    if (!order || order.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    // Role query check (customer owner relation)
    if (req.user.role === 'Salesperson' && order.customer.assignedSalespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: order });
  } catch (err) {
    next(err);
  }
}

// Create Sales Order directly
async function createSalesOrder(req, res, next) {
  try {
    const { customerId, contactId, orderDate, deliveryDate, deliveryAddress, items, discountAmount, paymentTerms, notes, status } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: parseInt(customerId) } });
    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Generate order number (e.g. SO-2026-00001)
    const currentYear = new Date().getFullYear();
    const count = await prisma.salesOrder.count({
      where: {
        salesOrderNumber: { startsWith: `SO-${currentYear}` },
      },
    });
    const seqNum = String(count + 1).padStart(5, '0');
    const salesOrderNumber = `SO-${currentYear}-${seqNum}`;

    // Perform Server-Side Totals Calculation
    const { processedItems, subtotal, discountAmount: calcDiscount, taxAmount, grandTotal } = calculateSalesOrderTotals(items, discountAmount);

    const order = await prisma.salesOrder.create({
      data: {
        salesOrderNumber,
        customerId: parseInt(customerId),
        contactId: contactId ? parseInt(contactId) : null,
        orderDate: new Date(orderDate),
        deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
        deliveryAddress: deliveryAddress || customer.shippingAddress || customer.billingAddress,
        subtotal,
        discountAmount: calcDiscount,
        taxAmount,
        grandTotal,
        paymentTerms,
        notes,
        status: status || 'Pending',
        items: {
          create: processedItems,
        },
      },
      include: { items: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_SALES_ORDER',
      module: 'ORDERS',
      recordId: order.id,
      newValue: salesOrderNumber,
    });

    res.status(201).json({ success: true, message: 'Sales Order created successfully', data: order });
  } catch (err) {
    next(err);
  }
}

// Update Sales Order
async function updateSalesOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order || order.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    if (!canModify(req, order.customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (order.status !== 'Pending') {
      return res.status(400).json({ success: false, message: 'Can only edit sales orders in Pending status' });
    }

    const { customerId, contactId, orderDate, deliveryDate, deliveryAddress, items, discountAmount, paymentTerms, notes, status } = req.body;

    let updateData = {
      contactId: contactId ? parseInt(contactId) : null,
      orderDate: orderDate ? new Date(orderDate) : undefined,
      deliveryDate: deliveryDate ? new Date(deliveryDate) : null,
      deliveryAddress,
      paymentTerms,
      notes,
      status,
    };

    if (items) {
      const { processedItems, subtotal, discountAmount: calcDiscount, taxAmount, grandTotal } = calculateSalesOrderTotals(items, discountAmount);
      
      updateData = {
        ...updateData,
        subtotal,
        discountAmount: calcDiscount,
        taxAmount,
        grandTotal,
      };

      const updated = await prisma.$transaction(async (tx) => {
        await tx.salesOrderItem.deleteMany({ where: { salesOrderId: id } });
        return await tx.salesOrder.update({
          where: { id },
          data: {
            ...updateData,
            items: { create: processedItems },
          },
          include: { items: true },
        });
      });

      return res.json({ success: true, message: 'Sales Order updated successfully', data: updated });
    } else {
      const updated = await prisma.salesOrder.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true, message: 'Sales Order updated successfully', data: updated });
    }
  } catch (err) {
    next(err);
  }
}

// Soft Delete Sales Order
async function deleteSalesOrder(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order || order.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    if (!canModify(req, order.customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (order.status === 'Fulfilled') {
      return res.status(400).json({ success: false, message: 'Cannot delete fulfilled sales orders' });
    }

    await prisma.salesOrder.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_SALES_ORDER',
      module: 'ORDERS',
      recordId: id,
      oldValue: order.salesOrderNumber,
    });

    res.json({ success: true, message: 'Sales Order deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Generate PDF
async function downloadPDF(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: {
        customer: true,
        contact: true,
        items: true,
      },
    });

    if (!order || order.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    // Role check
    if (req.user.role === 'Salesperson' && order.customer.assignedSalespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=sales-order-${order.salesOrderNumber}.pdf`);

    generatePDF('SALES_ORDER', order, res);
  } catch (err) {
    next(err);
  }
}

// Change Order Status (quick cancel/fulfill)
async function updateOrderStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id },
      include: { customer: true },
    });

    if (!order || order.deletedAt) {
      return res.status(404).json({ success: false, message: 'Sales Order not found' });
    }

    if (!canModify(req, order.customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updated = await prisma.salesOrder.update({
      where: { id },
      data: { status },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_ORDER_STATUS',
      module: 'ORDERS',
      recordId: id,
      oldValue: order.status,
      newValue: status,
    });

    res.json({ success: true, message: `Sales order status changed to ${status}`, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSalesOrders,
  getSalesOrderById,
  createSalesOrder,
  updateSalesOrder,
  deleteSalesOrder,
  downloadPDF,
  updateOrderStatus,
};

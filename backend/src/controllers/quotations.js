const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { generatePDF } = require('../utils/pdf');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// Helper to calculate totals from items
function calculateQuotationTotals(items, discountAmountInput = 0) {
  let subtotal = 0;
  let taxAmount = 0;

  const processedItems = items.map(item => {
    const qty = parseFloat(item.quantity);
    const price = parseFloat(item.unitPrice);
    const discPercent = parseFloat(item.discount) || 0; // percentage
    const taxPercent = parseFloat(item.tax) || 0;

    const baseTotal = qty * price;
    const itemDiscount = baseTotal * (discPercent / 100);
    const afterDiscount = baseTotal - itemDiscount;
    const itemTax = afterDiscount * (taxPercent / 100);
    const total = afterDiscount + itemTax;

    subtotal += afterDiscount; // sum of item subtotals after line discounts
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

  // Calculate grand total applying any overall invoice discount
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

// List Quotations
async function listQuotations(req, res, next) {
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
        { quotationNumber: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [quotations, total] = await prisma.$transaction([
      prisma.quotation.findMany({
        where,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true } },
          salesperson: { select: { id: true, name: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ]);

    res.json({
      success: true,
      data: quotations,
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

// Get single Quotation
async function getQuotationById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        contact: true,
        salesperson: { select: { id: true, name: true, email: true } },
        items: true,
      },
    });

    if (!quotation || quotation.deletedAt) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (req.user.role === 'Salesperson' && quotation.salespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: quotation });
  } catch (err) {
    next(err);
  }
}

// Create Quotation
async function createQuotation(req, res, next) {
  try {
    const { customerId, contactId, quotationDate, validityDate, items, discountAmount, paymentTerms, termsAndConditions, notes, salespersonId, status } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: parseInt(customerId) } });
    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    // Auto-generate quotation number (e.g. QT-2026-00001)
    const currentYear = new Date().getFullYear();
    const count = await prisma.quotation.count({
      where: {
        quotationNumber: { startsWith: `QT-${currentYear}` },
      },
    });
    const seqNum = String(count + 1).padStart(5, '0');
    const quotationNumber = `QT-${currentYear}-${seqNum}`;

    // Perform Server-Side Totals Calculation
    const { processedItems, subtotal, discountAmount: calcDiscount, taxAmount, grandTotal } = calculateQuotationTotals(items, discountAmount);

    const finalSalespersonId = req.user.role === 'Salesperson' ? req.user.id : (salespersonId ? parseInt(salespersonId) : req.user.id);

    const quotation = await prisma.quotation.create({
      data: {
        quotationNumber,
        customerId: parseInt(customerId),
        contactId: contactId ? parseInt(contactId) : null,
        quotationDate: new Date(quotationDate),
        validityDate: validityDate ? new Date(validityDate) : null,
        subtotal,
        discountAmount: calcDiscount,
        taxAmount,
        grandTotal,
        paymentTerms,
        termsAndConditions,
        notes,
        salespersonId: finalSalespersonId,
        status: status || 'Draft',
        items: {
          create: processedItems,
        },
      },
      include: { items: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_QUOTATION',
      module: 'QUOTATIONS',
      recordId: quotation.id,
      newValue: quotationNumber,
    });

    res.status(201).json({ success: true, message: 'Quotation created successfully', data: quotation });
  } catch (err) {
    next(err);
  }
}

// Edit Quotation
async function updateQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const quotation = await prisma.quotation.findUnique({ where: { id } });

    if (!quotation || quotation.deletedAt) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (!canModify(req, quotation.salespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (quotation.status !== 'Draft' && quotation.status !== 'Sent') {
      return res.status(400).json({ success: false, message: 'Can only edit quotations in Draft or Sent status' });
    }

    const { customerId, contactId, quotationDate, validityDate, items, discountAmount, paymentTerms, termsAndConditions, notes, salespersonId, status } = req.body;

    let updateData = {
      contactId: contactId ? parseInt(contactId) : null,
      quotationDate: quotationDate ? new Date(quotationDate) : undefined,
      validityDate: validityDate ? new Date(validityDate) : null,
      paymentTerms,
      termsAndConditions,
      notes,
      salespersonId: salespersonId ? parseInt(salespersonId) : undefined,
      status,
    };

    if (items) {
      const { processedItems, subtotal, discountAmount: calcDiscount, taxAmount, grandTotal } = calculateQuotationTotals(items, discountAmount);
      
      updateData = {
        ...updateData,
        subtotal,
        discountAmount: calcDiscount,
        taxAmount,
        grandTotal,
      };

      // Perform transaction to clean old items and update quotation details
      const updated = await prisma.$transaction(async (tx) => {
        await tx.quotationItem.deleteMany({ where: { quotationId: id } });
        return await tx.quotation.update({
          where: { id },
          data: {
            ...updateData,
            items: { create: processedItems },
          },
          include: { items: true },
        });
      });

      await logAudit({
        userId: req.user.id,
        action: 'UPDATE_QUOTATION',
        module: 'QUOTATIONS',
        recordId: id,
        oldValue: quotation.grandTotal,
        newValue: updated.grandTotal,
      });

      return res.json({ success: true, message: 'Quotation updated successfully', data: updated });
    } else {
      const updated = await prisma.quotation.update({
        where: { id },
        data: updateData,
      });

      res.json({ success: true, message: 'Quotation updated successfully', data: updated });
    }
  } catch (err) {
    next(err);
  }
}

// Soft Delete Quotation
async function deleteQuotation(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const quotation = await prisma.quotation.findUnique({ where: { id } });

    if (!quotation || quotation.deletedAt) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (!canModify(req, quotation.salespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Business Rule: Can only delete Draft or Expired/Rejected quotes
    if (quotation.status === 'Accepted') {
      return res.status(400).json({ success: false, message: 'Cannot delete accepted quotations' });
    }

    await prisma.quotation.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_QUOTATION',
      module: 'QUOTATIONS',
      recordId: id,
      oldValue: quotation.quotationNumber,
    });

    res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Generate PDF
async function downloadPDF(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const quotation = await prisma.quotation.findUnique({
      where: { id },
      include: {
        customer: true,
        contact: true,
        items: true,
      },
    });

    if (!quotation || quotation.deletedAt) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    if (req.user.role === 'Salesperson' && quotation.salespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=quotation-${quotation.quotationNumber}.pdf`);

    // Stream PDF
    generatePDF('QUOTATION', quotation, res);
  } catch (err) {
    next(err);
  }
}

// Convert Accepted Quotation to Sales Order
async function convertToSalesOrder(req, res, next) {
  try {
    const quotationId = parseInt(req.params.id);

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const quotation = await prisma.quotation.findUnique({
      where: { id: quotationId },
      include: { items: true, customer: true },
    });

    if (!quotation || quotation.deletedAt) {
      return res.status(404).json({ success: false, message: 'Quotation not found' });
    }

    // Business Rule: accepted quotations can normally be converted
    if (quotation.status !== 'Accepted') {
      return res.status(400).json({
        success: false,
        message: 'Only Accepted quotations can be converted into Sales Orders. Please update quotation status first.',
      });
    }

    // Check if Sales Order already exists for this Quotation
    const existingOrder = await prisma.salesOrder.findFirst({
      where: { quotationId, deletedAt: null },
    });

    if (existingOrder) {
      return res.status(409).json({
        success: false,
        message: `A Sales Order already exists for this quotation (${existingOrder.salesOrderNumber})`,
      });
    }

    // Generate sequential Order Number (e.g. SO-2026-00001)
    const currentYear = new Date().getFullYear();
    const count = await prisma.salesOrder.count({
      where: {
        salesOrderNumber: { startsWith: `SO-${currentYear}` },
      },
    });
    const seqNum = String(count + 1).padStart(5, '0');
    const salesOrderNumber = `SO-${currentYear}-${seqNum}`;

    const salesOrder = await prisma.$transaction(async (tx) => {
      // Create Sales Order copying values
      const order = await tx.salesOrder.create({
        data: {
          salesOrderNumber,
          customerId: quotation.customerId,
          contactId: quotation.contactId,
          orderDate: new Date(),
          deliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default delivery in 7 days
          deliveryAddress: quotation.customer.shippingAddress || quotation.customer.billingAddress,
          subtotal: quotation.subtotal,
          discountAmount: quotation.discountAmount,
          taxAmount: quotation.taxAmount,
          grandTotal: quotation.grandTotal,
          paymentTerms: quotation.paymentTerms,
          notes: `Converted from Quotation ${quotation.quotationNumber}`,
          status: 'Pending',
          quotationId,
          items: {
            create: quotation.items.map(item => ({
              name: item.name,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              discount: item.discount,
              tax: item.tax,
              total: item.total,
            })),
          },
        },
      });

      return order;
    });

    await logAudit({
      userId: req.user.id,
      action: 'CONVERT_QUOTATION_TO_ORDER',
      module: 'QUOTATIONS',
      recordId: quotationId,
      newValue: salesOrderNumber,
    });

    res.status(201).json({
      success: true,
      message: 'Quotation successfully converted to Sales Order',
      data: salesOrder,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listQuotations,
  getQuotationById,
  createQuotation,
  updateQuotation,
  deleteQuotation,
  downloadPDF,
  convertToSalesOrder,
};

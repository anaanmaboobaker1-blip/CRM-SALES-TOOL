const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// List customers
async function listCustomers(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'assignedSalespersonId');
    const { customerType, status, assignedSalespersonId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const where = {
      deletedAt: null,
      ...roleFilter,
    };

    if (customerType) where.customerType = customerType;
    if (status) where.status = status;
    if (assignedSalespersonId) where.assignedSalespersonId = parseInt(assignedSalespersonId);

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [customers, total] = await prisma.$transaction([
      prisma.customer.findMany({
        where,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take,
        include: {
          assignedSalesperson: { select: { id: true, name: true, email: true } },
          tags: true,
        },
      }),
      prisma.customer.count({ where }),
    ]);

    res.json({
      success: true,
      data: customers,
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

// Get customer profile and tabs
async function getCustomerById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        assignedSalesperson: { select: { id: true, name: true, email: true } },
        tags: true,
        contacts: true,
        deals: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        quotations: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        salesOrders: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
        },
        notes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        documents: {
          include: { uploadedBy: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.user.role === 'Salesperson' && customer.assignedSalespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Record assigned to another owner' });
    }

    res.json({ success: true, data: customer });
  } catch (err) {
    next(err);
  }
}

// Create Customer
async function createCustomer(req, res, next) {
  try {
    const { name, companyName, customerType, phone, email, gstin, billingAddress, shippingAddress, customerGroup, status, assignedSalespersonId, tags } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Duplicate Check
    if (email || phone) {
      const existing = await prisma.customer.findFirst({
        where: {
          deletedAt: null,
          OR: [
            email ? { email } : null,
            phone ? { phone } : null,
          ].filter(Boolean),
        },
      });

      if (existing) {
        return res.status(409).json({
          success: false,
          message: `A customer with this email/phone already exists (${existing.name})`,
        });
      }
    }

    const finalSalespersonId = req.user.role === 'Salesperson' ? req.user.id : (assignedSalespersonId ? parseInt(assignedSalespersonId) : null);

    const customer = await prisma.customer.create({
      data: {
        name,
        companyName,
        customerType,
        phone,
        email,
        gstin,
        billingAddress,
        shippingAddress: shippingAddress || billingAddress,
        customerGroup,
        status: status || 'Active',
        assignedSalespersonId: finalSalespersonId,
        tags: tags && tags.length > 0 ? {
          create: tags.map(tag => ({ tag })),
        } : undefined,
      },
      include: { tags: true },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_CUSTOMER',
      module: 'CUSTOMERS',
      recordId: customer.id,
      newValue: customer,
    });

    res.status(201).json({ success: true, message: 'Customer created successfully', data: customer });
  } catch (err) {
    next(err);
  }
}

// Update Customer
async function updateCustomer(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.findUnique({ where: { id } });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!canModify(req, customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { name, companyName, customerType, phone, email, gstin, billingAddress, shippingAddress, customerGroup, status, assignedSalespersonId, tags } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      // Clear old tags if new ones are provided
      if (tags) {
        await tx.customerTag.deleteMany({ where: { customerId: id } });
      }

      return await tx.customer.update({
        where: { id },
        data: {
          name,
          companyName,
          customerType,
          phone,
          email,
          gstin,
          billingAddress,
          shippingAddress,
          customerGroup,
          status,
          assignedSalespersonId: assignedSalespersonId ? parseInt(assignedSalespersonId) : null,
          tags: tags && tags.length > 0 ? {
            create: tags.map(tag => ({ tag })),
          } : undefined,
        },
        include: { tags: true },
      });
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_CUSTOMER',
      module: 'CUSTOMERS',
      recordId: id,
      oldValue: customer,
      newValue: updated,
    });

    res.json({ success: true, message: 'Customer updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

// Soft Delete Customer
async function deleteCustomer(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const customer = await prisma.customer.findUnique({ where: { id } });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!canModify(req, customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await prisma.customer.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_CUSTOMER',
      module: 'CUSTOMERS',
      recordId: id,
      oldValue: customer.name,
    });

    res.json({ success: true, message: 'Customer deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Add Note
async function addCustomerNote(req, res, next) {
  try {
    const customerId = parseInt(req.params.id);
    const { note } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!canModify(req, customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const customerNote = await prisma.customerNote.create({
      data: {
        customerId,
        userId: req.user.id,
        note,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, message: 'Note added successfully', data: customerNote });
  } catch (err) {
    next(err);
  }
}

// Upload Document
async function uploadCustomerDocument(req, res, next) {
  try {
    const customerId = parseInt(req.params.id);

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!canModify(req, customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const doc = await prisma.customerDocument.create({
      data: {
        customerId,
        name: req.body.name || req.file.originalname,
        filePath: `uploads/${req.file.filename}`,
        fileType: req.file.mimetype,
        uploadedById: req.user.id,
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPLOAD_DOCUMENT',
      module: 'CUSTOMERS',
      recordId: customerId,
      newValue: doc.name,
    });

    res.status(201).json({ success: true, message: 'Document uploaded successfully', data: doc });
  } catch (err) {
    next(err);
  }
}

// Get customer timeline history
async function getCustomerTimeline(req, res, next) {
  try {
    const customerId = parseInt(req.params.id);
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });

    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (req.user.role === 'Salesperson' && customer.assignedSalespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // Retrieve and aggregate timeline events
    const notes = await prisma.customerNote.findMany({
      where: { customerId },
      include: { user: { select: { name: true } } },
    });

    const activities = await prisma.activity.findMany({
      where: { relatedCustomerId: customerId },
      include: { assignedEmployee: { select: { name: true } } },
    });

    const deals = await prisma.deal.findMany({
      where: { customerId, deletedAt: null },
    });

    const quotations = await prisma.quotation.findMany({
      where: { customerId, deletedAt: null },
    });

    const salesOrders = await prisma.salesOrder.findMany({
      where: { customerId, deletedAt: null },
    });

    const timeline = [];

    // Map events to a consistent structure
    notes.forEach(n => {
      timeline.push({
        id: `note-${n.id}`,
        type: 'NOTE',
        title: 'Note added',
        description: n.note,
        user: n.user.name,
        date: n.createdAt,
      });
    });

    activities.forEach(a => {
      timeline.push({
        id: `activity-${a.id}`,
        type: 'ACTIVITY',
        title: `${a.type}: ${a.title}`,
        description: `Status: ${a.status} | Priority: ${a.priority}${a.notes ? ` | Notes: ${a.notes}` : ''}`,
        user: a.assignedEmployee ? a.assignedEmployee.name : 'Unassigned',
        date: a.createdAt,
      });
    });

    deals.forEach(d => {
      timeline.push({
        id: `deal-${d.id}`,
        type: 'DEAL',
        title: `Deal: ${d.name}`,
        description: `Stage: ${d.dealStage} | Value: INR ${d.dealValue} | Probability: ${d.probability}%`,
        user: 'System',
        date: d.createdAt,
      });
    });

    quotations.forEach(q => {
      timeline.push({
        id: `quote-${q.id}`,
        type: 'QUOTATION',
        title: `Quotation ${q.quotationNumber}`,
        description: `Status: ${q.status} | Grand Total: INR ${q.grandTotal}`,
        user: 'System',
        date: q.createdAt,
      });
    });

    salesOrders.forEach(s => {
      timeline.push({
        id: `order-${s.id}`,
        type: 'SALES_ORDER',
        title: `Sales Order ${s.salesOrderNumber}`,
        description: `Status: ${s.status} | Grand Total: INR ${s.grandTotal}`,
        user: 'System',
        date: s.createdAt,
      });
    });

    // Sort timeline by date descending
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, data: timeline });
  } catch (err) {
    next(err);
  }
}

// Add Customer Contact
async function addCustomerContact(req, res, next) {
  try {
    const customerId = parseInt(req.params.id);
    const { name, designation, phone, email, isPrimary, notes } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer || customer.deletedAt) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    if (!canModify(req, customer.assignedSalespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    // If marked as primary, unmark existing primary contacts
    if (isPrimary) {
      await prisma.customerContact.updateMany({
        where: { customerId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const contact = await prisma.customerContact.create({
      data: {
        customerId,
        name,
        designation,
        phone,
        email,
        isPrimary,
        notes,
      },
    });

    res.status(201).json({ success: true, message: 'Contact added successfully', data: contact });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerNote,
  uploadCustomerDocument,
  getCustomerTimeline,
  addCustomerContact,
};

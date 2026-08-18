const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// List deals
async function listDeals(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'salespersonId');
    const { dealStage, salespersonId, customerId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const where = {
      deletedAt: null,
      ...roleFilter,
    };

    if (dealStage) where.dealStage = dealStage;
    if (salespersonId) where.salespersonId = parseInt(salespersonId);
    if (customerId) where.customerId = parseInt(customerId);

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { customer: { name: { contains: search } } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [deals, total] = await prisma.$transaction([
      prisma.deal.findMany({
        where,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take,
        include: {
          customer: { select: { id: true, name: true, companyName: true } },
          salesperson: { select: { id: true, name: true } },
        },
      }),
      prisma.deal.count({ where }),
    ]);

    // Add weighted value helper to output
    const formattedDeals = deals.map(deal => ({
      ...deal,
      weightedValue: (deal.dealValue * deal.probability) / 100,
    }));

    res.json({
      success: true,
      data: formattedDeals,
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

// Get single deal by ID
async function getDealById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true, billingAddress: true } },
        contact: true,
        salesperson: { select: { id: true, name: true, email: true } },
        products: true,
        notes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!deal || deal.deletedAt) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (req.user.role === 'Salesperson' && deal.salespersonId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Record belongs to another salesperson' });
    }

    const formattedDeal = {
      ...deal,
      weightedValue: (deal.dealValue * deal.probability) / 100,
    };

    res.json({ success: true, data: formattedDeal });
  } catch (err) {
    next(err);
  }
}

// Create Deal
async function createDeal(req, res, next) {
  try {
    const { name, customerId, contactId, dealValue, dealStage, probability, expectedClosingDate, salespersonId, products, status } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const finalSalespersonId = req.user.role === 'Salesperson' ? req.user.id : (salespersonId ? parseInt(salespersonId) : null);

    const deal = await prisma.$transaction(async (tx) => {
      const createdDeal = await tx.deal.create({
        data: {
          name,
          customerId: parseInt(customerId),
          contactId: contactId ? parseInt(contactId) : null,
          dealValue: parseFloat(dealValue),
          dealStage,
          probability: parseFloat(probability),
          expectedClosingDate: expectedClosingDate ? new Date(expectedClosingDate) : null,
          salespersonId: finalSalespersonId,
          status: status || 'Open',
          products: products && products.length > 0 ? {
            create: products.map(p => ({
              name: p.name,
              quantity: parseFloat(p.quantity),
              unitPrice: parseFloat(p.unitPrice),
              discount: parseFloat(p.discount) || 0.0,
              tax: parseFloat(p.tax) || 0.0,
              total: parseFloat(p.quantity) * parseFloat(p.unitPrice) * (1 - (p.discount || 0) / 100) * (1 + (p.tax || 0) / 100),
            })),
          } : undefined,
        },
        include: { products: true },
      });

      return createdDeal;
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_DEAL',
      module: 'DEALS',
      recordId: deal.id,
      newValue: deal,
    });

    res.status(201).json({ success: true, message: 'Deal created successfully', data: deal });
  } catch (err) {
    next(err);
  }
}

// Update Deal details
async function updateDeal(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const deal = await prisma.deal.findUnique({ where: { id } });

    if (!deal || deal.deletedAt) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (!canModify(req, deal.salespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { name, customerId, contactId, dealValue, dealStage, probability, expectedClosingDate, salespersonId, products, status, lostReason } = req.body;

    const updated = await prisma.$transaction(async (tx) => {
      // Clear old products if products array is supplied
      if (products) {
        await tx.dealProduct.deleteMany({ where: { dealId: id } });
      }

      return await tx.deal.update({
        where: { id },
        data: {
          name,
          customerId: customerId ? parseInt(customerId) : undefined,
          contactId: contactId ? parseInt(contactId) : null,
          dealValue: dealValue !== undefined ? parseFloat(dealValue) : undefined,
          dealStage,
          probability: probability !== undefined ? parseFloat(probability) : undefined,
          expectedClosingDate: expectedClosingDate ? new Date(expectedClosingDate) : null,
          salespersonId: salespersonId ? parseInt(salespersonId) : null,
          status,
          lostReason,
          products: products && products.length > 0 ? {
            create: products.map(p => ({
              name: p.name,
              quantity: parseFloat(p.quantity),
              unitPrice: parseFloat(p.unitPrice),
              discount: parseFloat(p.discount) || 0.0,
              tax: parseFloat(p.tax) || 0.0,
              total: parseFloat(p.quantity) * parseFloat(p.unitPrice) * (1 - (p.discount || 0) / 100) * (1 + (p.tax || 0) / 100),
            })),
          } : undefined,
        },
        include: { products: true },
      });
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_DEAL',
      module: 'DEALS',
      recordId: id,
      oldValue: deal,
      newValue: updated,
    });

    res.json({ success: true, message: 'Deal updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

// Soft Delete Deal
async function deleteDeal(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const deal = await prisma.deal.findUnique({ where: { id } });

    if (!deal || deal.deletedAt) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (!canModify(req, deal.salespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await prisma.deal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_DEAL',
      module: 'DEALS',
      recordId: id,
      oldValue: deal.name,
    });

    res.json({ success: true, message: 'Deal deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Add Note
async function addDealNote(req, res, next) {
  try {
    const dealId = parseInt(req.params.id);
    const { note } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const deal = await prisma.deal.findUnique({ where: { id: dealId } });
    if (!deal || deal.deletedAt) {
      return res.status(404).json({ success: false, message: 'Deal not found' });
    }

    if (!canModify(req, deal.salespersonId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const dealNote = await prisma.dealNote.create({
      data: {
        dealId,
        userId: req.user.id,
        note,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, message: 'Note added successfully', data: dealNote });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listDeals,
  getDealById,
  createDeal,
  updateDeal,
  deleteDeal,
  addDealNote,
};

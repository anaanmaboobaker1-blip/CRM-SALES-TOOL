const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// List leads with filters, search, sorting, and pagination
async function listLeads(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'ownerId');
    const { status, priority, source, ownerId, search, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 10 } = req.query;

    const where = {
      deletedAt: null,
      ...roleFilter,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (ownerId) where.ownerId = parseInt(ownerId);

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { company: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [leads, total] = await prisma.$transaction([
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        skip,
        take,
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({
      success: true,
      data: leads,
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

// Get single lead by ID
async function getLeadById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        notes: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        activities: {
          orderBy: { dueDate: 'desc' },
        },
      },
    });

    if (!lead || lead.deletedAt) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    // Role ownership check
    if (req.user.role === 'Salesperson' && lead.ownerId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden: Record belongs to another owner' });
    }

    res.json({ success: true, data: lead });
  } catch (err) {
    next(err);
  }
}

// Create new lead with duplicate detection
async function createLead(req, res, next) {
  try {
    const { name, company, phone, email, source, status, priority, ownerId, nextFollowUp } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden: View Only users cannot modify records' });
    }

    // Duplicate detection: check if name + company or email already exists
    if (email || phone) {
      const existing = await prisma.lead.findFirst({
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
          message: `Duplicate lead detected: A lead with this email/phone already exists (${existing.name} from ${existing.company || 'N/A'})`,
        });
      }
    }

    // Set ownerId automatically for Salesperson if not specified
    const finalOwnerId = req.user.role === 'Salesperson' ? req.user.id : (ownerId ? parseInt(ownerId) : null);

    const lead = await prisma.lead.create({
      data: {
        name,
        company,
        phone,
        email,
        source,
        status,
        priority,
        ownerId: finalOwnerId,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_LEAD',
      module: 'LEADS',
      recordId: lead.id,
      newValue: lead,
    });

    res.status(201).json({ success: true, message: 'Lead created successfully', data: lead });
  } catch (err) {
    next(err);
  }
}

// Update lead details
async function updateLead(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead || lead.deletedAt) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!canModify(req, lead.ownerId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to modify this lead' });
    }

    const { name, company, phone, email, source, status, priority, ownerId, nextFollowUp } = req.body;

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        name,
        company,
        phone,
        email,
        source,
        status,
        priority,
        ownerId: ownerId ? parseInt(ownerId) : null,
        nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : null,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'UPDATE_LEAD',
      module: 'LEADS',
      recordId: id,
      oldValue: lead,
      newValue: updatedLead,
    });

    res.json({ success: true, message: 'Lead updated successfully', data: updatedLead });
  } catch (err) {
    next(err);
  }
}

// Soft delete lead
async function deleteLead(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const lead = await prisma.lead.findUnique({ where: { id } });

    if (!lead || lead.deletedAt) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!canModify(req, lead.ownerId)) {
      return res.status(403).json({ success: false, message: 'Forbidden: You do not have permission to delete this lead' });
    }

    await prisma.lead.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await logAudit({
      userId: req.user.id,
      action: 'DELETE_LEAD',
      module: 'LEADS',
      recordId: id,
      oldValue: lead.name,
    });

    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Add lead note
async function addLeadNote(req, res, next) {
  try {
    const leadId = parseInt(req.params.id);
    const { note } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!canModify(req, lead.ownerId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const leadNote = await prisma.leadNote.create({
      data: {
        leadId,
        userId: req.user.id,
        note,
      },
      include: { user: { select: { id: true, name: true } } },
    });

    res.status(201).json({ success: true, message: 'Note added successfully', data: leadNote });
  } catch (err) {
    next(err);
  }
}

// Add follow-up activity directly to lead
async function addLeadActivity(req, res, next) {
  try {
    const leadId = parseInt(req.params.id);
    const { title, type, dueDate, priority, notes } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (!canModify(req, lead.ownerId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const activity = await prisma.activity.create({
      data: {
        title,
        type,
        relatedLeadId: leadId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: 'Pending',
        notes,
        assignedEmployeeId: lead.ownerId || req.user.id,
      },
    });

    res.status(201).json({ success: true, message: 'Activity scheduled successfully', data: activity });
  } catch (err) {
    next(err);
  }
}

// Convert lead to Customer, Contact, and optionally Deal
async function convertLead(req, res, next) {
  try {
    const leadId = parseInt(req.params.id);
    const { createDeal, dealName, dealValue, expectedClosingDate } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.deletedAt) {
      return res.status(404).json({ success: false, message: 'Lead not found' });
    }

    if (lead.convertedAt) {
      return res.status(400).json({ success: false, message: 'Lead has already been converted' });
    }

    if (!canModify(req, lead.ownerId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    let customerId;
    let contactId;
    let dealId = null;

    // Start a transaction to ensure atomic conversion
    await prisma.$transaction(async (tx) => {
      // 1. Check for existing customer to prevent duplicates
      let customer = null;
      if (lead.email || lead.phone) {
        customer = await tx.customer.findFirst({
          where: {
            deletedAt: null,
            OR: [
              lead.email ? { email: lead.email } : null,
              lead.phone ? { phone: lead.phone } : null,
            ].filter(Boolean),
          },
        });
      }

      if (!customer) {
        // Create new Customer
        customer = await tx.customer.create({
          data: {
            name: lead.company || lead.name,
            companyName: lead.company,
            customerType: lead.company ? 'Business' : 'Individual',
            phone: lead.phone,
            email: lead.email,
            status: 'Active',
            assignedSalespersonId: lead.ownerId || req.user.id,
          },
        });
      }
      customerId = customer.id;

      // 2. Create primary Contact
      const contact = await tx.customerContact.create({
        data: {
          customerId,
          name: lead.name,
          phone: lead.phone,
          email: lead.email,
          isPrimary: true,
          notes: `Created during Lead Conversion of Lead ID: ${leadId}`,
        },
      });
      contactId = contact.id;

      // 3. Create optional Deal
      if (createDeal) {
        const deal = await tx.deal.create({
          data: {
            name: dealName || `${lead.company || lead.name} - Deal`,
            customerId,
            contactId,
            dealValue: parseFloat(dealValue) || 0,
            dealStage: 'Qualification',
            probability: 20,
            expectedClosingDate: expectedClosingDate ? new Date(expectedClosingDate) : null,
            salespersonId: lead.ownerId || req.user.id,
            status: 'Open',
          },
        });
        dealId = deal.id;
      }

      // 4. Mark lead as Converted
      await tx.lead.update({
        where: { id: leadId },
        data: {
          status: 'Qualified',
          convertedAt: new Date(),
          convertedCustomerId: customerId,
          convertedContactId: contactId,
          convertedDealId: dealId,
        },
      });

      // 5. Migrate Lead Notes to Customer Notes
      const leadNotes = await tx.leadNote.findMany({ where: { leadId } });
      if (leadNotes.length > 0) {
        await tx.customerNote.createMany({
          data: leadNotes.map(n => ({
            customerId,
            userId: n.userId,
            note: `[Lead Note] ${n.note}`,
            createdAt: n.createdAt,
          })),
        });
      }

      // 6. Migrate Lead Activities to Customer Activities
      await tx.activity.updateMany({
        where: { relatedLeadId: leadId },
        data: { relatedCustomerId: customerId, relatedLeadId: null },
      });
    });

    await logAudit({
      userId: req.user.id,
      action: 'CONVERT_LEAD',
      module: 'LEADS',
      recordId: leadId,
      newValue: { customerId, contactId, dealId },
    });

    res.json({
      success: true,
      message: 'Lead converted successfully',
      data: { customerId, contactId, dealId },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listLeads,
  getLeadById,
  createLead,
  updateLead,
  deleteLead,
  addLeadNote,
  addLeadActivity,
  convertLead,
};

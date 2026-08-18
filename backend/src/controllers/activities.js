const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');
const { canModify, getRoleReadFilter } = require('../middleware/auth');

// List Activities with advanced queries
async function listActivities(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'assignedEmployeeId');
    const { type, status, priority, assignedEmployeeId, relatedLeadId, relatedCustomerId, relatedDealId, timelineFilter, search, page = 1, limit = 10 } = req.query;

    const where = {
      ...roleFilter,
    };

    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedEmployeeId) where.assignedEmployeeId = parseInt(assignedEmployeeId);
    if (relatedLeadId) where.relatedLeadId = parseInt(relatedLeadId);
    if (relatedCustomerId) where.relatedCustomerId = parseInt(relatedCustomerId);
    if (relatedDealId) where.relatedDealId = parseInt(relatedDealId);

    // Timeline filters (for dashboard widgets)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    if (timelineFilter === 'today') {
      where.dueDate = { gte: todayStart, lte: todayEnd };
    } else if (timelineFilter === 'upcoming') {
      where.dueDate = { gt: todayEnd };
      where.status = 'Pending';
    } else if (timelineFilter === 'overdue') {
      where.dueDate = { lt: todayStart };
      where.status = 'Pending';
    }

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { notes: { contains: search } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    const [activities, total] = await prisma.$transaction([
      prisma.activity.findMany({
        where,
        orderBy: { dueDate: 'asc' },
        skip,
        take,
        include: {
          lead: { select: { id: true, name: true, company: true } },
          customer: { select: { id: true, name: true, companyName: true } },
          deal: { select: { id: true, name: true } },
          assignedEmployee: { select: { id: true, name: true } },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      success: true,
      data: activities,
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

// Get single Activity
async function getActivityById(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const activity = await prisma.activity.findUnique({
      where: { id },
      include: {
        lead: { select: { id: true, name: true, company: true } },
        customer: { select: { id: true, name: true } },
        deal: { select: { id: true, name: true } },
        assignedEmployee: { select: { id: true, name: true } },
      },
    });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (req.user.role === 'Salesperson' && activity.assignedEmployeeId !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    res.json({ success: true, data: activity });
  } catch (err) {
    next(err);
  }
}

// Create Activity
async function createActivity(req, res, next) {
  try {
    const { title, type, relatedLeadId, relatedCustomerId, relatedDealId, assignedEmployeeId, dueDate, priority, notes, status } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const finalEmployeeId = req.user.role === 'Salesperson' ? req.user.id : (assignedEmployeeId ? parseInt(assignedEmployeeId) : req.user.id);

    const activity = await prisma.activity.create({
      data: {
        title,
        type,
        relatedLeadId: relatedLeadId ? parseInt(relatedLeadId) : null,
        relatedCustomerId: relatedCustomerId ? parseInt(relatedCustomerId) : null,
        relatedDealId: relatedDealId ? parseInt(relatedDealId) : null,
        assignedEmployeeId: finalEmployeeId,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status: status || 'Pending',
        notes,
      },
    });

    await logAudit({
      userId: req.user.id,
      action: 'CREATE_ACTIVITY',
      module: 'ACTIVITIES',
      recordId: activity.id,
      newValue: activity.title,
    });

    res.status(201).json({ success: true, message: 'Activity created successfully', data: activity });
  } catch (err) {
    next(err);
  }
}

// Update Activity
async function updateActivity(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const activity = await prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (!canModify(req, activity.assignedEmployeeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { title, type, relatedLeadId, relatedCustomerId, relatedDealId, assignedEmployeeId, dueDate, priority, notes, status } = req.body;

    const updated = await prisma.activity.update({
      where: { id },
      data: {
        title,
        type,
        relatedLeadId: relatedLeadId ? parseInt(relatedLeadId) : null,
        relatedCustomerId: relatedCustomerId ? parseInt(relatedCustomerId) : null,
        relatedDealId: relatedDealId ? parseInt(relatedDealId) : null,
        assignedEmployeeId: assignedEmployeeId ? parseInt(assignedEmployeeId) : null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority,
        status,
        notes,
      },
    });

    res.json({ success: true, message: 'Activity updated successfully', data: updated });
  } catch (err) {
    next(err);
  }
}

// Delete Activity
async function deleteActivity(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const activity = await prisma.activity.findUnique({ where: { id } });

    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (!canModify(req, activity.assignedEmployeeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    await prisma.activity.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// Complete / Quick Status update
async function updateActivityStatus(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      return res.status(404).json({ success: false, message: 'Activity not found' });
    }

    if (!canModify(req, activity.assignedEmployeeId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const updated = await prisma.activity.update({
      where: { id },
      data: { status },
    });

    res.json({ success: true, message: `Activity marked as ${status}`, data: updated });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listActivities,
  getActivityById,
  createActivity,
  updateActivity,
  deleteActivity,
  updateActivityStatus,
};

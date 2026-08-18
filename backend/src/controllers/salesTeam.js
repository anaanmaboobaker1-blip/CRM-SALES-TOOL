const prisma = require('../config/db');
const { authorizeRoles } = require('../middleware/auth');

// Get Salesperson list with performance summaries
async function listSalesTeam(req, res, next) {
  try {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1; // 1-indexed

    // Load all salespeople users (roleId = 3)
    const salespeople = await prisma.user.findMany({
      where: {
        roleId: 3, // Salesperson role
        deletedAt: null,
      },
      include: {
        employee: {
          include: { team: true },
        },
        salesTargets: {
          where: { year: currentYear, month: currentMonth },
        },
      },
    });

    const teamPerformance = [];

    for (const sp of salespeople) {
      // 1. Count assigned leads
      const leadsCount = await prisma.lead.count({
        where: { ownerId: sp.id, deletedAt: null },
      });

      // 2. Count won deals
      const wonDealsCount = await prisma.deal.count({
        where: { salespersonId: sp.id, status: 'Won', deletedAt: null },
      });

      // 3. Sum won deals values (sales achieved)
      const dealsWonAggregate = await prisma.deal.aggregate({
        _sum: { dealValue: true },
        where: { salespersonId: sp.id, status: 'Won', deletedAt: null },
      });
      const salesAchieved = dealsWonAggregate._sum.dealValue || 0;

      // 4. Retrieve targets
      const target = sp.salesTargets[0] ? sp.salesTargets[0].targetAmount : 0;
      const targetId = sp.salesTargets[0] ? sp.salesTargets[0].id : null;
      const targetPct = target > 0 ? (salesAchieved / target) * 100 : 0;

      teamPerformance.push({
        id: sp.id,
        name: sp.name,
        email: sp.email,
        phone: sp.employee ? sp.employee.phone : 'N/A',
        team: sp.employee && sp.employee.team ? sp.employee.team.name : 'Independent',
        leadsAssigned: leadsCount,
        dealsWon: wonDealsCount,
        salesAchieved,
        monthlyTarget: target,
        targetId,
        achievementPercentage: Math.min(100, targetPct),
      });
    }

    res.json({ success: true, data: teamPerformance });
  } catch (err) {
    next(err);
  }
}

// Get salesperson details & target achievements
async function getSalespersonPerformance(req, res, next) {
  try {
    const spId = parseInt(req.params.id);
    const sp = await prisma.user.findUnique({
      where: { id: spId },
      include: { role: true },
    });

    if (!sp || sp.roleId !== 3) {
      return res.status(404).json({ success: false, message: 'Salesperson not found' });
    }

    const currentYear = new Date().getFullYear();

    // Group deals by status
    const deals = await prisma.deal.findMany({
      where: { salespersonId: spId, deletedAt: null },
    });

    const openDealsValue = deals.filter(d => d.status === 'Open').reduce((sum, d) => sum + d.dealValue, 0);
    const wonDealsValue = deals.filter(d => d.status === 'Won').reduce((sum, d) => sum + d.dealValue, 0);
    const lostDealsValue = deals.filter(d => d.status === 'Lost').reduce((sum, d) => sum + d.dealValue, 0);

    // Group leads by status
    const leads = await prisma.lead.findMany({
      where: { ownerId: spId, deletedAt: null },
    });

    const leadConversionStats = {
      totalLeads: leads.length,
      converted: leads.filter(l => l.convertedAt !== null).length,
      new: leads.filter(l => l.status === 'New').length,
      contacted: leads.filter(l => l.status === 'Contacted').length,
      lost: leads.filter(l => l.status === 'Lost').length,
    };

    // Load monthly targets for current year
    const targets = await prisma.salesTarget.findMany({
      where: { salespersonId: spId, year: currentYear },
      orderBy: { month: 'asc' },
    });

    res.json({
      success: true,
      data: {
        id: sp.id,
        name: sp.name,
        email: sp.email,
        dealsCount: deals.length,
        dealValues: {
          open: openDealsValue,
          won: wonDealsValue,
          lost: lostDealsValue,
        },
        leads: leadConversionStats,
        targets,
      },
    });
  } catch (err) {
    next(err);
  }
}

// Assign/Set targets (Admins and Managers only)
async function setSalesTarget(req, res, next) {
  try {
    const { salespersonId, month, year, targetAmount } = req.body;

    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const salesperson = await prisma.user.findUnique({
      where: { id: parseInt(salespersonId) },
    });

    if (!salesperson || salesperson.roleId !== 3) {
      return res.status(400).json({ success: false, message: 'Invalid salesperson ID' });
    }

    // Check if target already exists for that month/year
    const existing = await prisma.salesTarget.findFirst({
      where: {
        salespersonId: parseInt(salespersonId),
        month: parseInt(month),
        year: parseInt(year),
      },
    });

    let target;
    if (existing) {
      target = await prisma.salesTarget.update({
        where: { id: existing.id },
        data: { targetAmount: parseFloat(targetAmount) },
      });
    } else {
      target = await prisma.salesTarget.create({
        data: {
          salespersonId: parseInt(salespersonId),
          month: parseInt(month),
          year: parseInt(year),
          targetAmount: parseFloat(targetAmount),
        },
      });
    }

    res.json({ success: true, message: 'Sales target configured successfully', data: target });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSalesTeam,
  getSalespersonPerformance,
  setSalesTarget,
};

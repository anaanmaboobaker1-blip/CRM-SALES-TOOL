const prisma = require('../config/db');
const { getRoleReadFilter } = require('../middleware/auth');

async function getDashboardStats(req, res, next) {
  try {
    const leadFilter = getRoleReadFilter(req, 'ownerId');
    const dealFilter = getRoleReadFilter(req, 'salespersonId');
    const customerFilter = getRoleReadFilter(req, 'assignedSalespersonId');
    const activityFilter = getRoleReadFilter(req, 'assignedEmployeeId');

    // 1. Total Leads
    const totalLeads = await prisma.lead.count({ where: { deletedAt: null, ...leadFilter } });

    // 2. Total Customers
    const totalCustomers = await prisma.customer.count({ where: { deletedAt: null, ...customerFilter } });

    // 3. Open Deals & Pipeline Value
    const openDealsCount = await prisma.deal.count({ where: { status: 'Open', deletedAt: null, ...dealFilter } });
    const openDealsAggregate = await prisma.deal.aggregate({
      _sum: { dealValue: true },
      where: { status: 'Open', deletedAt: null, ...dealFilter },
    });
    const pipelineValue = openDealsAggregate._sum.dealValue || 0;

    // 4. Won Sales
    const wonSalesAggregate = await prisma.deal.aggregate({
      _sum: { dealValue: true },
      where: { status: 'Won', deletedAt: null, ...dealFilter },
    });
    const wonSales = wonSalesAggregate._sum.dealValue || 0;

    // 5. Sales Targets (for salesperson or team)
    let salesTarget = 0;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    if (req.user.role === 'Salesperson') {
      const target = await prisma.salesTarget.findFirst({
        where: { salespersonId: req.user.id, year: currentYear, month: currentMonth },
      });
      salesTarget = target ? target.targetAmount : 0;
    } else {
      const targets = await prisma.salesTarget.aggregate({
        _sum: { targetAmount: true },
        where: { year: currentYear, month: currentMonth },
      });
      salesTarget = targets._sum.targetAmount || 0;
    }

    // 6. Upcoming Activities
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingActivities = await prisma.activity.count({
      where: {
        status: 'Pending',
        dueDate: { gte: today },
        ...activityFilter,
      },
    });

    // 7. Overdue Activities
    const overdueActivities = await prisma.activity.count({
      where: {
        status: 'Pending',
        dueDate: { lt: today },
        ...activityFilter,
      },
    });

    res.json({
      success: true,
      data: {
        totalLeads,
        totalCustomers,
        openDealsCount,
        pipelineValue,
        wonSales,
        salesTarget,
        upcomingActivities,
        overdueActivities,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getAnalyticsReports(req, res, next) {
  try {
    const leadFilter = getRoleReadFilter(req, 'ownerId');
    const dealFilter = getRoleReadFilter(req, 'salespersonId');
    const customerFilter = getRoleReadFilter(req, 'assignedSalespersonId');
    const activityFilter = getRoleReadFilter(req, 'assignedEmployeeId');

    // REPORT 1: Leads by status
    const leadsByStatusRaw = await prisma.lead.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...leadFilter },
      _count: { id: true },
    });
    const leadsByStatus = leadsByStatusRaw.map(g => ({ name: g.status, value: g._count.id }));

    // REPORT 2: Leads by source
    const leadsBySourceRaw = await prisma.lead.groupBy({
      by: ['source'],
      where: { deletedAt: null, ...leadFilter },
      _count: { id: true },
    });
    const leadsBySource = leadsBySourceRaw.map(g => ({ name: g.source, value: g._count.id }));

    // REPORT 3: Deals by stage
    const dealsByStageRaw = await prisma.deal.groupBy({
      by: ['dealStage'],
      where: { deletedAt: null, ...dealFilter },
      _count: { id: true },
      _sum: { dealValue: true },
    });
    const dealsByStage = dealsByStageRaw.map(g => ({
      stage: g.dealStage,
      count: g._count.id,
      value: g._sum.dealValue || 0,
    }));

    // REPORT 4: Won vs Lost
    const wonCount = await prisma.deal.count({ where: { status: 'Won', deletedAt: null, ...dealFilter } });
    const lostCount = await prisma.deal.count({ where: { status: 'Lost', deletedAt: null, ...dealFilter } });
    const openCount = await prisma.deal.count({ where: { status: 'Open', deletedAt: null, ...dealFilter } });
    const wonVsLost = [
      { name: 'Won', value: wonCount },
      { name: 'Lost', value: lostCount },
      { name: 'Open', value: openCount },
    ];

    // REPORT 5: Leaderboard (Sales achieved per salesperson)
    // Query users with role 3 (Salespersons)
    const salespeople = await prisma.user.findMany({
      where: { roleId: 3, deletedAt: null },
      select: { id: true, name: true },
    });

    const leaderboard = [];
    for (const sp of salespeople) {
      // If user is salesperson and requesting other salesperson data, skip unless admin/manager
      if (req.user.role === 'Salesperson' && sp.id !== req.user.id) {
        continue;
      }
      const agg = await prisma.deal.aggregate({
        _sum: { dealValue: true },
        where: { salespersonId: sp.id, status: 'Won', deletedAt: null },
      });
      leaderboard.push({
        name: sp.name,
        value: agg._sum.dealValue || 0,
      });
    }
    // Sort descending
    leaderboard.sort((a, b) => b.value - a.value);

    // REPORT 6: Sales performance over time (Monthly sales in the current year)
    const currentYear = new Date().getFullYear();
    const monthlySales = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // For SQLite, group-by date is tricky, so we run a loop for months to get aggregate sales
    for (let m = 1; m <= 12; m++) {
      const startDate = new Date(currentYear, m - 1, 1);
      const endDate = new Date(currentYear, m, 0, 23, 59, 59, 999);

      const agg = await prisma.deal.aggregate({
        _sum: { dealValue: true },
        where: {
          status: 'Won',
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
          ...dealFilter,
        },
      });

      monthlySales.push({
        month: months[m - 1],
        sales: agg._sum.dealValue || 0,
      });
    }

    // REPORT 7: Quotation Statuses
    const qRaw = await prisma.quotation.groupBy({
      by: ['status'],
      where: { deletedAt: null, ...dealFilter },
      _count: { id: true },
    });
    const quotationsReport = qRaw.map(g => ({ name: g.status, value: g._count.id }));

    // REPORT 8: Sales Order Statuses
    // Customer owner filter is salesperson
    const orderWhere = { deletedAt: null };
    if (req.user.role === 'Salesperson') {
      orderWhere.customer = { assignedSalespersonId: req.user.id };
    }
    const soRaw = await prisma.salesOrder.groupBy({
      by: ['status'],
      where: orderWhere,
      _count: { id: true },
    });
    const salesOrdersReport = soRaw.map(g => ({ name: g.status, value: g._count.id }));

    // REPORT 9: Lost Reason Analysis
    const lostReasons = await prisma.deal.findMany({
      where: { status: 'Lost', lostReason: { not: null }, deletedAt: null, ...dealFilter },
      select: { lostReason: true },
    });
    const reasonsMap = {};
    lostReasons.forEach(d => {
      const r = d.lostReason || 'Unspecified';
      reasonsMap[r] = (reasonsMap[r] || 0) + 1;
    });
    const lostReasonsReport = Object.keys(reasonsMap).map(k => ({ name: k, value: reasonsMap[k] }));

    res.json({
      success: true,
      data: {
        leadsByStatus,
        leadsBySource,
        dealsByStage,
        wonVsLost,
        leaderboard,
        monthlySales,
        quotationsReport,
        salesOrdersReport,
        lostReasonsReport,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAnalyticsReports,
};

const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/dashboard/stats
router.get('/stats', (req, res) => {
  const today = new Date().toISOString().split('T')[0];

  const totalLeads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE converted=0 AND status NOT IN ('Lost')").get().c;
  const totalCustomers = db.prepare('SELECT COUNT(*) as c FROM customers WHERE is_active=1').get().c;
  const openDeals = db.prepare("SELECT COUNT(*) as c FROM deals WHERE stage NOT IN ('Won','Lost')").get().c;
  const pipelineValue = db.prepare("SELECT COALESCE(SUM(value),0) as t FROM deals WHERE stage NOT IN ('Won','Lost')").get().t;
  const wonSales = db.prepare("SELECT COALESCE(SUM(value),0) as t FROM deals WHERE stage='Won'").get().t;
  const pendingFollowups = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='Pending'").get().c;
  const overdueFollowups = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='Pending' AND date < ?").get(today).c;
  const totalQuotations = db.prepare("SELECT COUNT(*) as c FROM quotations").get().c;
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM sales_orders").get().c;

  // Sales target: sum of all salesperson targets vs won sales
  const totalTarget = db.prepare("SELECT COALESCE(SUM(target_value),0) as t FROM users WHERE role IN ('salesperson','manager')").get().t || 1;
  const salesTargetPct = Math.min(100, Math.round((wonSales / totalTarget) * 100));

  // Monthly revenue chart (6 months)
  const revenueData = [
    { month: 'Mar', revenue: 380000, deals: 3 },
    { month: 'Apr', revenue: 520000, deals: 4 },
    { month: 'May', revenue: 310000, deals: 2 },
    { month: 'Jun', revenue: 680000, deals: 5 },
    { month: 'Jul', revenue: 450000, deals: 4 },
    { month: 'Aug', revenue: wonSales, deals: 1 },
  ];

  // Stage distribution for pipeline chart
  const stageData = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total
    FROM deals GROUP BY stage ORDER BY total DESC
  `).all();

  // Lead source distribution
  const leadSources = db.prepare(`
    SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC
  `).all();

  // Lead status distribution
  const leadStatus = db.prepare(`
    SELECT status, COUNT(*) as count FROM leads GROUP BY status
  `).all();

  // Upcoming follow-ups (next 7 days)
  const upcomingFollowups = db.prepare(`
    SELECT * FROM followups 
    WHERE status='Pending' AND date >= ?
    ORDER BY date ASC, time ASC LIMIT 8
  `).all(today);

  // Top salesperson performance
  const salesPerf = db.prepare(`
    SELECT owner_name, COUNT(*) as deals, COALESCE(SUM(value),0) as total_value
    FROM deals WHERE stage='Won' AND owner_name IS NOT NULL
    GROUP BY owner_name ORDER BY total_value DESC LIMIT 5
  `).all();

  // Recent leads
  const recentLeads = db.prepare(`SELECT * FROM leads ORDER BY created_at DESC LIMIT 5`).all();

  res.json({
    kpis: { totalLeads, totalCustomers, openDeals, pipelineValue, wonSales, salesTargetPct, pendingFollowups, overdueFollowups, totalQuotations, totalOrders },
    charts: { revenueData, stageData, leadSources, leadStatus },
    upcomingFollowups,
    salesPerf,
    recentLeads,
  });
});

module.exports = router;

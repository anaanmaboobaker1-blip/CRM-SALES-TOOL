const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/reports/sales — Overall sales report
router.get('/sales', (req, res) => {
  const won = db.prepare("SELECT COUNT(*) as deals, COALESCE(SUM(value),0) as revenue FROM deals WHERE stage='Won'").get();
  const lost = db.prepare("SELECT COUNT(*) as deals, COALESCE(SUM(value),0) as revenue FROM deals WHERE stage='Lost'").get();
  const open = db.prepare("SELECT COUNT(*) as deals, COALESCE(SUM(value),0) as pipeline FROM deals WHERE stage NOT IN ('Won','Lost')").get();
  const byStage = db.prepare("SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total FROM deals GROUP BY stage ORDER BY total DESC").all();
  const monthly = db.prepare(`SELECT strftime('%Y-%m',created_at) as month, COUNT(*) as count, COALESCE(SUM(value),0) as revenue FROM deals WHERE stage='Won' GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  res.json({ won, lost, open, byStage, monthly });
});

// GET /api/reports/leads — Lead report
router.get('/leads', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM leads GROUP BY status').all();
  const bySource = db.prepare('SELECT source, COUNT(*) as count FROM leads GROUP BY source ORDER BY count DESC').all();
  const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM leads GROUP BY priority').all();
  const converted = db.prepare("SELECT COUNT(*) as c FROM leads WHERE converted=1").get().c;
  const conversionRate = total ? Math.round((converted/total)*100) : 0;
  const monthly = db.prepare(`SELECT strftime('%Y-%m',created_at) as month, COUNT(*) as count FROM leads GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  res.json({ total, byStatus, bySource, byPriority, converted, conversionRate, monthly });
});

// GET /api/reports/pipeline — Pipeline report
router.get('/pipeline', (req, res) => {
  const stages = db.prepare("SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total, COALESCE(SUM(value*probability/100),0) as weighted FROM deals WHERE stage NOT IN ('Won','Lost') GROUP BY stage ORDER BY total DESC").all();
  const totalPipeline = stages.reduce((sum, s) => sum + s.total, 0);
  const weightedForecast = stages.reduce((sum, s) => sum + s.weighted, 0);
  const byOwner = db.prepare("SELECT owner_name, COUNT(*) as count, COALESCE(SUM(value),0) as total FROM deals WHERE stage NOT IN ('Won','Lost') AND owner_name IS NOT NULL GROUP BY owner_name ORDER BY total DESC").all();
  res.json({ stages, totalPipeline, weightedForecast, byOwner });
});

// GET /api/reports/won-lost — Won/Loss report
router.get('/won-lost', (req, res) => {
  const won = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as t FROM deals WHERE stage='Won'").get();
  const lost = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as t FROM deals WHERE stage='Lost'").get();
  const lostReasons = db.prepare("SELECT lost_reason, COUNT(*) as count FROM deals WHERE stage='Lost' AND lost_reason IS NOT NULL GROUP BY lost_reason ORDER BY count DESC").all();
  const winRate = (won.c + lost.c) ? Math.round((won.c / (won.c + lost.c)) * 100) : 0;
  res.json({ won, lost, lostReasons, winRate });
});

// GET /api/reports/salesperson — Salesperson performance report
router.get('/salesperson', (req, res) => {
  const perf = db.prepare(`
    SELECT owner_name as name,
    COUNT(*) as total_deals,
    SUM(CASE WHEN stage='Won' THEN 1 ELSE 0 END) as won,
    SUM(CASE WHEN stage='Lost' THEN 1 ELSE 0 END) as lost,
    SUM(CASE WHEN stage NOT IN ('Won','Lost') THEN 1 ELSE 0 END) as open,
    COALESCE(SUM(CASE WHEN stage='Won' THEN value ELSE 0 END),0) as revenue
    FROM deals WHERE owner_name IS NOT NULL GROUP BY owner_name ORDER BY revenue DESC
  `).all();
  perf.forEach(p => {
    const u = db.prepare("SELECT target_value FROM users WHERE name=?").get(p.name);
    p.target = u?.target_value || 0;
    p.target_pct = p.target ? Math.round((p.revenue/p.target)*100) : 0;
    p.win_rate = (p.won+p.lost) ? Math.round((p.won/(p.won+p.lost))*100) : 0;
    p.leads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE assigned_to=?").get(p.name)?.c || 0;
  });
  res.json(perf);
});

// GET /api/reports/quotations — Quotation report
router.get('/quotations', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM quotations').get().c;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(grand_total),0) as total FROM quotations GROUP BY status').all();
  const converted = db.prepare('SELECT COUNT(*) as c FROM quotations WHERE converted_to_order=1').get().c;
  const totalValue = db.prepare('SELECT COALESCE(SUM(grand_total),0) as t FROM quotations').get().t;
  res.json({ total, byStatus, converted, totalValue, conversionRate: total ? Math.round((converted/total)*100) : 0 });
});

// GET /api/reports/orders — Sales order report
router.get('/orders', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM sales_orders').get().c;
  const byStatus = db.prepare('SELECT status, COUNT(*) as count, COALESCE(SUM(grand_total),0) as total FROM sales_orders GROUP BY status').all();
  const totalRevenue = db.prepare("SELECT COALESCE(SUM(grand_total),0) as t FROM sales_orders WHERE status IN ('Confirmed','Fulfilled')").get().t;
  res.json({ total, byStatus, totalRevenue });
});

// GET /api/reports/customers — Customer report
router.get('/customers', (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM customers WHERE is_active=1').get().c;
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM customers GROUP BY type').all();
  const byGroup = db.prepare('SELECT customer_group, COUNT(*) as count FROM customers GROUP BY customer_group ORDER BY count DESC').all();
  const byCity = db.prepare('SELECT billing_city as city, COUNT(*) as count FROM customers WHERE billing_city!='' GROUP BY billing_city ORDER BY count DESC LIMIT 10').all();
  const monthly = db.prepare(`SELECT strftime('%Y-%m',created_at) as month, COUNT(*) as count FROM customers GROUP BY month ORDER BY month DESC LIMIT 12`).all();
  res.json({ total, byType, byGroup, byCity, monthly });
});

// GET /api/reports/followups — Follow-up report
router.get('/followups', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  const total = db.prepare('SELECT COUNT(*) as c FROM followups').get().c;
  const pending = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='Pending'").get().c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='Completed'").get().c;
  const overdue = db.prepare("SELECT COUNT(*) as c FROM followups WHERE status='Pending' AND date<?").get(today).c;
  const byType = db.prepare('SELECT type, COUNT(*) as count FROM followups GROUP BY type').all();
  const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM followups GROUP BY priority').all();
  res.json({ total, pending, completed, overdue, byType, byPriority });
});

// GET /api/reports/conversion — Lead conversion report
router.get('/conversion', (req, res) => {
  const totalLeads = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
  const convertedLeads = db.prepare('SELECT COUNT(*) as c FROM leads WHERE converted=1').get().c;
  const bySource = db.prepare("SELECT source, COUNT(*) as total, SUM(CASE WHEN converted=1 THEN 1 ELSE 0 END) as converted FROM leads GROUP BY source ORDER BY total DESC").all();
  bySource.forEach(s => { s.rate = s.total ? Math.round((s.converted/s.total)*100) : 0; });
  res.json({ totalLeads, convertedLeads, conversionRate: totalLeads ? Math.round((convertedLeads/totalLeads)*100) : 0, bySource });
});

// GET /api/reports/global-search
router.get('/search', (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ results: [] });
  const s = `%${q}%`;
  const results = [];

  db.prepare("SELECT id,'Lead' as type, name, company as subtitle, status as badge FROM leads WHERE name LIKE ? OR company LIKE ? OR email LIKE ? LIMIT 5").all(s,s,s).forEach(r => results.push(r));
  db.prepare("SELECT id,'Customer' as type, name, company as subtitle, billing_city as badge FROM customers WHERE is_active=1 AND (name LIKE ? OR company LIKE ? OR email LIKE ?) LIMIT 5").all(s,s,s).forEach(r => results.push(r));
  db.prepare("SELECT id,'Deal' as type, title as name, customer_name as subtitle, stage as badge FROM deals WHERE title LIKE ? OR customer_name LIKE ? LIMIT 5").all(s,s).forEach(r => results.push(r));
  db.prepare("SELECT id,'Quotation' as type, quot_number as name, customer_name as subtitle, status as badge FROM quotations WHERE quot_number LIKE ? OR customer_name LIKE ? LIMIT 5").all(s,s).forEach(r => results.push(r));
  db.prepare("SELECT id,'Order' as type, order_number as name, customer_name as subtitle, status as badge FROM sales_orders WHERE order_number LIKE ? OR customer_name LIKE ? LIMIT 5").all(s,s).forEach(r => results.push(r));

  res.json({ results });
});

module.exports = router;

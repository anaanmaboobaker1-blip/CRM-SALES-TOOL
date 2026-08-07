const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/team/users — All salespeople
router.get('/users', (req, res) => {
  const users = db.prepare('SELECT id,name,email,role,phone,target_value,team_id,is_active FROM users WHERE is_active=1 ORDER BY name').all();
  // Attach performance stats
  users.forEach(u => {
    u.deals_won = db.prepare("SELECT COUNT(*) as c FROM deals WHERE owner_name=? AND stage='Won'").get(u.name)?.c || 0;
    u.revenue = db.prepare("SELECT COALESCE(SUM(value),0) as t FROM deals WHERE owner_name=? AND stage='Won'").get(u.name)?.t || 0;
    u.open_deals = db.prepare("SELECT COUNT(*) as c FROM deals WHERE owner_name=? AND stage NOT IN ('Won','Lost')").get(u.name)?.c || 0;
    u.leads_assigned = db.prepare("SELECT COUNT(*) as c FROM leads WHERE assigned_to=?").get(u.name)?.c || 0;
  });
  res.json(users);
});

// GET /api/team/users/:id
router.get('/users/:id', (req, res) => {
  const user = db.prepare('SELECT id,name,email,role,phone,target_value,team_id,is_active FROM users WHERE id=?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

// POST /api/team/users
router.post('/users', (req, res) => {
  const bcrypt = require('bcryptjs');
  const { name,email,password,role,phone,target_value,team_id } = req.body;
  if (!name||!email||!password) return res.status(400).json({ error: 'Name, email, password required.' });
  if (db.prepare('SELECT id FROM users WHERE email=?').get(email)) return res.status(409).json({ error: 'Email already exists.' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare('INSERT INTO users (name,email,password_hash,role,phone,target_value,team_id) VALUES (?,?,?,?,?,?,?)').run(name,email,hash,role||'salesperson',phone||'',target_value||0,team_id||null);
  res.status(201).json(db.prepare('SELECT id,name,email,role,phone,target_value,team_id FROM users WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/team/users/:id
router.put('/users/:id', (req, res) => {
  const { name,role,phone,target_value,team_id,is_active } = req.body;
  db.prepare('UPDATE users SET name=?,role=?,phone=?,target_value=?,team_id=?,is_active=? WHERE id=?').run(name,role,phone||'',target_value||0,team_id||null,is_active===false?0:1,req.params.id);
  res.json(db.prepare('SELECT id,name,email,role,phone,target_value,team_id,is_active FROM users WHERE id=?').get(req.params.id));
});

// GET /api/team/performance — Sales performance report
router.get('/performance', (req, res) => {
  const users = db.prepare('SELECT id,name,role,target_value FROM users WHERE role IN (?,?) AND is_active=1').all('salesperson','manager');
  const perf = users.map(u => {
    const won = db.prepare("SELECT COUNT(*) as c, COALESCE(SUM(value),0) as revenue FROM deals WHERE owner_name=? AND stage='Won'").get(u.name);
    const open = db.prepare("SELECT COUNT(*) as c FROM deals WHERE owner_name=? AND stage NOT IN ('Won','Lost')").get(u.name);
    const leads = db.prepare("SELECT COUNT(*) as c FROM leads WHERE assigned_to=?").get(u.name);
    return {
      ...u,
      deals_won: won.c, revenue: won.revenue, open_deals: open.c, leads: leads.c,
      target_pct: u.target_value ? Math.round((won.revenue / u.target_value) * 100) : 0,
    };
  });
  res.json(perf);
});

// GET /api/team/teams
router.get('/teams', (req, res) => {
  const teams = db.prepare('SELECT * FROM sales_teams').all();
  teams.forEach(t => {
    t.members = db.prepare('SELECT id,name,email,role FROM users WHERE team_id=?').all(t.id);
  });
  res.json(teams);
});

// POST /api/team/teams
router.post('/teams', (req, res) => {
  const { name, manager_id, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Team name required.' });
  const result = db.prepare('INSERT INTO sales_teams (name,manager_id,description) VALUES (?,?,?)').run(name,manager_id||null,description||'');
  res.status(201).json(db.prepare('SELECT * FROM sales_teams WHERE id=?').get(result.lastInsertRowid));
});

module.exports = router;

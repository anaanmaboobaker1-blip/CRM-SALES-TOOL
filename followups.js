const express = require('express');
const router = express.Router();
const db = require('../database');

const today = () => new Date().toISOString().split('T')[0];

// GET /api/followups
router.get('/', (req, res) => {
  const { status, priority, type, assigned_to, overdue, page=1, limit=20 } = req.query;
  let query = 'SELECT * FROM followups WHERE 1=1';
  const params = [];

  if (status && status !== 'All') { query += ' AND status=?'; params.push(status); }
  if (priority && priority !== 'All') { query += ' AND priority=?'; params.push(priority); }
  if (type && type !== 'All') { query += ' AND type=?'; params.push(type); }
  if (assigned_to && assigned_to !== 'All') { query += ' AND assigned_to=?'; params.push(assigned_to); }
  if (overdue === 'true') { query += ' AND status=? AND date<?'; params.push('Pending', today()); }

  const total = db.prepare(query.replace('SELECT *','SELECT COUNT(*) as c')).get(...params)?.c || 0;
  const offset = (parseInt(page)-1)*parseInt(limit);
  query += ` ORDER BY date ASC, time ASC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  res.json({ followups: db.prepare(query).all(...params), total });
});

// GET /api/followups/:id
router.get('/:id', (req, res) => {
  const item = db.prepare('SELECT * FROM followups WHERE id=?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json(item);
});

// POST /api/followups
router.post('/', (req, res) => {
  const { type,customer_name,customer_id,lead_id,deal_id,task,date,time,status,priority,assigned_to,notes } = req.body;
  if (!customer_name||!task||!date) return res.status(400).json({ error: 'Customer, task, date required.' });

  const result = db.prepare(`INSERT INTO followups (type,customer_name,customer_id,lead_id,deal_id,task,date,time,status,priority,assigned_to,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(type||'Call',customer_name,customer_id||null,lead_id||null,deal_id||null,task,date,time||'10:00',status||'Pending',priority||'Normal',assigned_to||'',notes||'');
  res.status(201).json(db.prepare('SELECT * FROM followups WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/followups/:id
router.put('/:id', (req, res) => {
  const { type,customer_name,customer_id,lead_id,deal_id,task,date,time,status,priority,assigned_to,notes } = req.body;
  if (!db.prepare('SELECT id FROM followups WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });

  const completedAt = status === 'Completed' ? new Date().toISOString() : null;
  db.prepare(`UPDATE followups SET type=?,customer_name=?,customer_id=?,lead_id=?,deal_id=?,task=?,date=?,time=?,status=?,priority=?,assigned_to=?,notes=?,completed_at=? WHERE id=?`)
    .run(type,customer_name,customer_id||null,lead_id||null,deal_id||null,task,date,time,status,priority,assigned_to,notes,completedAt,req.params.id);
  res.json(db.prepare('SELECT * FROM followups WHERE id=?').get(req.params.id));
});

// DELETE /api/followups/:id
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM followups WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM followups WHERE id=?').run(req.params.id);
  res.json({ message: 'Follow-up deleted.' });
});

// GET /api/followups/activity/history — activity history for entity
router.get('/activity/history', (req, res) => {
  const { customer_name, limit=20 } = req.query;
  const items = db.prepare('SELECT * FROM followups WHERE customer_name LIKE ? ORDER BY date DESC LIMIT ?').all(`%${customer_name}%`, parseInt(limit));
  res.json(items);
});

module.exports = router;

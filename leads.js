const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/leads
router.get('/', (req, res) => {
  const { status, source, priority, assigned_to, search, page = 1, limit = 20, sort = 'created_at', order = 'DESC' } = req.query;
  let query = 'SELECT * FROM leads WHERE 1=1';
  const params = [];

  if (status && status !== 'All') { query += ' AND status=?'; params.push(status); }
  if (source && source !== 'All') { query += ' AND source=?'; params.push(source); }
  if (priority && priority !== 'All') { query += ' AND priority=?'; params.push(priority); }
  if (assigned_to && assigned_to !== 'All') { query += ' AND assigned_to=?'; params.push(assigned_to); }
  if (search) { query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ?)'; const s = `%${search}%`; params.push(s,s,s,s); }

  const validSorts = ['name','company','status','priority','value','created_at'];
  const sortCol = validSorts.includes(sort) ? sort : 'created_at';
  const sortOrder = order === 'ASC' ? 'ASC' : 'DESC';
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const total = db.prepare(`SELECT COUNT(*) as c FROM leads WHERE 1=1${query.slice(query.indexOf(' AND '))}`).get(...params)?.c || 
                db.prepare(query.replace('SELECT *', 'SELECT COUNT(*) as c')).get(...params)?.c || 0;

  query += ` ORDER BY ${sortCol} ${sortOrder} LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const leads = db.prepare(query).all(...params);
  res.json({ leads, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/leads/:id
router.get('/:id', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });
  res.json(lead);
});

// POST /api/leads
router.post('/', (req, res) => {
  const { name, company, email, phone, status, source, priority, value, notes, assigned_to, next_followup_date, next_followup_note } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  // Duplicate detection
  if (email) {
    const dup = db.prepare('SELECT id FROM leads WHERE email=?').get(email);
    if (dup) return res.status(409).json({ error: 'A lead with this email already exists.', duplicate_id: dup.id });
  }

  const result = db.prepare(`
    INSERT INTO leads (name,company,email,phone,status,source,priority,value,notes,assigned_to,next_followup_date,next_followup_note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(name, company||'', email||'', phone||'', status||'New', source||'Website', priority||'Normal', value||0, notes||'', assigned_to||'', next_followup_date||'', next_followup_note||'');

  res.status(201).json(db.prepare('SELECT * FROM leads WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/leads/:id
router.put('/:id', (req, res) => {
  const { name,company,email,phone,status,source,priority,value,notes,assigned_to,next_followup_date,next_followup_note } = req.body;
  if (!db.prepare('SELECT id FROM leads WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE leads SET name=?,company=?,email=?,phone=?,status=?,source=?,priority=?,value=?,notes=?,assigned_to=?,next_followup_date=?,next_followup_note=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name,company,email,phone,status,source,priority,value,notes,assigned_to,next_followup_date||'',next_followup_note||'',req.params.id);
  res.json(db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id));
});

// DELETE /api/leads/:id
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM leads WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  res.json({ message: 'Lead deleted.' });
});

// POST /api/leads/bulk-update — Bulk status update
router.post('/bulk-update', (req, res) => {
  const { ids, status, assigned_to } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ error: 'No IDs provided' });
  const placeholders = ids.map(() => '?').join(',');
  if (status) db.prepare(`UPDATE leads SET status=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(status, ...ids);
  if (assigned_to) db.prepare(`UPDATE leads SET assigned_to=?,updated_at=CURRENT_TIMESTAMP WHERE id IN (${placeholders})`).run(assigned_to, ...ids);
  res.json({ message: `${ids.length} leads updated.` });
});

// POST /api/leads/:id/convert — Convert lead to customer + deal
router.post('/:id/convert', (req, res) => {
  const lead = db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!lead) return res.status(404).json({ error: 'Lead not found' });

  // Create customer
  const custResult = db.prepare(`INSERT INTO customers (name,company,email,phone,notes) VALUES (?,?,?,?,?)`).run(lead.name, lead.company||'', lead.email||'', lead.phone||'', `Converted from lead on ${new Date().toISOString().split('T')[0]}`);
  const customerId = custResult.lastInsertRowid;

  // Create deal
  const dealResult = db.prepare(`INSERT INTO deals (title,customer_name,value,stage,owner_name,notes) VALUES (?,?,?,?,?,?)`).run(`Deal with ${lead.company || lead.name}`, lead.company||lead.name, lead.value||0, 'Qualification', lead.assigned_to||'', lead.notes||'');
  const dealId = dealResult.lastInsertRowid;

  // Mark lead as converted
  db.prepare(`UPDATE leads SET converted=1,status='Won',converted_customer_id=?,converted_deal_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(customerId, dealId, lead.id);

  res.json({ message: 'Lead converted.', customer_id: customerId, deal_id: dealId });
});

// GET /api/leads/export/csv
router.get('/export/csv', (req, res) => {
  const leads = db.prepare('SELECT * FROM leads ORDER BY created_at DESC').all();
  const csv = stringify(leads, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=leads.csv');
  res.send(csv);
});

// POST /api/leads/import/csv
router.post('/import/csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    let imported = 0, skipped = 0;
    const ins = db.prepare(`INSERT OR IGNORE INTO leads (name,company,email,phone,status,source,priority,value,notes,assigned_to) VALUES (?,?,?,?,?,?,?,?,?,?)`);
    records.forEach(r => {
      if (!r.name) { skipped++; return; }
      ins.run(r.name, r.company||'', r.email||'', r.phone||'', r.status||'New', r.source||'Website', r.priority||'Normal', parseFloat(r.value)||0, r.notes||'', r.assigned_to||'');
      imported++;
    });
    res.json({ message: `Imported ${imported} leads. Skipped ${skipped}.` });
  } catch (e) {
    res.status(400).json({ error: 'Invalid CSV format.' });
  }
});

module.exports = router;

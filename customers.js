const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');
const upload = multer({ storage: multer.memoryStorage() });

// GET /api/customers
router.get('/', (req, res) => {
  const { search, type, customer_group, page = 1, limit = 20 } = req.query;
  let query = 'SELECT * FROM customers WHERE is_active=1';
  const params = [];

  if (search) { query += ' AND (name LIKE ? OR company LIKE ? OR email LIKE ? OR phone LIKE ? OR billing_city LIKE ?)'; const s=`%${search}%`; params.push(s,s,s,s,s); }
  if (type && type !== 'All') { query += ' AND type=?'; params.push(type); }
  if (customer_group && customer_group !== 'All') { query += ' AND customer_group=?'; params.push(customer_group); }

  const offset = (parseInt(page)-1)*parseInt(limit);
  const countQ = query.replace('SELECT *', 'SELECT COUNT(*) as c');
  const total = db.prepare(countQ).get(...params)?.c || 0;

  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const customers = db.prepare(query).all(...params);
  // Attach primary contact
  customers.forEach(c => {
    const pc = db.prepare('SELECT * FROM contacts WHERE customer_id=? AND is_primary=1 LIMIT 1').get(c.id);
    c.primary_contact = pc || null;
  });
  res.json({ customers, total, page: parseInt(page), limit: parseInt(limit) });
});

// GET /api/customers/:id — full profile with contacts, deals, followups
router.get('/:id', (req, res) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Not found' });

  const contacts = db.prepare('SELECT * FROM contacts WHERE customer_id=? ORDER BY is_primary DESC').all(req.params.id);
  const deals = db.prepare('SELECT * FROM deals WHERE customer_name=? OR customer_id=? ORDER BY created_at DESC').all(customer.company || customer.name, req.params.id);
  const followups = db.prepare('SELECT * FROM followups WHERE customer_id=? OR customer_name LIKE ? ORDER BY date DESC LIMIT 10').all(req.params.id, `%${customer.company || customer.name}%`);
  const quotations = db.prepare('SELECT * FROM quotations WHERE customer_id=? OR customer_name=? ORDER BY created_at DESC LIMIT 5').all(req.params.id, customer.company || customer.name);
  const orders = db.prepare('SELECT * FROM sales_orders WHERE customer_id=? OR customer_name=? ORDER BY created_at DESC LIMIT 5').all(req.params.id, customer.company || customer.name);

  res.json({ ...customer, contacts, deals, followups, quotations, orders });
});

// POST /api/customers
router.post('/', (req, res) => {
  const { name,type,company,email,phone,billing_address,billing_city,billing_state,billing_pincode,shipping_address,shipping_city,shipping_state,shipping_pincode,gstin,pan,customer_group,tags,notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required.' });

  const result = db.prepare(`INSERT INTO customers (name,type,company,email,phone,billing_address,billing_city,billing_state,billing_pincode,shipping_address,shipping_city,shipping_state,shipping_pincode,gstin,pan,customer_group,tags,notes)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(name,type||'Business',company||'',email||'',phone||'',billing_address||'',billing_city||'',billing_state||'',billing_pincode||'',shipping_address||'',shipping_city||'',shipping_state||'',shipping_pincode||'',gstin||'',pan||'',customer_group||'General',tags||'',notes||'');
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/customers/:id
router.put('/:id', (req, res) => {
  const { name,type,company,email,phone,billing_address,billing_city,billing_state,billing_pincode,shipping_address,shipping_city,shipping_state,shipping_pincode,gstin,pan,customer_group,tags,notes } = req.body;
  if (!db.prepare('SELECT id FROM customers WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare(`UPDATE customers SET name=?,type=?,company=?,email=?,phone=?,billing_address=?,billing_city=?,billing_state=?,billing_pincode=?,shipping_address=?,shipping_city=?,shipping_state=?,shipping_pincode=?,gstin=?,pan=?,customer_group=?,tags=?,notes=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(name,type,company,email,phone,billing_address,billing_city,billing_state,billing_pincode,shipping_address,shipping_city,shipping_state,shipping_pincode,gstin,pan,customer_group,tags,notes,req.params.id);
  res.json(db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id));
});

// DELETE /api/customers/:id
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM customers WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE customers SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Customer archived.' });
});

// Contacts sub-routes
router.get('/:id/contacts', (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts WHERE customer_id=? ORDER BY is_primary DESC').all(req.params.id));
});

router.post('/:id/contacts', (req, res) => {
  const { name,designation,email,phone,is_primary,notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Contact name required' });
  if (is_primary) db.prepare('UPDATE contacts SET is_primary=0 WHERE customer_id=?').run(req.params.id);
  const result = db.prepare('INSERT INTO contacts (customer_id,name,designation,email,phone,is_primary,notes) VALUES (?,?,?,?,?,?,?)').run(req.params.id,name,designation||'',email||'',phone||'',is_primary?1:0,notes||'');
  res.status(201).json(db.prepare('SELECT * FROM contacts WHERE id=?').get(result.lastInsertRowid));
});

router.put('/:id/contacts/:contactId', (req, res) => {
  const { name,designation,email,phone,is_primary,notes } = req.body;
  if (is_primary) db.prepare('UPDATE contacts SET is_primary=0 WHERE customer_id=?').run(req.params.id);
  db.prepare('UPDATE contacts SET name=?,designation=?,email=?,phone=?,is_primary=?,notes=? WHERE id=?').run(name,designation,email,phone,is_primary?1:0,notes,req.params.contactId);
  res.json(db.prepare('SELECT * FROM contacts WHERE id=?').get(req.params.contactId));
});

router.delete('/:id/contacts/:contactId', (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id=?').run(req.params.contactId);
  res.json({ message: 'Contact deleted.' });
});

// GET /api/customers/export/csv
router.get('/export/csv', (req, res) => {
  const customers = db.prepare('SELECT * FROM customers WHERE is_active=1 ORDER BY created_at DESC').all();
  const csv = stringify(customers, { header: true });
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename=customers.csv');
  res.send(csv);
});

// POST /api/customers/import/csv
router.post('/import/csv', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const records = parse(req.file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    let imported = 0;
    const ins = db.prepare('INSERT INTO customers (name,company,email,phone,billing_city,gstin,customer_group) VALUES (?,?,?,?,?,?,?)');
    records.forEach(r => {
      if (!r.name) return;
      ins.run(r.name,r.company||'',r.email||'',r.phone||'',r.city||r.billing_city||'',r.gstin||'',r.customer_group||'General');
      imported++;
    });
    res.json({ message: `Imported ${imported} customers.` });
  } catch (e) {
    res.status(400).json({ error: 'Invalid CSV format.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database');

function getNextQuotNumber() {
  const year = new Date().getFullYear();
  const last = db.prepare("SELECT quot_number FROM quotations WHERE quot_number LIKE ? ORDER BY id DESC LIMIT 1").get(`QT-${year}-%`);
  if (!last) return `QT-${year}-001`;
  const num = parseInt(last.quot_number.split('-')[2]) + 1;
  return `QT-${year}-${String(num).padStart(3, '0')}`;
}

function calcTotals(items) {
  let subtotal = 0, taxAmount = 0;
  items.forEach(item => {
    const lineAmt = (item.quantity || 1) * (item.price || 0) * (1 - (item.discount || 0) / 100);
    const tax = lineAmt * (item.tax_rate || 18) / 100;
    item.amount = lineAmt;
    subtotal += lineAmt;
    taxAmount += tax;
  });
  return { subtotal, taxAmount, grandTotal: subtotal + taxAmount };
}

// GET /api/quotations
router.get('/', (req, res) => {
  const { status, customer_name, search, page=1, limit=20 } = req.query;
  let query = 'SELECT * FROM quotations WHERE 1=1';
  const params = [];

  if (status && status !== 'All') { query += ' AND status=?'; params.push(status); }
  if (customer_name) { query += ' AND customer_name LIKE ?'; params.push(`%${customer_name}%`); }
  if (search) { query += ' AND (quot_number LIKE ? OR customer_name LIKE ?)'; const s=`%${search}%`; params.push(s,s); }

  const total = db.prepare(query.replace('SELECT *','SELECT COUNT(*) as c')).get(...params)?.c || 0;
  const offset = (parseInt(page)-1)*parseInt(limit);
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const quotations = db.prepare(query).all(...params);
  quotations.forEach(q => { q.items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id=?').all(q.id); });
  res.json({ quotations, total });
});

// GET /api/quotations/:id
router.get('/:id', (req, res) => {
  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });
  q.items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id=?').all(req.params.id);
  res.json(q);
});

// POST /api/quotations
router.post('/', (req, res) => {
  const { customer_id,customer_name,customer_email,customer_address,customer_gstin,date,valid_until,status,payment_terms,terms_conditions,notes,items=[],owner_id,deal_id,discount_amount=0 } = req.body;
  if (!customer_name) return res.status(400).json({ error: 'Customer name required.' });
  if (!items.length) return res.status(400).json({ error: 'At least one item required.' });

  const quot_number = getNextQuotNumber();
  const { subtotal, taxAmount, grandTotal } = calcTotals(items);
  const finalTotal = grandTotal - (discount_amount || 0);

  const result = db.prepare(`INSERT INTO quotations (quot_number,customer_id,customer_name,customer_email,customer_address,customer_gstin,date,valid_until,status,payment_terms,terms_conditions,notes,subtotal,discount_amount,tax_amount,grand_total,owner_id,deal_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(quot_number,customer_id||null,customer_name,customer_email||'',customer_address||'',customer_gstin||'',date||new Date().toISOString().split('T')[0],valid_until||'',status||'Draft',payment_terms||'Net 30',terms_conditions||'',notes||'',subtotal,discount_amount,taxAmount,finalTotal,owner_id||null,deal_id||null);

  const qId = result.lastInsertRowid;
  const insItem = db.prepare('INSERT INTO quotation_items (quotation_id,product_id,product_name,description,quantity,unit,price,discount,tax_rate,hsn_code,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  items.forEach(item => insItem.run(qId,item.product_id||null,item.product_name,item.description||'',item.quantity||1,item.unit||'Nos',item.price||0,item.discount||0,item.tax_rate||18,item.hsn_code||'',item.amount||0));

  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(qId);
  q.items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id=?').all(qId);
  res.status(201).json(q);
});

// PUT /api/quotations/:id
router.put('/:id', (req, res) => {
  const { customer_id,customer_name,customer_email,customer_address,customer_gstin,date,valid_until,status,payment_terms,terms_conditions,notes,items,owner_id,deal_id,discount_amount=0 } = req.body;
  if (!db.prepare('SELECT id FROM quotations WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });

  const { subtotal, taxAmount, grandTotal } = items ? calcTotals(items) : { subtotal:0, taxAmount:0, grandTotal:0 };
  const finalTotal = (items ? grandTotal : 0) - (discount_amount || 0);

  db.prepare(`UPDATE quotations SET customer_id=?,customer_name=?,customer_email=?,customer_address=?,customer_gstin=?,date=?,valid_until=?,status=?,payment_terms=?,terms_conditions=?,notes=?,subtotal=?,discount_amount=?,tax_amount=?,grand_total=?,owner_id=?,deal_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(customer_id||null,customer_name,customer_email||'',customer_address||'',customer_gstin||'',date,valid_until||'',status,payment_terms,terms_conditions||'',notes||'',subtotal,discount_amount,taxAmount,finalTotal,owner_id||null,deal_id||null,req.params.id);

  if (items) {
    db.prepare('DELETE FROM quotation_items WHERE quotation_id=?').run(req.params.id);
    const ins = db.prepare('INSERT INTO quotation_items (quotation_id,product_id,product_name,description,quantity,unit,price,discount,tax_rate,hsn_code,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    items.forEach(item => ins.run(req.params.id,item.product_id||null,item.product_name,item.description||'',item.quantity||1,item.unit||'Nos',item.price||0,item.discount||0,item.tax_rate||18,item.hsn_code||'',item.amount||0));
  }

  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id);
  q.items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id=?').all(req.params.id);
  res.json(q);
});

// DELETE /api/quotations/:id
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM quotations WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM quotations WHERE id=?').run(req.params.id);
  res.json({ message: 'Quotation deleted.' });
});

// POST /api/quotations/:id/convert-to-order — Quotation → Sales Order
router.post('/:id/convert-to-order', (req, res) => {
  const q = db.prepare('SELECT * FROM quotations WHERE id=?').get(req.params.id);
  if (!q) return res.status(404).json({ error: 'Not found' });

  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id=?').all(q.id);
  const year = new Date().getFullYear();
  const lastSO = db.prepare(`SELECT order_number FROM sales_orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`SO-${year}-%`);
  const soNum = lastSO ? `SO-${year}-${String(parseInt(lastSO.order_number.split('-')[2])+1).padStart(3,'0')}` : `SO-${year}-001`;

  const result = db.prepare(`INSERT INTO sales_orders (order_number,customer_id,customer_name,customer_email,customer_address,customer_gstin,date,status,payment_terms,subtotal,discount_amount,tax_amount,grand_total,owner_id,quotation_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(soNum,q.customer_id||null,q.customer_name,q.customer_email||'',q.customer_address||'',q.customer_gstin||'',new Date().toISOString().split('T')[0],'Pending',q.payment_terms,q.subtotal,q.discount_amount,q.tax_amount,q.grand_total,q.owner_id||null,q.id);

  const orderId = result.lastInsertRowid;
  const ins = db.prepare('INSERT INTO order_items (order_id,product_id,product_name,description,quantity,unit,price,discount,tax_rate,hsn_code,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  items.forEach(item => ins.run(orderId,item.product_id||null,item.product_name,item.description||'',item.quantity,item.unit,item.price,item.discount,item.tax_rate,item.hsn_code||'',item.amount));

  db.prepare('UPDATE quotations SET converted_to_order=1, order_id=? WHERE id=?').run(orderId, q.id);
  res.json({ message: 'Converted to sales order.', order_id: orderId, order_number: soNum });
});

module.exports = router;

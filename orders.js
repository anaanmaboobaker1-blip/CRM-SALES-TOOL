const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/orders
router.get('/', (req, res) => {
  const { status, customer_name, search, page=1, limit=20 } = req.query;
  let query = 'SELECT * FROM sales_orders WHERE 1=1';
  const params = [];

  if (status && status !== 'All') { query += ' AND status=?'; params.push(status); }
  if (customer_name) { query += ' AND customer_name LIKE ?'; params.push(`%${customer_name}%`); }
  if (search) { query += ' AND (order_number LIKE ? OR customer_name LIKE ?)'; const s=`%${search}%`; params.push(s,s); }

  const total = db.prepare(query.replace('SELECT *','SELECT COUNT(*) as c')).get(...params)?.c || 0;
  const offset = (parseInt(page)-1)*parseInt(limit);
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const orders = db.prepare(query).all(...params);
  orders.forEach(o => { o.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(o.id); });
  res.json({ orders, total });
});

// GET /api/orders/:id
router.get('/:id', (req, res) => {
  const order = db.prepare('SELECT * FROM sales_orders WHERE id=?').get(req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(req.params.id);
  res.json(order);
});

// POST /api/orders
router.post('/', (req, res) => {
  const { customer_id,customer_name,customer_email,customer_address,customer_gstin,date,delivery_date,status,delivery_address,payment_terms,notes,items=[],owner_id,quotation_id,discount_amount=0 } = req.body;
  if (!customer_name) return res.status(400).json({ error: 'Customer name required.' });

  const year = new Date().getFullYear();
  const last = db.prepare(`SELECT order_number FROM sales_orders WHERE order_number LIKE ? ORDER BY id DESC LIMIT 1`).get(`SO-${year}-%`);
  const order_number = last ? `SO-${year}-${String(parseInt(last.order_number.split('-')[2])+1).padStart(3,'0')}` : `SO-${year}-001`;

  let subtotal=0, taxAmount=0;
  items.forEach(item => {
    const lineAmt = (item.quantity||1)*(item.price||0)*(1-(item.discount||0)/100);
    item.amount = lineAmt;
    subtotal += lineAmt;
    taxAmount += lineAmt*(item.tax_rate||18)/100;
  });
  const grandTotal = subtotal + taxAmount - (discount_amount||0);

  const result = db.prepare(`INSERT INTO sales_orders (order_number,customer_id,customer_name,customer_email,customer_address,customer_gstin,date,delivery_date,status,delivery_address,payment_terms,notes,subtotal,discount_amount,tax_amount,grand_total,owner_id,quotation_id)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
    .run(order_number,customer_id||null,customer_name,customer_email||'',customer_address||'',customer_gstin||'',date||new Date().toISOString().split('T')[0],delivery_date||'',status||'Pending',delivery_address||'',payment_terms||'Net 30',notes||'',subtotal,discount_amount,taxAmount,grandTotal,owner_id||null,quotation_id||null);

  const orderId = result.lastInsertRowid;
  const ins = db.prepare('INSERT INTO order_items (order_id,product_id,product_name,description,quantity,unit,price,discount,tax_rate,hsn_code,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
  items.forEach(item => ins.run(orderId,item.product_id||null,item.product_name,item.description||'',item.quantity||1,item.unit||'Nos',item.price||0,item.discount||0,item.tax_rate||18,item.hsn_code||'',item.amount||0));

  const order = db.prepare('SELECT * FROM sales_orders WHERE id=?').get(orderId);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(orderId);
  res.status(201).json(order);
});

// PUT /api/orders/:id
router.put('/:id', (req, res) => {
  const { customer_id,customer_name,customer_email,customer_address,customer_gstin,date,delivery_date,status,delivery_address,payment_terms,notes,items,owner_id,discount_amount=0 } = req.body;
  if (!db.prepare('SELECT id FROM sales_orders WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });

  let subtotal=0, taxAmount=0;
  if (items) { items.forEach(item => { const la=(item.quantity||1)*(item.price||0)*(1-(item.discount||0)/100); item.amount=la; subtotal+=la; taxAmount+=la*(item.tax_rate||18)/100; }); }
  const grandTotal = subtotal + taxAmount - (discount_amount||0);

  db.prepare(`UPDATE sales_orders SET customer_id=?,customer_name=?,customer_email=?,customer_address=?,customer_gstin=?,date=?,delivery_date=?,status=?,delivery_address=?,payment_terms=?,notes=?,subtotal=?,discount_amount=?,tax_amount=?,grand_total=?,owner_id=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(customer_id||null,customer_name,customer_email||'',customer_address||'',customer_gstin||'',date,delivery_date||'',status,delivery_address||'',payment_terms,notes||'',subtotal,discount_amount,taxAmount,grandTotal,owner_id||null,req.params.id);

  if (items) {
    db.prepare('DELETE FROM order_items WHERE order_id=?').run(req.params.id);
    const ins = db.prepare('INSERT INTO order_items (order_id,product_id,product_name,description,quantity,unit,price,discount,tax_rate,hsn_code,amount) VALUES (?,?,?,?,?,?,?,?,?,?,?)');
    items.forEach(item => ins.run(req.params.id,item.product_id||null,item.product_name,item.description||'',item.quantity||1,item.unit||'Nos',item.price||0,item.discount||0,item.tax_rate||18,item.hsn_code||'',item.amount||0));
  }

  const order = db.prepare('SELECT * FROM sales_orders WHERE id=?').get(req.params.id);
  order.items = db.prepare('SELECT * FROM order_items WHERE order_id=?').all(req.params.id);
  res.json(order);
});

// DELETE /api/orders/:id
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM sales_orders WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM sales_orders WHERE id=?').run(req.params.id);
  res.json({ message: 'Order deleted.' });
});

module.exports = router;

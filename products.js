const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/products
router.get('/', (req, res) => {
  const { search } = req.query;
  let query = 'SELECT * FROM products WHERE is_active=1';
  const params = [];
  if (search) { query += ' AND (name LIKE ? OR description LIKE ?)'; const s=`%${search}%`; params.push(s,s); }
  query += ' ORDER BY name ASC';
  res.json(db.prepare(query).all(...params));
});

// POST /api/products
router.post('/', (req, res) => {
  const { name,description,price,unit,hsn_code,tax_rate } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required.' });
  const result = db.prepare('INSERT INTO products (name,description,price,unit,hsn_code,tax_rate) VALUES (?,?,?,?,?,?)').run(name,description||'',price||0,unit||'Nos',hsn_code||'',tax_rate||18);
  res.status(201).json(db.prepare('SELECT * FROM products WHERE id=?').get(result.lastInsertRowid));
});

// PUT /api/products/:id
router.put('/:id', (req, res) => {
  const { name,description,price,unit,hsn_code,tax_rate,is_active } = req.body;
  db.prepare('UPDATE products SET name=?,description=?,price=?,unit=?,hsn_code=?,tax_rate=?,is_active=? WHERE id=?').run(name,description||'',price||0,unit||'Nos',hsn_code||'',tax_rate||18,is_active===false?0:1,req.params.id);
  res.json(db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id));
});

// DELETE /api/products/:id
router.delete('/:id', (req, res) => {
  db.prepare('UPDATE products SET is_active=0 WHERE id=?').run(req.params.id);
  res.json({ message: 'Product deactivated.' });
});

module.exports = router;

const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/deals
router.get('/', (req, res) => {
  const { stage, owner_name, search, page=1, limit=50 } = req.query;
  let query = 'SELECT * FROM deals WHERE 1=1';
  const params = [];

  if (stage && stage !== 'All') { query += ' AND stage=?'; params.push(stage); }
  if (owner_name && owner_name !== 'All') { query += ' AND owner_name=?'; params.push(owner_name); }
  if (search) { query += ' AND (title LIKE ? OR customer_name LIKE ?)'; const s=`%${search}%`; params.push(s,s); }

  const total = db.prepare(query.replace('SELECT *','SELECT COUNT(*) as c')).get(...params)?.c || 0;
  const offset = (parseInt(page)-1)*parseInt(limit);
  query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);

  const deals = db.prepare(query).all(...params);
  // Attach products
  deals.forEach(d => {
    d.products = db.prepare('SELECT * FROM deal_products WHERE deal_id=?').all(d.id);
  });

  // Stage summary for pipeline view
  const stageSummary = db.prepare(`SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total FROM deals GROUP BY stage`).all();
  res.json({ deals, total, stageSummary });
});

// GET /api/deals/:id
router.get('/:id', (req, res) => {
  const deal = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  if (!deal) return res.status(404).json({ error: 'Not found' });
  deal.products = db.prepare('SELECT * FROM deal_products WHERE deal_id=?').all(deal.id);
  deal.followups = db.prepare('SELECT * FROM followups WHERE deal_id=? ORDER BY date DESC LIMIT 5').all(deal.id);
  res.json(deal);
});

// POST /api/deals
router.post('/', (req, res) => {
  const { title,customer_id,customer_name,value,stage,probability,close_date,owner_id,owner_name,notes,products } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required.' });

  const result = db.prepare(`INSERT INTO deals (title,customer_id,customer_name,value,stage,probability,close_date,owner_id,owner_name,notes) VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(title,customer_id||null,customer_name||'',value||0,stage||'Prospecting',probability||10,close_date||'',owner_id||null,owner_name||'',notes||'');
  const dealId = result.lastInsertRowid;

  // Insert deal products
  if (products && products.length) {
    const ins = db.prepare('INSERT INTO deal_products (deal_id,product_id,product_name,quantity,price,discount,total) VALUES (?,?,?,?,?,?,?)');
    products.forEach(p => {
      const total = (p.quantity||1)*(p.price||0)*(1-(p.discount||0)/100);
      ins.run(dealId,p.product_id||null,p.product_name,p.quantity||1,p.price||0,p.discount||0,total);
    });
  }
  const deal = db.prepare('SELECT * FROM deals WHERE id=?').get(dealId);
  deal.products = db.prepare('SELECT * FROM deal_products WHERE deal_id=?').all(dealId);
  res.status(201).json(deal);
});

// PUT /api/deals/:id
router.put('/:id', (req, res) => {
  const { title,customer_id,customer_name,value,stage,probability,close_date,owner_id,owner_name,notes,lost_reason,products } = req.body;
  if (!db.prepare('SELECT id FROM deals WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });

  db.prepare(`UPDATE deals SET title=?,customer_id=?,customer_name=?,value=?,stage=?,probability=?,close_date=?,owner_id=?,owner_name=?,notes=?,lost_reason=?,updated_at=CURRENT_TIMESTAMP WHERE id=?`)
    .run(title,customer_id||null,customer_name,value,stage,probability,close_date,owner_id||null,owner_name,notes,lost_reason||null,req.params.id);

  // Update products if provided
  if (products !== undefined) {
    db.prepare('DELETE FROM deal_products WHERE deal_id=?').run(req.params.id);
    if (products && products.length) {
      const ins = db.prepare('INSERT INTO deal_products (deal_id,product_id,product_name,quantity,price,discount,total) VALUES (?,?,?,?,?,?,?)');
      products.forEach(p => {
        const total = (p.quantity||1)*(p.price||0)*(1-(p.discount||0)/100);
        ins.run(req.params.id,p.product_id||null,p.product_name,p.quantity||1,p.price||0,p.discount||0,total);
      });
    }
  }

  const deal = db.prepare('SELECT * FROM deals WHERE id=?').get(req.params.id);
  deal.products = db.prepare('SELECT * FROM deal_products WHERE deal_id=?').all(req.params.id);
  res.json(deal);
});

// DELETE /api/deals/:id
router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM deals WHERE id=?').get(req.params.id)) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM deals WHERE id=?').run(req.params.id);
  res.json({ message: 'Deal deleted.' });
});

// GET /api/deals/pipeline/stages — pipeline stages
router.get('/pipeline/stages', (req, res) => {
  res.json(db.prepare('SELECT * FROM pipeline_stages ORDER BY sort_order').all());
});

// GET /api/deals/pipeline/forecast — pipeline forecast
router.get('/pipeline/forecast', (req, res) => {
  const forecast = db.prepare(`
    SELECT stage, COUNT(*) as count, COALESCE(SUM(value),0) as total_value,
    COALESCE(SUM(value*probability/100),0) as weighted_value
    FROM deals WHERE stage NOT IN ('Won','Lost') GROUP BY stage ORDER BY sort_order
  `).all();
  res.json(forecast);
});

module.exports = router;

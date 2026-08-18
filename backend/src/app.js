const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}));

app.use(express.json());

// Serving document uploads folder
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes mounting
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', require('./routes/leads'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/pipeline', require('./routes/pipeline'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/quotations', require('./routes/quotations'));
app.use('/api/sales-orders', require('./routes/salesOrders'));
app.use('/api/sales-team', require('./routes/salesTeam'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/search', require('./routes/search'));
app.use('/api/import', require('./routes/import'));
app.use('/api/export', require('./routes/export'));
app.use('/api/integrations', require('./routes/integrations'));

// Test route
app.get('/health', (req, res) => {
  res.json({ success: true, status: 'Healthy', timestamp: new Date() });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;

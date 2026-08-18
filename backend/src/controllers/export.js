const prisma = require('../config/db');
const { getRoleReadFilter } = require('../middleware/auth');

function jsonToCSV(data, fields) {
  const headers = fields.map(f => `"${f}"`).join(',');
  const rows = data.map(row => {
    return fields.map(field => {
      // Handle nested values (e.g. customer.name)
      let val = row;
      const parts = field.split('.');
      for (const part of parts) {
        val = val ? val[part] : '';
      }

      if (val === null || val === undefined) val = '';
      if (val instanceof Date) val = val.toISOString();

      const stringified = String(val);
      const escaped = stringified.replace(/"/g, '""');
      return `"${escaped}"`;
    }).join(',');
  });

  return [headers, ...rows].join('\r\n');
}

async function exportLeads(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'ownerId');
    const leads = await prisma.lead.findMany({
      where: { deletedAt: null, ...roleFilter },
      include: { owner: { select: { name: true } } },
    });

    const fields = ['id', 'name', 'company', 'phone', 'email', 'source', 'status', 'priority', 'owner.name', 'createdAt'];
    const csv = jsonToCSV(leads, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=leads-export.csv');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

async function exportCustomers(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'assignedSalespersonId');
    const customers = await prisma.customer.findMany({
      where: { deletedAt: null, ...roleFilter },
      include: { assignedSalesperson: { select: { name: true } } },
    });

    const fields = ['id', 'name', 'companyName', 'customerType', 'phone', 'email', 'gstin', 'customerGroup', 'status', 'assignedSalesperson.name', 'createdAt'];
    const csv = jsonToCSV(customers, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=customers-export.csv');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

async function exportDeals(req, res, next) {
  try {
    const roleFilter = getRoleReadFilter(req, 'salespersonId');
    const deals = await prisma.deal.findMany({
      where: { deletedAt: null, ...roleFilter },
      include: { customer: { select: { name: true } }, salesperson: { select: { name: true } } },
    });

    const fields = ['id', 'name', 'customer.name', 'dealValue', 'dealStage', 'probability', 'status', 'salesperson.name', 'createdAt'];
    const csv = jsonToCSV(deals, fields);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=deals-export.csv');
    res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  exportLeads,
  exportCustomers,
  exportDeals,
};

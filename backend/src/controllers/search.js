const prisma = require('../config/db');
const { getRoleReadFilter } = require('../middleware/auth');

async function globalSearch(req, res, next) {
  try {
    const { q } = req.query;

    if (!q || q.trim() === '') {
      return res.json({
        success: true,
        data: { leads: [], customers: [], contacts: [], deals: [], quotations: [], salesOrders: [] },
      });
    }

    const searchQuery = q.trim();
    const leadFilter = getRoleReadFilter(req, 'ownerId');
    const dealFilter = getRoleReadFilter(req, 'salespersonId');
    const customerFilter = getRoleReadFilter(req, 'assignedSalespersonId');

    // 1. Search Leads
    const leads = await prisma.lead.findMany({
      where: {
        deletedAt: null,
        ...leadFilter,
        OR: [
          { name: { contains: searchQuery } },
          { company: { contains: searchQuery } },
          { email: { contains: searchQuery } },
        ],
      },
      take: 5,
    });

    // 2. Search Customers
    const customers = await prisma.customer.findMany({
      where: {
        deletedAt: null,
        ...customerFilter,
        OR: [
          { name: { contains: searchQuery } },
          { companyName: { contains: searchQuery } },
          { email: { contains: searchQuery } },
        ],
      },
      take: 5,
    });

    // 3. Search Contacts
    const contactWhere = {};
    if (req.user.role === 'Salesperson') {
      contactWhere.customer = { assignedSalespersonId: req.user.id };
    }
    const contacts = await prisma.customerContact.findMany({
      where: {
        ...contactWhere,
        OR: [
          { name: { contains: searchQuery } },
          { email: { contains: searchQuery } },
          { phone: { contains: searchQuery } },
        ],
      },
      include: { customer: { select: { name: true } } },
      take: 5,
    });

    // 4. Search Deals
    const deals = await prisma.deal.findMany({
      where: {
        deletedAt: null,
        ...dealFilter,
        OR: [
          { name: { contains: searchQuery } },
          { customer: { name: { contains: searchQuery } } },
        ],
      },
      include: { customer: { select: { name: true } } },
      take: 5,
    });

    // 5. Search Quotations
    const quotations = await prisma.quotation.findMany({
      where: {
        deletedAt: null,
        ...dealFilter,
        OR: [
          { quotationNumber: { contains: searchQuery } },
          { customer: { name: { contains: searchQuery } } },
        ],
      },
      include: { customer: { select: { name: true } } },
      take: 5,
    });

    // 6. Search Sales Orders
    const orderWhere = { deletedAt: null };
    if (req.user.role === 'Salesperson') {
      orderWhere.customer = { assignedSalespersonId: req.user.id };
    }
    const salesOrders = await prisma.salesOrder.findMany({
      where: {
        ...orderWhere,
        OR: [
          { salesOrderNumber: { contains: searchQuery } },
          { customer: { name: { contains: searchQuery } } },
        ],
      },
      include: { customer: { select: { name: true } } },
      take: 5,
    });

    res.json({
      success: true,
      data: {
        leads: leads.map(l => ({ id: l.id, title: l.name, subtitle: l.company || 'Individual', type: 'Lead' })),
        customers: customers.map(c => ({ id: c.id, title: c.name, subtitle: c.customerType, type: 'Customer' })),
        contacts: contacts.map(cc => ({ id: cc.customerId, title: cc.name, subtitle: `${cc.designation || 'Contact'} at ${cc.customer.name}`, type: 'Contact' })),
        deals: deals.map(d => ({ id: d.id, title: d.name, subtitle: `Value: INR ${d.dealValue} | Customer: ${d.customer.name}`, type: 'Deal' })),
        quotations: quotations.map(q => ({ id: q.id, title: q.quotationNumber, subtitle: `Status: ${q.status} | Total: INR ${q.grandTotal}`, type: 'Quotation' })),
        salesOrders: salesOrders.map(so => ({ id: so.id, title: so.salesOrderNumber, subtitle: `Status: ${so.status} | Total: INR ${so.grandTotal}`, type: 'Sales Order' })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  globalSearch,
};

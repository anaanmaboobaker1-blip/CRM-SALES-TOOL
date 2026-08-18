const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Roles
  const roles = [
    { id: 1, name: 'Admin' },
    { id: 2, name: 'Manager' },
    { id: 3, name: 'Salesperson' },
    { id: 4, name: 'View Only' },
  ];

  for (const r of roles) {
    await prisma.role.upsert({
      where: { id: r.id },
      update: {},
      create: r,
    });
  }
  console.log('Roles seeded.');

  // 2. Users (Passwords: roleName + '123' -> e.g. admin123)
  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('admin123', salt);
  const managerPassword = await bcrypt.hash('manager123', salt);
  const salesPassword = await bcrypt.hash('sales123', salt);
  const viewPassword = await bcrypt.hash('view123', salt);

  const uAdmin = await prisma.user.upsert({
    where: { email: 'admin@sme.com' },
    update: {},
    create: {
      email: 'admin@sme.com',
      password: adminPassword,
      name: 'Aditya Admin',
      roleId: 1,
    },
  });

  const uManager = await prisma.user.upsert({
    where: { email: 'manager@sme.com' },
    update: {},
    create: {
      email: 'manager@sme.com',
      password: managerPassword,
      name: 'Manish Manager',
      roleId: 2,
    },
  });

  const uSales1 = await prisma.user.upsert({
    where: { email: 'sales1@sme.com' },
    update: {},
    create: {
      email: 'sales1@sme.com',
      password: salesPassword,
      name: 'Siddharth Sales',
      roleId: 3,
    },
  });

  const uSales2 = await prisma.user.upsert({
    where: { email: 'sales2@sme.com' },
    update: {},
    create: {
      email: 'sales2@sme.com',
      password: salesPassword,
      name: 'Sneha Sharma',
      roleId: 3,
    },
  });

  const uView = await prisma.user.upsert({
    where: { email: 'view@sme.com' },
    update: {},
    create: {
      email: 'view@sme.com',
      password: viewPassword,
      name: 'Vikas Viewer',
      roleId: 4,
    },
  });

  console.log('Users seeded.');

  // 3. Teams & Employees
  const empManager = await prisma.employee.upsert({
    where: { email: 'manager@sme.com' },
    update: {},
    create: {
      name: 'Manish Manager',
      email: 'manager@sme.com',
      phone: '+91 9988776655',
      userId: uManager.id,
    },
  });

  const salesTeam = await prisma.team.create({
    data: {
      name: 'Enterprise Sales Team',
      managerId: empManager.id,
    },
  });

  const empSales1 = await prisma.employee.upsert({
    where: { email: 'sales1@sme.com' },
    update: {},
    create: {
      name: 'Siddharth Sales',
      email: 'sales1@sme.com',
      phone: '+91 9876543210',
      userId: uSales1.id,
      teamId: salesTeam.id,
    },
  });

  const empSales2 = await prisma.employee.upsert({
    where: { email: 'sales2@sme.com' },
    update: {},
    create: {
      name: 'Sneha Sharma',
      email: 'sales2@sme.com',
      phone: '+91 9876543211',
      userId: uSales2.id,
      teamId: salesTeam.id,
    },
  });

  console.log('Teams & Employees seeded.');

  // 4. Sales Targets
  const currentYear = new Date().getFullYear();
  await prisma.salesTarget.createMany({
    data: [
      { salespersonId: uSales1.id, year: currentYear, month: 8, targetAmount: 500000, achievedAmount: 120000 },
      { salespersonId: uSales2.id, year: currentYear, month: 8, targetAmount: 400000, achievedAmount: 0 },
    ],
  });
  console.log('Sales Targets seeded.');

  // 5. Leads
  const l1 = await prisma.lead.create({
    data: {
      name: 'Rohan Joshi',
      company: 'Tech Solutions Pvt Ltd',
      phone: '+91 9123456780',
      email: 'rohan.joshi@techsolutions.com',
      source: 'Website',
      status: 'New',
      priority: 'High',
      ownerId: uSales1.id,
      nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // in 2 days
      notes: {
        create: [
          { userId: uSales1.id, note: 'Inquired through web form. Interested in CRM solution.' },
        ],
      },
      activities: {
        create: [
          {
            title: 'Initial callback',
            type: 'Call',
            status: 'Pending',
            priority: 'Medium',
            dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
            assignedEmployeeId: uSales1.id,
          },
        ],
      },
    },
  });

  const l2 = await prisma.lead.create({
    data: {
      name: 'Aisha Sen',
      company: 'Sen Designs',
      phone: '+91 9223456781',
      email: 'aisha@sendesigns.com',
      source: 'Social Media',
      status: 'Contacted',
      priority: 'Medium',
      ownerId: uSales2.id,
      nextFollowUp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    },
  });

  const l3 = await prisma.lead.create({
    data: {
      name: 'Vijay Mallya',
      company: 'Kingfisher Holdings',
      phone: '+91 9333456782',
      email: 'vijay@kingfisher.com',
      source: 'Referral',
      status: 'Qualified',
      priority: 'Critical',
      ownerId: uSales1.id,
    },
  });

  console.log('Leads seeded.');

  // 6. Customers & Contacts
  const c1 = await prisma.customer.create({
    data: {
      name: 'Vertex Global Corp',
      companyName: 'Vertex Global Corp Ltd',
      customerType: 'Business',
      phone: '+91 80 44556677',
      email: 'info@vertexglobal.com',
      gstin: '29AAAAA1111A1Z1',
      billingAddress: '45, MG Road, Ashok Nagar, Bangalore - 560001',
      shippingAddress: 'Plot 12, Industrial Area, Whitefield, Bangalore - 560066',
      customerGroup: 'Enterprise',
      status: 'Active',
      assignedSalespersonId: uSales1.id,
      tags: {
        create: [{ tag: 'VIP' }, { tag: 'Cloud' }],
      },
      contacts: {
        create: [
          {
            name: 'Priya Nair',
            designation: 'CTO',
            phone: '+91 9444455566',
            email: 'priya.nair@vertexglobal.com',
            isPrimary: true,
            notes: 'Main technical contact. Prefers WhatsApp communication.',
          },
          {
            name: 'Arjun Mehta',
            designation: 'Procurement Manager',
            phone: '+91 9555566677',
            email: 'arjun.mehta@vertexglobal.com',
            isPrimary: false,
          },
        ],
      },
      notes: {
        create: [
          { userId: uSales1.id, note: 'Client onboarded successfully. Happy with initial demo.' },
        ],
      },
    },
  });

  const c2 = await prisma.customer.create({
    data: {
      name: 'Dr. Ramesh Kumar',
      customerType: 'Individual',
      phone: '+91 9666677788',
      email: 'ramesh.kumar@health.org',
      billingAddress: '12, Clinic Road, Jayanagar, Bangalore - 560041',
      customerGroup: 'Retail',
      status: 'Active',
      assignedSalespersonId: uSales2.id,
    },
  });

  console.log('Customers and Contacts seeded.');

  // 7. Deals / Opportunities
  const stageWon = 'Won';
  const stageProposal = 'Proposal';

  const d1 = await prisma.deal.create({
    data: {
      name: 'CRM Implementation Services',
      customerId: c1.id,
      contactId: (await prisma.customerContact.findFirst({ where: { customerId: c1.id } })).id,
      dealValue: 120000,
      dealStage: stageWon,
      probability: 100,
      expectedClosingDate: new Date(),
      salespersonId: uSales1.id,
      status: 'Won',
      products: {
        create: [
          { name: 'CRM Enterprise License', quantity: 10, unitPrice: 10000, discount: 0, tax: 18, total: 118000 },
          { name: 'Onboarding & Training', quantity: 1, unitPrice: 20000, discount: 10, tax: 18, total: 21240 },
        ],
      },
    },
  });

  const d2 = await prisma.deal.create({
    data: {
      name: 'Cloud Data Migration',
      customerId: c1.id,
      dealValue: 250000,
      dealStage: stageProposal,
      probability: 60,
      expectedClosingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // in 30 days
      salespersonId: uSales1.id,
      status: 'Open',
      products: {
        create: [
          { name: 'Data Migration Suite', quantity: 1, unitPrice: 200000, discount: 0, tax: 18, total: 236000 },
          { name: 'Consulting Support (Hrs)', quantity: 50, unitPrice: 1000, discount: 0, tax: 18, total: 59000 },
        ],
      },
    },
  });

  console.log('Deals seeded.');

  // 8. Pipeline Stages
  const pipelineStages = [
    { name: 'New', order: 1 },
    { name: 'Qualification', order: 2 },
    { name: 'Proposal', order: 3 },
    { name: 'Negotiation', order: 4 },
    { name: 'Won', order: 5 },
    { name: 'Lost', order: 6 },
  ];

  for (const s of pipelineStages) {
    await prisma.pipelineStage.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    });
  }
  console.log('Pipeline stages seeded.');

  // 9. Quotations & Sales Orders
  const q1 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-00001',
      customerId: c1.id,
      quotationDate: new Date(),
      validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 120000,
      discountAmount: 2000,
      taxAmount: 21240,
      grandTotal: 139240,
      paymentTerms: '50% advance, 50% on completion',
      termsAndConditions: '1. Standard 1 year warranty.\n2. Support available Mon-Fri.',
      salespersonId: uSales1.id,
      status: 'Accepted',
      items: {
        create: [
          { name: 'CRM Software License', quantity: 10, unitPrice: 10000, discount: 0, tax: 18, total: 118000 },
          { name: 'Training Session', quantity: 1, unitPrice: 20000, discount: 2000, tax: 18, total: 21240 },
        ],
      },
    },
  });

  const q2 = await prisma.quotation.create({
    data: {
      quotationNumber: 'QT-2026-00002',
      customerId: c2.id,
      quotationDate: new Date(),
      validityDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 15000,
      discountAmount: 0,
      taxAmount: 2700,
      grandTotal: 17700,
      salespersonId: uSales2.id,
      status: 'Sent',
      items: {
        create: [
          { name: 'Personal Coaching Session', quantity: 3, unitPrice: 5000, discount: 0, tax: 18, total: 17700 },
        ],
      },
    },
  });

  // Sales Order created from q1
  await prisma.salesOrder.create({
    data: {
      salesOrderNumber: 'SO-2026-00001',
      customerId: c1.id,
      orderDate: new Date(),
      deliveryDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      deliveryAddress: 'Plot 12, Industrial Area, Whitefield, Bangalore - 560066',
      subtotal: 120000,
      discountAmount: 2000,
      taxAmount: 21240,
      grandTotal: 139240,
      paymentTerms: '50% advance, 50% on completion',
      status: 'Pending',
      quotationId: q1.id,
      items: {
        create: [
          { name: 'CRM Software License', quantity: 10, unitPrice: 10000, discount: 0, tax: 18, total: 118000 },
          { name: 'Training Session', quantity: 1, unitPrice: 20000, discount: 2000, tax: 18, total: 21240 },
        ],
      },
    },
  });

  console.log('Quotations & Sales Orders seeded.');

  // 10. Notifications
  await prisma.notification.createMany({
    data: [
      { userId: uSales1.id, title: 'New Lead Assigned', message: 'Lead Rohan Joshi has been assigned to you.', type: 'LEAD', relatedRecordId: l1.id, relatedRecordType: 'LEAD' },
      { userId: uSales1.id, title: 'Deal Closing Date Approaching', message: 'Deal Cloud Data Migration expected closing date is soon.', type: 'DEAL', relatedRecordId: d2.id, relatedRecordType: 'DEAL' },
      { userId: uSales2.id, title: 'Activity Overdue', message: 'Meeting with Aisha Sen is overdue.', type: 'ACTIVITY' },
    ],
  });
  console.log('Notifications seeded.');

  // 11. Audit Logs
  await prisma.auditLog.createMany({
    data: [
      { userId: uAdmin.id, action: 'LOGIN', module: 'AUTH', timestamp: new Date(Date.now() - 3 * 3600 * 1000) },
      { userId: uSales1.id, action: 'CREATE_LEAD', module: 'LEADS', recordId: l1.id, newValue: 'Rohan Joshi' },
      { userId: uSales1.id, action: 'CONVERT_LEAD', module: 'LEADS', recordId: l3.id, newValue: 'Lead Converted to Customer Vertex Global Corp' },
    ],
  });
  console.log('Audit logs seeded.');

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

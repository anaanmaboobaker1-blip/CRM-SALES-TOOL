// Mock Inventory Products list
const mockInventory = [
  { sku: 'INV-CRM-ENT', name: 'CRM Enterprise License', price: 10000, stock: 950 },
  { sku: 'INV-CRM-TRAIN', name: 'Onboarding & Training', price: 20000, stock: 999 },
  { sku: 'INV-MIG-SUITE', name: 'Data Migration Suite', price: 200000, stock: 50 },
  { sku: 'INV-CLOUD-HR', name: 'Cloud Consulting (Hrs)', price: 1000, stock: 5000 },
  { sku: 'INV-COACH-SES', name: 'Personal Coaching Session', price: 5000, stock: 1200 },
  { sku: 'INV-SUPPORT-YR', name: '24/7 SLA Support (Annual)', price: 50000, stock: 100 },
];

// Mock Accounting Balances
const mockAccountingBalances = {
  1: { creditLimit: 500000, outstandingBalance: 139240, status: 'Good standing' }, // Customer 1
  2: { creditLimit: 100000, outstandingBalance: 0, status: 'No dues' },          // Customer 2
};

// Mock POS Purchase receipts
const mockPOSReceipts = {
  1: [
    { receiptNo: 'REC-2026-9041', date: '2026-05-12', store: 'Downtown Retail Branch', items: '1x Wireless Keyboard, 1x USB-C Hub', amount: 4500 },
  ],
  2: [
    { receiptNo: 'REC-2026-8812', date: '2026-07-21', store: 'Metro Plaza Flagship', items: '2x Ergonomic Mouse, 1x Desk Pad', amount: 7200 },
  ],
};

async function getInventoryProducts(req, res, next) {
  try {
    res.json({ success: true, data: mockInventory });
  } catch (err) {
    next(err);
  }
}

async function getCustomerAccounting(req, res, next) {
  try {
    const customerId = parseInt(req.params.id);
    const balance = mockAccountingBalances[customerId] || { creditLimit: 50000, outstandingBalance: 0, status: 'No record / Walk-in' };
    res.json({ success: true, data: balance });
  } catch (err) {
    next(err);
  }
}

async function getCustomerPOSHistory(req, res, next) {
  try {
    const customerId = parseInt(req.params.id);
    const history = mockPOSReceipts[customerId] || [];
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

// Convert Sales Order / Quotation to Invoice (integration simulation)
async function triggerInvoiceIntegration(req, res, next) {
  try {
    const { docType, docId } = req.body;
    
    // Simulate invoice ID generation
    const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.round(100000 + Math.random() * 900000)}`;

    res.json({
      success: true,
      message: `Successfully synchronized ${docType} (ID: ${docId}) with external billing ledger`,
      data: {
        invoiceNumber,
        ledgerStatus: 'POSTED',
        syncedAt: new Date(),
        paymentPortalUrl: `https://mockpaymentgateway.com/pay/${invoiceNumber}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getInventoryProducts,
  getCustomerAccounting,
  getCustomerPOSHistory,
  triggerInvoiceIntegration,
};

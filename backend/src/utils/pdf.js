const PDFDocument = require('pdfkit');

/**
 * Generate a professional PDF document for a Quotation or Sales Order.
 * @param {string} docType - 'QUOTATION' or 'SALES_ORDER'
 * @param {Object} documentData - The DB record (Quotation/SalesOrder) loaded with customer, contact, and items
 * @param {Object} res - Express response stream
 */
function generatePDF(docType, documentData, res) {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  // Pipe to response
  doc.pipe(res);

  const isQuotation = docType === 'QUOTATION';
  const docTitle = isQuotation ? 'QUOTATION' : 'SALES ORDER';
  const docNum = isQuotation ? documentData.quotationNumber : documentData.salesOrderNumber;
  const docDate = new Date(isQuotation ? documentData.quotationDate : documentData.orderDate).toLocaleDateString();
  const auxDateLabel = isQuotation ? 'Validity Date' : 'Delivery Date';
  const auxDateVal = documentData.validityDate || documentData.deliveryDate 
    ? new Date(documentData.validityDate || documentData.deliveryDate).toLocaleDateString()
    : 'N/A';

  // --- HEADER SECTION ---
  doc
    .fillColor('#1e293b') // slate-800
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('SME ENTERPRISES', 50, 45)
    .fontSize(10)
    .font('Helvetica')
    .text('123 Business Park, Suite 400', 50, 70)
    .text('Tech Hub, Bangalore, Karnataka - 560001', 50, 83)
    .text('Email: sales@smeenterprises.com | Phone: +91 80 1234567', 50, 96);

  // --- DOCUMENT TITLE & METADATA ---
  doc
    .fillColor('#0f766e') // teal-700
    .fontSize(18)
    .font('Helvetica-Bold')
    .text(docTitle, 350, 45, { align: 'right' })
    .fillColor('#475569') // slate-600
    .fontSize(10)
    .font('Helvetica')
    .text(`Doc Number: ${docNum}`, 350, 70, { align: 'right' })
    .text(`Date: ${docDate}`, 350, 83, { align: 'right' })
    .text(`${auxDateLabel}: ${auxDateVal}`, 350, 96, { align: 'right' });

  // Divider Line
  doc.moveTo(50, 120).lineTo(550, 120).strokeColor('#cbd5e1').strokeWidth(1).stroke();

  // --- BILL TO / CUSTOMER INFORMATION ---
  const customer = documentData.customer || {};
  const contact = documentData.contact || {};
  const billingAddr = customer.billingAddress || 'N/A';
  const shippingAddr = isQuotation ? billingAddr : (documentData.deliveryAddress || customer.shippingAddress || 'N/A');

  doc
    .fillColor('#1e293b')
    .fontSize(11)
    .font('Helvetica-Bold')
    .text('BILL TO:', 50, 135)
    .font('Helvetica')
    .text(customer.name || 'Walk-in Customer', 50, 150)
    .text(customer.companyName || '', 50, 163)
    .text(`Email: ${customer.email || 'N/A'}`, 50, 176)
    .text(`Phone: ${customer.phone || 'N/A'}`, 50, 189);

  if (customer.gstin) {
    doc.font('Helvetica-Bold').text(`GSTIN: ${customer.gstin}`, 50, 205).font('Helvetica');
  }

  doc
    .font('Helvetica-Bold')
    .text('SHIPPING ADDRESS:', 300, 135)
    .font('Helvetica')
    .text(shippingAddr, 300, 150, { width: 250 });

  // Divider Line
  doc.moveTo(50, 235).lineTo(550, 235).strokeColor('#cbd5e1').strokeWidth(1).stroke();

  // --- PRODUCTS / ITEMS TABLE ---
  let tableTop = 250;
  doc
    .fillColor('#1e293b')
    .fontSize(10)
    .font('Helvetica-Bold');

  // Header Row
  doc.text('Item Description', 50, tableTop);
  doc.text('Qty', 250, tableTop, { width: 40, align: 'right' });
  doc.text('Rate', 300, tableTop, { width: 60, align: 'right' });
  doc.text('Discount', 370, tableTop, { width: 50, align: 'right' });
  doc.text('Tax %', 430, tableTop, { width: 40, align: 'right' });
  doc.text('Total', 480, tableTop, { width: 70, align: 'right' });

  // Line below Header
  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#94a3b8').strokeWidth(1).stroke();

  // Table rows
  let rowY = tableTop + 25;
  const items = documentData.items || [];

  doc.font('Helvetica');
  items.forEach((item, index) => {
    // If table runs past page limit, create new page
    if (rowY > 700) {
      doc.addPage();
      rowY = 50;
      // Re-draw table header on next page
      doc
        .fillColor('#1e293b')
        .fontSize(10)
        .font('Helvetica-Bold');
      doc.text('Item Description', 50, rowY);
      doc.text('Qty', 250, rowY, { width: 40, align: 'right' });
      doc.text('Rate', 300, rowY, { width: 60, align: 'right' });
      doc.text('Discount', 370, rowY, { width: 50, align: 'right' });
      doc.text('Tax %', 430, rowY, { width: 40, align: 'right' });
      doc.text('Total', 480, rowY, { width: 70, align: 'right' });
      doc.moveTo(50, rowY + 15).lineTo(550, rowY + 15).strokeColor('#94a3b8').stroke();
      rowY += 25;
      doc.font('Helvetica');
    }

    const discountLabel = item.discount > 0 ? `${item.discount}` : '0';
    const taxLabel = item.tax > 0 ? `${item.tax}%` : '0%';

    doc.fillColor('#334155');
    doc.text(item.name || `Product ${index + 1}`, 50, rowY, { width: 190 });
    doc.text(item.quantity.toFixed(1), 250, rowY, { width: 40, align: 'right' });
    doc.text(item.unitPrice.toFixed(2), 300, rowY, { width: 60, align: 'right' });
    doc.text(discountLabel, 370, rowY, { width: 50, align: 'right' });
    doc.text(taxLabel, 430, rowY, { width: 40, align: 'right' });
    doc.text(item.total.toFixed(2), 480, rowY, { width: 70, align: 'right' });

    rowY += 20;
  });

  // Line below items
  doc.moveTo(50, rowY).lineTo(550, rowY).strokeColor('#cbd5e1').strokeWidth(1).stroke();
  rowY += 15;

  // --- CALCULATION BLOCK (Totals) ---
  const subtotal = documentData.subtotal || 0;
  const discountAmount = documentData.discountAmount || 0;
  const taxAmount = documentData.taxAmount || 0;
  const grandTotal = documentData.grandTotal || 0;

  doc.fontSize(10);
  doc.text('Subtotal:', 350, rowY, { width: 100, align: 'right' });
  doc.text(subtotal.toFixed(2), 470, rowY, { width: 80, align: 'right' });
  rowY += 15;

  doc.text('Discount:', 350, rowY, { width: 100, align: 'right' });
  doc.text(`- ${discountAmount.toFixed(2)}`, 470, rowY, { width: 80, align: 'right' });
  rowY += 15;

  doc.text('Tax Amount:', 350, rowY, { width: 100, align: 'right' });
  doc.text(taxAmount.toFixed(2), 470, rowY, { width: 80, align: 'right' });
  rowY += 15;

  doc.moveTo(350, rowY).lineTo(550, rowY).strokeColor('#94a3b8').stroke();
  rowY += 7;

  doc
    .font('Helvetica-Bold')
    .fillColor('#0f766e')
    .fontSize(12);
  doc.text('Grand Total:', 350, rowY, { width: 100, align: 'right' });
  doc.text(grandTotal.toFixed(2), 470, rowY, { width: 80, align: 'right' });
  rowY += 25;

  // --- TERMS & CONDITIONS ---
  doc
    .fillColor('#1e293b')
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('Payment Terms:', 50, rowY)
    .font('Helvetica')
    .text(documentData.paymentTerms || 'Payment due within 30 days', 50, rowY + 13, { width: 250 });

  if (isQuotation && documentData.termsAndConditions) {
    doc
      .font('Helvetica-Bold')
      .text('Terms and Conditions:', 50, rowY + 45)
      .font('Helvetica')
      .text(documentData.termsAndConditions, 50, rowY + 58, { width: 450 });
  } else if (!isQuotation && documentData.notes) {
    doc
      .font('Helvetica-Bold')
      .text('Order Notes:', 50, rowY + 45)
      .font('Helvetica')
      .text(documentData.notes, 50, rowY + 58, { width: 450 });
  }

  // --- FOOTER BRANDING ---
  doc
    .fillColor('#94a3b8')
    .fontSize(8)
    .text('SME CRM - Generated System Document. Authorized Print.', 50, 750, { align: 'center' });

  // Finalize PDF
  doc.end();
}

module.exports = {
  generatePDF,
};

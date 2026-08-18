const { z } = require('zod');

// Middleware helper for request validation
const validateRequest = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (err) {
    next(err);
  }
};

// --- AUTH & USER SCHEMAS ---
const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
  }),
});

// --- LEADS SCHEMAS ---
const leadSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    company: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email('Invalid email format').or(z.string().length(0)).optional().nullable(),
    source: z.string().min(1, 'Lead source is required'),
    status: z.enum(['New', 'Contacted', 'Qualified', 'Lost']),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    ownerId: z.number().int().optional().nullable(),
    nextFollowUp: z.string().datetime().or(z.string().date()).or(z.string().length(0)).optional().nullable(),
  }),
});

// --- CUSTOMERS SCHEMAS ---
const customerSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Customer name must be at least 2 characters'),
    companyName: z.string().optional().nullable(),
    customerType: z.enum(['Individual', 'Business']),
    phone: z.string().optional().nullable(),
    email: z.string().email('Invalid email format').or(z.string().length(0)).optional().nullable(),
    gstin: z.string().optional().nullable(),
    billingAddress: z.string().optional().nullable(),
    shippingAddress: z.string().optional().nullable(),
    customerGroup: z.string().optional().nullable(),
    status: z.string().default('Active'),
    assignedSalespersonId: z.number().int().optional().nullable(),
    tags: z.array(z.string()).optional(),
  }),
});

// --- CONTACTS SCHEMAS ---
const contactSchema = z.object({
  body: z.object({
    customerId: z.number().int('Customer ID must be an integer'),
    name: z.string().min(2, 'Contact name is required'),
    designation: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    email: z.string().email('Invalid email').or(z.string().length(0)).optional().nullable(),
    isPrimary: z.boolean().default(false),
    notes: z.string().optional().nullable(),
  }),
});

// --- DEALS SCHEMAS ---
const dealSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Deal name must be at least 2 characters'),
    customerId: z.number().int('Customer ID is required'),
    contactId: z.number().int().optional().nullable(),
    dealValue: z.number().nonnegative('Value must be a positive number'),
    dealStage: z.string().min(1, 'Stage is required'),
    probability: z.number().min(0).max(100, 'Probability must be between 0 and 100'),
    expectedClosingDate: z.string().datetime().or(z.string().date()).or(z.string().length(0)).optional().nullable(),
    salespersonId: z.number().int().optional().nullable(),
    products: z.array(
      z.object({
        name: z.string().min(1, 'Product name is required'),
        quantity: z.number().positive('Quantity must be greater than 0'),
        unitPrice: z.number().nonnegative('Price must be positive'),
        discount: z.number().nonnegative().default(0),
        tax: z.number().nonnegative().default(0),
      })
    ).optional(),
    lostReason: z.string().optional().nullable(),
  }),
});

// --- ACTIVITIES SCHEMAS ---
const activitySchema = z.object({
  body: z.object({
    title: z.string().min(2, 'Activity title is required'),
    type: z.enum(['Call', 'Meeting', 'Task', 'Follow-up', 'Email']),
    relatedLeadId: z.number().int().optional().nullable(),
    relatedCustomerId: z.number().int().optional().nullable(),
    relatedDealId: z.number().int().optional().nullable(),
    assignedEmployeeId: z.number().int().optional().nullable(),
    dueDate: z.string().datetime().or(z.string().date()).or(z.string().length(0)).optional().nullable(),
    priority: z.enum(['Low', 'Medium', 'High', 'Critical']),
    status: z.enum(['Pending', 'Completed', 'Overdue', 'Cancelled']),
    notes: z.string().optional().nullable(),
  }),
});

// --- QUOTATIONS SCHEMAS ---
const quotationSchema = z.object({
  body: z.object({
    customerId: z.number().int('Customer ID is required'),
    contactId: z.number().int().optional().nullable(),
    quotationDate: z.string().datetime().or(z.string().date()).or(z.string().min(1)),
    validityDate: z.string().datetime().or(z.string().date()).or(z.string().length(0)).optional().nullable(),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Item name is required'),
        quantity: z.number().positive('Quantity must be greater than 0'),
        unitPrice: z.number().nonnegative('Unit price must be positive'),
        discount: z.number().nonnegative().default(0),
        tax: z.number().nonnegative().default(0),
      })
    ).min(1, 'At least one item is required'),
    paymentTerms: z.string().optional().nullable(),
    termsAndConditions: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    salespersonId: z.number().int().optional().nullable(),
    status: z.enum(['Draft', 'Sent', 'Accepted', 'Rejected', 'Expired']).default('Draft'),
  }),
});

// --- SALES ORDERS SCHEMAS ---
const salesOrderSchema = z.object({
  body: z.object({
    customerId: z.number().int('Customer ID is required'),
    contactId: z.number().int().optional().nullable(),
    orderDate: z.string().datetime().or(z.string().date()).or(z.string().min(1)),
    deliveryDate: z.string().datetime().or(z.string().date()).or(z.string().length(0)).optional().nullable(),
    deliveryAddress: z.string().optional().nullable(),
    items: z.array(
      z.object({
        name: z.string().min(1, 'Item name is required'),
        quantity: z.number().positive('Quantity must be greater than 0'),
        unitPrice: z.number().nonnegative('Unit price must be positive'),
        discount: z.number().nonnegative().default(0),
        tax: z.number().nonnegative().default(0),
      })
    ).min(1, 'At least one item is required'),
    paymentTerms: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
    status: z.enum(['Pending', 'Confirmed', 'Fulfilled', 'Cancelled']).default('Pending'),
    quotationId: z.number().int().optional().nullable(),
  }),
});

module.exports = {
  validateRequest,
  loginSchema,
  leadSchema,
  customerSchema,
  contactSchema,
  dealSchema,
  activitySchema,
  quotationSchema,
  salesOrderSchema,
};

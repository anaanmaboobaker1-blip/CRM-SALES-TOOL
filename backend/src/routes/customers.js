const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  listCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  addCustomerNote,
  uploadCustomerDocument,
  getCustomerTimeline,
  addCustomerContact,
} = require('../controllers/customers');
const { authenticateToken } = require('../middleware/auth');
const { validateRequest, customerSchema, contactSchema } = require('../validators');

// Multer storage setup
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.use(authenticateToken);

router.get('/', listCustomers);
router.get('/:id', getCustomerById);
router.post('/', validateRequest(customerSchema), createCustomer);
router.put('/:id', validateRequest(customerSchema), updateCustomer);
router.delete('/:id', deleteCustomer);

router.post('/:id/notes', addCustomerNote);
router.post('/:id/documents', upload.single('document'), uploadCustomerDocument);
router.get('/:id/timeline', getCustomerTimeline);
router.post('/:id/contacts', validateRequest(contactSchema), addCustomerContact);

module.exports = router;

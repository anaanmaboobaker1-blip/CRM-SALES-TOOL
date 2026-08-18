const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { importLeads } = require('../controllers/import');
const { authenticateToken } = require('../middleware/auth');

const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.csv') {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

router.use(authenticateToken);

router.post('/leads', upload.single('file'), importLeads);

module.exports = router;

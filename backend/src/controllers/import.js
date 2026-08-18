const fs = require('fs');
const prisma = require('../config/db');
const { logAudit } = require('../utils/audit');

// Helper to parse CSV lines safely
function parseCSV(content) {
  const lines = content.split(/\r?\n/);
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  const records = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Split by comma but respect quoted values
    const values = [];
    let insideQuote = false;
    let currentVal = '';

    for (let charIdx = 0; charIdx < line.length; charIdx++) {
      const char = line[charIdx];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        values.push(currentVal.trim().replace(/^["']|["']$/g, ''));
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
    values.push(currentVal.trim().replace(/^["']|["']$/g, ''));

    const record = {};
    headers.forEach((header, index) => {
      record[header] = values[index] || '';
    });
    records.push({ lineNum: i + 1, data: record });
  }
  return records;
}

// Bulk Import Leads from CSV
async function importLeads(req, res, next) {
  try {
    if (req.user.role === 'View Only') {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No CSV file uploaded' });
    }

    const csvContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = parseCSV(csvContent);

    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const failures = [];

    // Clean up uploaded temp file
    fs.unlinkSync(req.file.path);

    for (const record of records) {
      const { lineNum, data } = record;
      const { name, company, phone, email, source, priority } = data;

      // 1. Validation
      if (!name || !source) {
        failedCount++;
        failures.push({
          line: lineNum,
          name: name || 'Unknown',
          error: 'Missing required fields: name and source are mandatory.',
        });
        continue;
      }

      // Validate email format if provided
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        failedCount++;
        failures.push({
          line: lineNum,
          name,
          error: `Invalid email format: "${email}"`,
        });
        continue;
      }

      try {
        // 2. Duplicate Detection
        const existing = await prisma.lead.findFirst({
          where: {
            deletedAt: null,
            OR: [
              email ? { email } : null,
              phone ? { phone } : null,
            ].filter(Boolean),
          },
        });

        if (existing) {
          duplicateCount++;
          failures.push({
            line: lineNum,
            name,
            error: `Duplicate Lead (already matches Lead ID: ${existing.id})`,
          });
          continue;
        }

        // 3. Create Lead
        await prisma.lead.create({
          data: {
            name,
            company: company || null,
            phone: phone || null,
            email: email || null,
            source,
            status: 'New',
            priority: priority || 'Medium',
            ownerId: req.user.id,
          },
        });

        successCount++;
      } catch (dbErr) {
        failedCount++;
        failures.push({
          line: lineNum,
          name,
          error: dbErr.message,
        });
      }
    }

    await logAudit({
      userId: req.user.id,
      action: 'IMPORT_LEADS',
      module: 'LEADS',
      newValue: `Success: ${successCount}, Duplicates: ${duplicateCount}, Failed: ${failedCount}`,
    });

    res.json({
      success: true,
      data: {
        successCount,
        duplicateCount,
        failedCount,
        failures,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  importLeads,
};

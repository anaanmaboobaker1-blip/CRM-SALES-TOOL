const prisma = require('../config/db');

/**
 * Log an audit trail entry.
 * @param {Object} params
 * @param {number} [params.userId] - The user performing the action
 * @param {string} params.action - Action name (e.g. CREATE, UPDATE, DELETE, LOGIN, LEAD_CONVERSION)
 * @param {string} params.module - Target module (e.g. LEADS, CUSTOMERS, DEALS)
 * @param {number} [params.recordId] - ID of the record affected
 * @param {Object|string} [params.oldValue] - Record state before action
 * @param {Object|string} [params.newValue] - Record state after action
 */
async function logAudit({ userId, action, module: moduleName, recordId, oldValue, newValue }) {
  try {
    const oldStr = oldValue ? (typeof oldValue === 'object' ? JSON.stringify(oldValue) : String(oldValue)) : null;
    const newStr = newValue ? (typeof newValue === 'object' ? JSON.stringify(newValue) : String(newValue)) : null;

    await prisma.auditLog.create({
      data: {
        userId,
        action,
        module: moduleName,
        recordId,
        oldValue: oldStr,
        newValue: newStr,
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

module.exports = {
  logAudit,
};

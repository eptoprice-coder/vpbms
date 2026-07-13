const ActivityLog = require('../models/ActivityLog');

// Fire-and-forget audit log write. Never blocks or fails the request.
const logActivity = async ({ user, vendor, action, description, metadata, ip }) => {
  try {
    await ActivityLog.create({ user, vendor, action, description, metadata, ip });
  } catch (err) {
    console.error('[ActivityLog] failed to write log:', err.message);
  }
};

module.exports = logActivity;

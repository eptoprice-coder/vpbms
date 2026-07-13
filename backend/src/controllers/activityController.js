const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/asyncHandler');
const { exportToExcel, exportToPDF } = require('../utils/export');

// GET /api/admin/activity - immutable audit trail, cannot be deleted via any route.
const listActivity = asyncHandler(async (req, res) => {
  const { action, vendor, from, to, page = 1, limit = 50 } = req.query;
  const filter = {};
  if (action) filter.action = action;
  if (vendor) filter.vendor = vendor;
  if (from || to) {
    filter.createdAt = {};
    if (from) filter.createdAt.$gte = new Date(from);
    if (to) filter.createdAt.$lte = new Date(to);
  }

  const total = await ActivityLog.countDocuments(filter);
  const logs = await ActivityLog.find(filter)
    .populate('user', 'name username role')
    .populate('vendor', 'businessName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, data: logs, total, page: Number(page), limit: Number(limit) });
});

const exportActivity = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find().populate('user', 'name').populate('vendor', 'businessName').sort({ createdAt: -1 }).limit(5000);
  const columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'User', key: 'user', width: 20 },
    { header: 'Vendor', key: 'vendor', width: 22 },
    { header: 'Action', key: 'action', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
  ];
  const rows = logs.map((l) => ({
    date: l.createdAt.toLocaleString(),
    user: l.user?.name || '-',
    vendor: l.vendor?.businessName || '-',
    action: l.action,
    description: l.description || '',
  }));

  if (req.query.format === 'excel') return exportToExcel(res, { filename: 'activity-log', columns, rows });
  return exportToPDF(res, { title: 'Activity Log', columns, rows });
});

module.exports = { listActivity, exportActivity };

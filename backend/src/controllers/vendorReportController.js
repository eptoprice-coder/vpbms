const PriceHistory = require('../models/PriceHistory');
const MessageHistory = require('../models/MessageHistory');
const Customer = require('../models/Customer');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/asyncHandler');
const { exportToExcel, exportToPDF } = require('../utils/export');

const dateRangeFilter = (range, from, to) => {
  const now = new Date();
  let start, end;
  if (range === 'today') {
    start = new Date(now); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setHours(23, 59, 59, 999);
  } else if (range === 'yesterday') {
    start = new Date(now); start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
    end = new Date(now); end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999);
  } else if (range === 'week') {
    start = new Date(now); start.setDate(start.getDate() - 7);
    end = now;
  } else if (range === 'month') {
    start = new Date(now); start.setMonth(start.getMonth() - 1);
    end = now;
  } else if (from || to) {
    start = from ? new Date(from) : new Date(0);
    end = to ? new Date(to) : now;
  } else {
    start = new Date(0);
    end = now;
  }
  return { $gte: start, $lte: end };
};

// GET /api/vendor/reports?range=today|yesterday|week|month&from=&to=
const vendorReport = asyncHandler(async (req, res) => {
  const { range, from, to } = req.query;
  const createdAt = dateRangeFilter(range, from, to);
  const vendorId = req.vendor._id;

  const [priceUpdates, messagesSent, customersAdded, activity] = await Promise.all([
    PriceHistory.countDocuments({ vendor: vendorId, createdAt }),
    MessageHistory.countDocuments({ vendor: vendorId, status: 'sent', createdAt }),
    Customer.countDocuments({ vendor: vendorId, createdAt }),
    ActivityLog.find({ vendor: vendorId, createdAt }).sort({ createdAt: -1 }).limit(100),
  ]);

  res.json({
    success: true,
    data: {
      priceUpdates,
      messagesSent,
      customersAdded,
      lastLogin: req.user.lastLogin,
      activity,
    },
  });
});

// GET /api/vendor/reports/export?format=pdf|excel&range=
const exportVendorReport = asyncHandler(async (req, res) => {
  const { range, from, to } = req.query;
  const createdAt = dateRangeFilter(range, from, to);
  const logs = await ActivityLog.find({ vendor: req.vendor._id, createdAt }).sort({ createdAt: -1 }).limit(2000);

  const columns = [
    { header: 'Date', key: 'date', width: 20 },
    { header: 'Action', key: 'action', width: 20 },
    { header: 'Description', key: 'description', width: 40 },
  ];
  const rows = logs.map((l) => ({ date: l.createdAt.toLocaleString(), action: l.action, description: l.description || '' }));

  if (req.query.format === 'excel') return exportToExcel(res, { filename: 'vendor-report', columns, rows });
  return exportToPDF(res, { title: 'Vendor Activity Report', columns, rows });
});

module.exports = { vendorReport, exportVendorReport };

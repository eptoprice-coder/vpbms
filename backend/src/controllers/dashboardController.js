const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const VendorProduct = require('../models/VendorProduct');
const PriceHistory = require('../models/PriceHistory');
const MessageHistory = require('../models/MessageHistory');
const ActivityLog = require('../models/ActivityLog');
const Category = require('../models/Category');
const asyncHandler = require('../middleware/asyncHandler');

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

// GET /api/vendor/dashboard
const vendorDashboard = asyncHandler(async (req, res) => {
  const vendorId = req.vendor._id;
  const todayStart = startOfToday();

  const [totalProducts, priceUpdatesToday, customers, messagesSentToday, pendingMessages, lastPriceUpdate] = await Promise.all([
    VendorProduct.countDocuments({ vendor: vendorId, status: 'active' }),
    PriceHistory.countDocuments({ vendor: vendorId, createdAt: { $gte: todayStart } }),
    Customer.countDocuments({ vendor: vendorId, status: 'active' }),
    MessageHistory.countDocuments({ vendor: vendorId, status: 'sent', createdAt: { $gte: todayStart } }),
    MessageHistory.countDocuments({ vendor: vendorId, status: 'pending' }),
    VendorProduct.findOne({ vendor: vendorId }).sort({ lastUpdated: -1 }).select('lastUpdated'),
  ]);

  res.json({
    success: true,
    data: {
      todaysProducts: totalProducts,
      todaysPriceUpdates: priceUpdatesToday,
      customers,
      messagesSentToday,
      pendingMessages,
      lastUpdated: lastPriceUpdate?.lastUpdated || null,
    },
  });
});

// GET /api/admin/dashboard
const adminDashboard = asyncHandler(async (req, res) => {
  const todayStart = startOfToday();

  const [totalVendors, activeVendors, inactiveVendors, totalCustomers, priceUpdatesToday, messagesToday, recentActivity] =
    await Promise.all([
      Vendor.countDocuments(),
      Vendor.countDocuments({ status: 'active' }),
      Vendor.countDocuments({ status: 'disabled' }),
      Customer.countDocuments(),
      PriceHistory.countDocuments({ createdAt: { $gte: todayStart } }),
      MessageHistory.countDocuments({ status: 'sent', createdAt: { $gte: todayStart } }),
      ActivityLog.find().sort({ createdAt: -1 }).limit(15).populate('user', 'name username').populate('vendor', 'businessName'),
    ]);

  // Top vendors by messages sent
  const topVendorsAgg = await MessageHistory.aggregate([
    { $match: { status: 'sent' } },
    { $group: { _id: '$vendor', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
  ]);
  const topVendors = await Vendor.populate(topVendorsAgg, { path: '_id', select: 'businessName' });

  res.json({
    success: true,
    data: {
      totalVendors,
      activeVendors,
      inactiveVendors,
      totalCustomers,
      todaysPriceUpdates: priceUpdatesToday,
      todaysMessages: messagesToday,
      topVendors: topVendors.map((v) => ({ vendor: v._id?.businessName || 'Unknown', messagesSent: v.count })),
      recentActivity,
    },
  });
});

// GET /api/admin/dashboard/charts - time series for graphs
const adminCharts = asyncHandler(async (req, res) => {
  const days = Number(req.query.days) || 7;
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

  const [priceUpdates, messages, categoryActivity] = await Promise.all([
    PriceHistory.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    MessageHistory.aggregate([
      { $match: { createdAt: { $gte: since }, status: 'sent' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Vendor.aggregate([
      { $lookup: { from: 'categories', localField: 'category', foreignField: '_id', as: 'cat' } },
      { $unwind: '$cat' },
      { $group: { _id: '$cat.name', count: { $sum: 1 } } },
    ]),
  ]);

  res.json({ success: true, data: { priceUpdates, messages, categoryActivity } });
});

module.exports = { vendorDashboard, adminDashboard, adminCharts };

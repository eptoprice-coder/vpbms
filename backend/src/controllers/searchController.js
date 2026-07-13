const Product = require('../models/Product');
const Customer = require('../models/Customer');
const Vendor = require('../models/Vendor');
const MessageHistory = require('../models/MessageHistory');
const asyncHandler = require('../middleware/asyncHandler');

// GET /api/search?q=...  Fast cross-entity search, scoped by role.
const globalSearch = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ success: false, message: 'Search query must be at least 2 characters.' });
  }
  const re = new RegExp(q, 'i');
  const results = {};

  if (req.user.role === 'vendor') {
    const [customers, products] = await Promise.all([
      Customer.find({ vendor: req.vendor._id, $or: [{ name: re }, { businessName: re }, { mobile: re }] }).limit(10),
      Product.find({ name: re }).limit(10),
    ]);
    results.customers = customers;
    results.products = products;
  } else {
    const [vendors, customers, products] = await Promise.all([
      Vendor.find({ businessName: re }).populate('user', 'username name').limit(10),
      Customer.find({ $or: [{ name: re }, { businessName: re }, { mobile: re }] }).limit(10),
      Product.find({ name: re }).limit(10),
    ]);
    results.vendors = vendors;
    results.customers = customers;
    results.products = products;
  }

  res.json({ success: true, data: results });
});

module.exports = { globalSearch };

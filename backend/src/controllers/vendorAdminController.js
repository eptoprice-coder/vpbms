const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Customer = require('../models/Customer');
const MessageHistory = require('../models/MessageHistory');
const PriceHistory = require('../models/PriceHistory');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// GET /api/admin/vendors
const listVendors = asyncHandler(async (req, res) => {
  const { search, category, status, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (status) filter.status = status;

  let vendors = await Vendor.find(filter)
    .populate('user', 'username name email phone status lastLogin')
    .populate('category', 'name icon')
    .sort({ createdAt: -1 });

  if (search) {
    const re = new RegExp(search, 'i');
    vendors = vendors.filter(
      (v) => re.test(v.businessName) || re.test(v.user?.username) || re.test(v.user?.name)
    );
  }

  const total = vendors.length;
  const start = (Number(page) - 1) * Number(limit);
  const paged = vendors.slice(start, start + Number(limit));

  const withCounts = await Promise.all(
    paged.map(async (v) => {
      const customerCount = await Customer.countDocuments({ vendor: v._id, status: 'active' });
      const messagesSent = await MessageHistory.countDocuments({ vendor: v._id, status: 'sent' });
      return { ...v.toObject(), customerCount, messagesSent };
    })
  );

  res.json({ success: true, data: withCounts, total, page: Number(page), limit: Number(limit) });
});

// POST /api/admin/vendors
const createVendor = asyncHandler(async (req, res) => {
  const { username, password, name, email, phone, businessName, category, address, location, whatsappNumber, logo } = req.body;

  if (!username || !password || !name || !businessName || !category) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) return res.status(409).json({ success: false, message: 'Username already taken.' });

  const user = await User.create({
    username: username.toLowerCase(),
    password,
    role: 'vendor',
    name,
    email,
    phone,
  });

  const vendor = await Vendor.create({
    user: user._id,
    businessName,
    category,
    address,
    location,
    whatsappNumber,
    createdBy: req.user._id,
    ...(logo && /^data:image\/(png|jpe?g|webp);base64,/.test(logo) && logo.length <= 400000
      ? { settings: { logo } }
      : {}),
  });

  await logActivity({
    user: req.user._id,
    action: 'VENDOR_CREATED',
    description: `Super Admin created vendor "${businessName}" (${username})`,
    ip: req.ip,
  });

  const populated = await Vendor.findById(vendor._id).populate('user', '-password').populate('category');
  res.status(201).json({ success: true, data: populated });
});

// PUT /api/admin/vendors/:id
const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  const { name, email, phone, businessName, category, address, location, whatsappNumber, logo, shareFormat } = req.body;

  if (shareFormat !== undefined && ['text', 'pdf'].includes(shareFormat)) {
    vendor.settings.shareFormat = shareFormat;
  }

  if (businessName) vendor.businessName = businessName;
  if (category) vendor.category = category;
  if (address !== undefined) vendor.address = address;
  if (location !== undefined) vendor.location = location;
  if (whatsappNumber !== undefined) vendor.whatsappNumber = whatsappNumber;
  if (logo !== undefined) {
    if (logo && !/^data:image\/(png|jpe?g|webp);base64,/.test(logo)) {
      return res.status(400).json({ success: false, message: 'Logo must be a PNG, JPEG, or WebP image.' });
    }
    if (logo && logo.length > 400000) {
      return res.status(400).json({ success: false, message: 'Logo image is too large. Please use a smaller image.' });
    }
    vendor.settings.logo = logo || '';
  }
  await vendor.save();

  const user = await User.findById(vendor.user);
  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  await user.save();

  await logActivity({
    user: req.user._id,
    vendor: vendor._id,
    action: 'VENDOR_UPDATED',
    description: `Super Admin updated vendor "${vendor.businessName}"`,
    ip: req.ip,
  });

  const populated = await Vendor.findById(vendor._id).populate('user', '-password').populate('category');
  res.json({ success: true, data: populated });
});

// PATCH /api/admin/vendors/:id/disable
const toggleVendorStatus = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  vendor.status = vendor.status === 'active' ? 'disabled' : 'active';
  await vendor.save();
  await User.findByIdAndUpdate(vendor.user, { status: vendor.status });

  await logActivity({
    user: req.user._id,
    vendor: vendor._id,
    action: 'VENDOR_DISABLED',
    description: `Super Admin set vendor "${vendor.businessName}" status to ${vendor.status}`,
    ip: req.ip,
  });

  res.json({ success: true, data: vendor });
});

// DELETE /api/admin/vendors/:id
const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  await Vendor.findByIdAndDelete(vendor._id);
  await User.findByIdAndDelete(vendor.user);

  await logActivity({
    user: req.user._id,
    action: 'VENDOR_DELETED',
    description: `Super Admin deleted vendor "${vendor.businessName}"`,
    ip: req.ip,
  });

  res.json({ success: true, message: 'Vendor deleted.' });
});

// POST /api/admin/vendors/:id/reset-password
const resetVendorPassword = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  const tempPassword = crypto.randomBytes(4).toString('hex');
  const user = await User.findById(vendor.user);
  user.password = tempPassword;
  user.passwordResetRequired = true;
  await user.save();

  await logActivity({
    user: req.user._id,
    vendor: vendor._id,
    action: 'PASSWORD_RESET',
    description: `Super Admin reset password for vendor "${vendor.businessName}"`,
    ip: req.ip,
  });

  res.json({ success: true, message: 'Password reset. Share the temporary password with the vendor securely.', tempPassword });
});

// GET /api/admin/vendors/:id/activity
const vendorActivity = asyncHandler(async (req, res) => {
  const logs = await ActivityLog.find({ vendor: req.params.id }).sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: logs });
});

// GET /api/admin/vendors/:id/price-history?product=<id>&limit=500
const vendorPriceHistory = asyncHandler(async (req, res) => {
  const { product, limit = 500 } = req.query;
  const filter = { vendor: req.params.id };
  if (product) filter.product = product;
  const history = await PriceHistory.find(filter)
    .populate('product', 'name tamilName unit')
    .populate('updatedBy', 'name username')
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit), 1000));
  res.json({ success: true, data: history });
});

// GET /api/admin/vendors/:id/reports
const vendorReports = asyncHandler(async (req, res) => {
  const vendorId = req.params.id;
  const [priceUpdates, messagesSent, customers] = await Promise.all([
    PriceHistory.countDocuments({ vendor: vendorId }),
    MessageHistory.countDocuments({ vendor: vendorId, status: 'sent' }),
    Customer.countDocuments({ vendor: vendorId }),
  ]);
  res.json({ success: true, data: { priceUpdates, messagesSent, customers } });
});

module.exports = {
  listVendors,
  createVendor,
  updateVendor,
  toggleVendorStatus,
  deleteVendor,
  resetVendorPassword,
  vendorActivity,
  vendorPriceHistory,
  vendorReports,
};

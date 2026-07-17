const VendorProduct = require('../models/VendorProduct');
const Customer = require('../models/Customer');
const MessageHistory = require('../models/MessageHistory');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');
const { buildPriceListMessage, buildWaLink } = require('../utils/whatsapp');
const { validateVendorDateRange } = require('../utils/dateRange');

// POST /api/vendor/whatsapp/prepare
// Builds the formatted price-list message from today's active vendor products.
const prepareMessage = asyncHandler(async (req, res) => {
  const vendor = req.vendor;
  const vendorProducts = await VendorProduct.find({ vendor: vendor._id, status: 'active', currentPrice: { $gt: 0 } })
    .populate('product', 'name unit');

  if (!vendorProducts.length) {
    return res.status(400).json({ success: false, message: 'No priced products available. Update prices first.' });
  }

  const items = vendorProducts
    .filter((vp) => vp.product)
    .map((vp) => ({ name: vp.product.name, price: vp.currentPrice, unit: vp.product.unit }));

  const message = buildPriceListMessage({
    header: vendor.settings?.messageHeader,
    footer: vendor.settings?.messageFooter,
    items,
  });

  res.json({ success: true, message, itemCount: items.length });
});

// POST /api/vendor/whatsapp/send
// Body: { message, customerIds: [] }
// Creates one wa.me deep link per customer (official method — no unofficial WhatsApp APIs).
const sendMessage = asyncHandler(async (req, res) => {
  const { message, customerIds } = req.body;
  if (!message || !Array.isArray(customerIds) || !customerIds.length) {
    return res.status(400).json({ success: false, message: 'Message and at least one customer are required.' });
  }

  const customers = await Customer.find({ _id: { $in: customerIds }, vendor: req.vendor._id, status: 'active' });

  const records = await Promise.all(
    customers.map(async (customer) => {
      const waLink = buildWaLink(customer.mobile, message);
      const record = await MessageHistory.create({
        vendor: req.vendor._id,
        customer: customer._id,
        message,
        status: 'pending',
        waLink,
      });
      return { customerId: customer._id, name: customer.name, mobile: customer.mobile, waLink, historyId: record._id };
    })
  );

  await logActivity({
    user: req.user._id,
    vendor: req.vendor._id,
    action: 'WHATSAPP_SENT',
    description: `Prepared WhatsApp price list for ${records.length} customer(s)`,
    ip: req.ip,
  });

  res.json({ success: true, data: records });
});

// PATCH /api/vendor/whatsapp/history/:id/status
// Vendor confirms per-recipient outcome after the wa.me tab opens (client cannot detect send success programmatically).
const updateMessageStatus = asyncHandler(async (req, res) => {
  const { status } = req.body; // 'sent' | 'failed'
  if (!['sent', 'failed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be sent or failed.' });
  }
  const record = await MessageHistory.findOneAndUpdate(
    { _id: req.params.id, vendor: req.vendor._id },
    { status, sentAt: status === 'sent' ? new Date() : undefined },
    { new: true }
  );
  if (!record) return res.status(404).json({ success: false, message: 'Message record not found.' });

  if (status === 'failed') {
    await logActivity({ user: req.user._id, vendor: req.vendor._id, action: 'WHATSAPP_FAILED', description: 'Marked a WhatsApp send as failed', ip: req.ip });
  }
  res.json({ success: true, data: record });
});

// GET /api/vendor/whatsapp/history
const messageHistory = asyncHandler(async (req, res) => {
  const { from, to, status, page = 1, limit = 50 } = req.query;

  const range = validateVendorDateRange(req.vendor.createdAt, from, to);
  if (!range.valid) {
    return res.status(422).json({ success: false, message: range.message });
  }

  const filter = { vendor: req.vendor._id, createdAt: { $gte: range.from, $lte: range.to } };
  if (status) filter.status = status;

  const total = await MessageHistory.countDocuments(filter);
  const history = await MessageHistory.find(filter)
    .populate('customer', 'name mobile businessName')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, data: history, total, page: Number(page), limit: Number(limit) });
});

module.exports = { prepareMessage, sendMessage, updateMessageStatus, messageHistory };

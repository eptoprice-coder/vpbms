const Product = require('../models/Product');
const VendorProduct = require('../models/VendorProduct');
const PriceHistory = require('../models/PriceHistory');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');
const { exportToExcel, exportToPDF } = require('../utils/export');
const { validateVendorDateRange } = require('../utils/dateRange');

// Ensures a VendorProduct row exists for every active master product in the vendor's category.
const syncVendorProducts = async (vendorId, categoryId) => {
  const products = await Product.find({ category: categoryId, status: 'active' });
  const existing = await VendorProduct.find({ vendor: vendorId }).select('product');
  const existingIds = new Set(existing.map((e) => String(e.product)));
  const missing = products.filter((p) => !existingIds.has(String(p._id)));
  if (missing.length) {
    await VendorProduct.insertMany(
      missing.map((p) => ({ vendor: vendorId, product: p._id, quantityAvailable: p.defaultQuantity || 0, currentPrice: 0 }))
    );
  }
};

// GET /api/vendor/products - today's product/price sheet for the logged-in vendor
const listVendorProducts = asyncHandler(async (req, res) => {
  const vendor = req.vendor;
  await syncVendorProducts(vendor._id, vendor.category._id || vendor.category);

  const { search } = req.query;
  const vendorProducts = await VendorProduct.find({ vendor: vendor._id })
    .populate({ path: 'product', match: search ? { name: new RegExp(search, 'i') } : {} })
    .sort({ 'product.name': 1 });

  const filtered = vendorProducts.filter((vp) => vp.product);

  res.json({
    success: true,
    data: filtered.map((vp) => ({
      _id: vp._id,
      product: vp.product,
      quantityAvailable: vp.quantityAvailable,
      currentPrice: vp.currentPrice,
      status: vp.status,
      lastUpdated: vp.lastUpdated,
    })),
  });
});

// POST /api/vendor/products - vendor adds a new product to their own price sheet.
// Creates a master Product entry (scoped to the vendor's own category) plus a
// VendorProduct row so it immediately shows up in this vendor's price sheet.
// Also visible to the Super Admin's Product Master, same as any other product.
const addVendorProduct = asyncHandler(async (req, res) => {
  const { name, tamilName, unit, currentPrice } = req.body;
  if (!name || !unit) {
    return res.status(400).json({ success: false, message: 'Product name and unit are required.' });
  }

  const vendor = req.vendor;
  const categoryId = vendor.category._id || vendor.category;

  const product = await Product.create({
    name,
    tamilName,
    category: categoryId,
    unit,
    defaultQuantity: 0,
    status: 'active',
  });

  const vp = await VendorProduct.create({
    vendor: vendor._id,
    product: product._id,
    quantityAvailable: 0,
    currentPrice: currentPrice ? Number(currentPrice) : 0,
    status: 'active',
    lastUpdated: new Date(),
  });

  if (vp.currentPrice > 0) {
    await PriceHistory.create({
      vendor: vendor._id,
      product: product._id,
      oldPrice: 0,
      newPrice: vp.currentPrice,
      difference: vp.currentPrice,
      updatedBy: req.user._id,
    });
  }

  await logActivity({
    user: req.user._id,
    vendor: vendor._id,
    action: 'PRODUCT_UPDATED',
    description: `Vendor added new product "${name}"`,
    ip: req.ip,
  });

  const populated = await VendorProduct.findById(vp._id).populate('product');
  res.status(201).json({
    success: true,
    data: {
      _id: populated._id,
      product: populated.product,
      quantityAvailable: populated.quantityAvailable,
      currentPrice: populated.currentPrice,
      status: populated.status,
      lastUpdated: populated.lastUpdated,
    },
  });
});

// PATCH /api/vendor/products/:id/availability - toggle a product active/inactive on this vendor's price sheet.
// Inactive products are excluded from the WhatsApp price list but stay in the vendor's own sheet for later re-activation.
const toggleAvailability = asyncHandler(async (req, res) => {
  const vp = await VendorProduct.findOne({ _id: req.params.id, vendor: req.vendor._id });
  if (!vp) return res.status(404).json({ success: false, message: 'Product not found on your price sheet.' });

  vp.status = vp.status === 'active' ? 'inactive' : 'active';
  await vp.save();

  await logActivity({
    user: req.user._id,
    vendor: req.vendor._id,
    action: 'PRODUCT_UPDATED',
    description: `Set product availability to "${vp.status}"`,
    ip: req.ip,
  });

  const populated = await VendorProduct.findById(vp._id).populate('product');
  res.json({
    success: true,
    data: {
      _id: populated._id,
      product: populated.product,
      quantityAvailable: populated.quantityAvailable,
      currentPrice: populated.currentPrice,
      status: populated.status,
      lastUpdated: populated.lastUpdated,
    },
  });
});

// PUT /api/vendor/products/bulk-update - apply new prices, write PriceHistory (never overwritten)
const bulkUpdatePrices = asyncHandler(async (req, res) => {
  const { updates } = req.body; // [{ vendorProductId, newPrice, quantityAvailable }]
  if (!Array.isArray(updates) || !updates.length) {
    return res.status(400).json({ success: false, message: 'No price updates supplied.' });
  }

  const results = [];
  for (const u of updates) {
    const vp = await VendorProduct.findOne({ _id: u.vendorProductId, vendor: req.vendor._id });
    if (!vp) continue;
    const oldPrice = vp.currentPrice;
    const newPrice = Number(u.newPrice);
    if (Number.isNaN(newPrice) || newPrice < 0) continue;

    if (u.quantityAvailable !== undefined) vp.quantityAvailable = Number(u.quantityAvailable);
    vp.currentPrice = newPrice;
    vp.lastUpdated = new Date();
    await vp.save();

    if (oldPrice !== newPrice) {
      await PriceHistory.create({
        vendor: req.vendor._id,
        product: vp.product,
        oldPrice,
        newPrice,
        difference: Number((newPrice - oldPrice).toFixed(2)),
        updatedBy: req.user._id,
      });
    }
    results.push(vp);
  }

  await logActivity({
    user: req.user._id,
    vendor: req.vendor._id,
    action: 'PRICE_UPDATED',
    description: `Updated prices for ${results.length} product(s)`,
    ip: req.ip,
  });

  res.json({ success: true, updated: results.length, data: results });
});

// GET /api/vendor/products/history
const priceHistory = asyncHandler(async (req, res) => {
  const { from, to, product, page = 1, limit = 50 } = req.query;

  const range = validateVendorDateRange(req.vendor.createdAt, from, to);
  if (!range.valid) {
    return res.status(422).json({ success: false, message: range.message });
  }

  const filter = { vendor: req.vendor._id, createdAt: { $gte: range.from, $lte: range.to } };
  if (product) filter.product = product;

  const total = await PriceHistory.countDocuments(filter);
  const history = await PriceHistory.find(filter)
    .populate('product', 'name tamilName unit')
    .populate('updatedBy', 'name username')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(Number(limit));

  res.json({ success: true, data: history, total, page: Number(page), limit: Number(limit) });
});

// GET /api/vendor/products/history/export?format=pdf|excel&from=&to=
const exportPriceHistory = asyncHandler(async (req, res) => {
  const { from, to } = req.query;

  const range = validateVendorDateRange(req.vendor.createdAt, from, to);
  if (!range.valid) {
    return res.status(422).json({ success: false, message: range.message });
  }

  const history = await PriceHistory.find({ vendor: req.vendor._id, createdAt: { $gte: range.from, $lte: range.to } })
    .populate('product', 'name unit')
    .populate('updatedBy', 'name')
    .sort({ createdAt: -1 })
    .limit(2000);

  const columns = [
    { header: 'Date', key: 'date', width: 18 },
    { header: 'Product', key: 'product', width: 25 },
    { header: 'Old Price', key: 'oldPrice', width: 15 },
    { header: 'New Price', key: 'newPrice', width: 15 },
    { header: 'Difference', key: 'difference', width: 15 },
    { header: 'Updated By', key: 'updatedBy', width: 20 },
  ];
  const rows = history.map((h) => ({
    date: h.createdAt.toLocaleString(),
    product: h.product?.name || '-',
    oldPrice: h.oldPrice,
    newPrice: h.newPrice,
    difference: h.difference,
    updatedBy: h.updatedBy?.name || '-',
  }));

  if (req.query.format === 'excel') {
    return exportToExcel(res, { filename: 'price-history', columns, rows });
  }
  return exportToPDF(res, { title: 'Price Update History', columns, rows });
});

module.exports = { listVendorProducts, addVendorProduct, toggleAvailability, bulkUpdatePrices, priceHistory, exportPriceHistory };

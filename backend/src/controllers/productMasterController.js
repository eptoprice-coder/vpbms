const Product = require('../models/Product');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');

// Admin: manage the master product catalog. Only products flagged 'active' and
// matching a vendor's category are surfaced to that vendor.
const listProducts = asyncHandler(async (req, res) => {
  const { search, category } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (search) filter.$text = { $search: search };
  const products = await Product.find(filter).populate('category', 'name').sort({ name: 1 });
  res.json({ success: true, data: products });
});

const createProduct = asyncHandler(async (req, res) => {
  const { name, tamilName, category, unit, defaultQuantity } = req.body;
  if (!name || !category || !unit) {
    return res.status(400).json({ success: false, message: 'name, category and unit are required.' });
  }
  const product = await Product.create({ name, tamilName, category, unit, defaultQuantity });
  await logActivity({ user: req.user._id, action: 'PRODUCT_UPDATED', description: `Created master product "${name}"`, ip: req.ip });
  res.status(201).json({ success: true, data: product });
});

const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  await logActivity({ user: req.user._id, action: 'PRODUCT_UPDATED', description: `Updated master product "${product.name}"`, ip: req.ip });
  res.json({ success: true, data: product });
});

const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ success: false, message: 'Product not found.' });
  res.json({ success: true, message: 'Product deleted.' });
});

module.exports = { listProducts, createProduct, updateProduct, deleteProduct };

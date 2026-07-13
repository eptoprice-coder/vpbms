const Category = require('../models/Category');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');

const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ name: 1 });
  res.json({ success: true, data: categories });
});

const createCategory = asyncHandler(async (req, res) => {
  const { name, description, icon } = req.body;
  if (!name) return res.status(400).json({ success: false, message: 'Category name required.' });
  const category = await Category.create({ name, description, icon });
  await logActivity({ user: req.user._id, action: 'CATEGORY_CREATED', description: `Created category "${name}"`, ip: req.ip });
  res.status(201).json({ success: true, data: category });
});

const updateCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  await logActivity({ user: req.user._id, action: 'CATEGORY_UPDATED', description: `Updated category "${category.name}"`, ip: req.ip });
  res.json({ success: true, data: category });
});

const deleteCategory = asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndDelete(req.params.id);
  if (!category) return res.status(404).json({ success: false, message: 'Category not found.' });
  await logActivity({ user: req.user._id, action: 'CATEGORY_DELETED', description: `Deleted category "${category.name}"`, ip: req.ip });
  res.json({ success: true, message: 'Category deleted.' });
});

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/categoryController');

router.get('/', protect, ctrl.listCategories);
router.post('/', protect, authorize('super_admin'), ctrl.createCategory);
router.put('/:id', protect, authorize('super_admin'), ctrl.updateCategory);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteCategory);

module.exports = router;

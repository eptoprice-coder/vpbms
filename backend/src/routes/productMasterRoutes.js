const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/productMasterController');

router.get('/', protect, ctrl.listProducts);
router.post('/', protect, authorize('super_admin'), ctrl.createProduct);
router.put('/:id', protect, authorize('super_admin'), ctrl.updateProduct);
router.delete('/:id', protect, authorize('super_admin'), ctrl.deleteProduct);

module.exports = router;

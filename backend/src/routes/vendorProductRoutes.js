const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/vendorProductController');

router.use(protect, authorize('vendor'));

router.get('/', ctrl.listVendorProducts);
router.put('/bulk-update', ctrl.bulkUpdatePrices);
router.get('/history', ctrl.priceHistory);
router.get('/history/export', ctrl.exportPriceHistory);

module.exports = router;

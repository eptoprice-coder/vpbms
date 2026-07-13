const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/vendorReportController');

router.use(protect, authorize('vendor'));
router.get('/', ctrl.vendorReport);
router.get('/export', ctrl.exportVendorReport);

module.exports = router;

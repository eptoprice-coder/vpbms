const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/vendorAdminController');

router.use(protect, authorize('super_admin'));

router.get('/', ctrl.listVendors);
router.post('/', ctrl.createVendor);
router.put('/:id', ctrl.updateVendor);
router.patch('/:id/disable', ctrl.toggleVendorStatus);
router.delete('/:id', ctrl.deleteVendor);
router.post('/:id/reset-password', ctrl.resetVendorPassword);
router.get('/:id/activity', ctrl.vendorActivity);
router.get('/:id/reports', ctrl.vendorReports);
router.get('/:id/price-history', ctrl.vendorPriceHistory);

module.exports = router;

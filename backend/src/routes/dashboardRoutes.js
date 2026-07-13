const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/dashboardController');

router.get('/vendor', protect, authorize('vendor'), ctrl.vendorDashboard);
router.get('/admin', protect, authorize('super_admin'), ctrl.adminDashboard);
router.get('/admin/charts', protect, authorize('super_admin'), ctrl.adminCharts);

module.exports = router;

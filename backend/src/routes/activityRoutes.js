const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/activityController');

router.get('/', protect, authorize('super_admin'), ctrl.listActivity);
router.get('/export', protect, authorize('super_admin'), ctrl.exportActivity);

module.exports = router;

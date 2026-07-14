const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/vendorProfileController');

router.use(protect, authorize('vendor'));

router.get('/', ctrl.getProfile);
router.patch('/', ctrl.updateProfile);

module.exports = router;

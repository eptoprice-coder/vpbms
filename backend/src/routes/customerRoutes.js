const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/customerController');

router.use(protect, authorize('vendor'));

router.get('/', ctrl.listCustomers);
router.get('/export', ctrl.exportCustomers);
router.post('/', ctrl.createCustomer);
router.post('/import', ctrl.importCustomers);
router.put('/:id', ctrl.updateCustomer);
router.delete('/bulk', ctrl.bulkDeleteCustomers);
router.delete('/:id', ctrl.deleteCustomer);

module.exports = router;

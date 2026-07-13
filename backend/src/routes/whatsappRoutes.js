const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/whatsappController');

router.use(protect, authorize('vendor'));

router.post('/prepare', ctrl.prepareMessage);
router.post('/send', ctrl.sendMessage);
router.patch('/history/:id/status', ctrl.updateMessageStatus);
router.get('/history', ctrl.messageHistory);

module.exports = router;

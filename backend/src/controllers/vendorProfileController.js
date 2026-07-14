const Vendor = require('../models/Vendor');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');

// GET /api/vendor/profile
const getProfile = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.vendor._id).populate('category');
  res.json({ success: true, data: vendor });
});

// PATCH /api/vendor/profile
// Vendors personalize their workspace: logo, message header/footer, WhatsApp number.
const updateProfile = asyncHandler(async (req, res) => {
  const { logo, messageHeader, messageFooter, whatsappNumber } = req.body;

  const vendor = await Vendor.findById(req.vendor._id);
  if (!vendor) return res.status(404).json({ success: false, message: 'Vendor not found.' });

  if (logo !== undefined) {
    if (logo && !/^data:image\/(png|jpe?g|webp);base64,/.test(logo)) {
      return res.status(400).json({ success: false, message: 'Logo must be a PNG, JPEG, or WebP image.' });
    }
    if (logo && logo.length > 400000) {
      return res.status(400).json({ success: false, message: 'Logo image is too large. Please use a smaller image.' });
    }
    vendor.settings.logo = logo || '';
  }
  if (messageHeader !== undefined) vendor.settings.messageHeader = String(messageHeader).slice(0, 200);
  if (messageFooter !== undefined) vendor.settings.messageFooter = String(messageFooter).slice(0, 200);
  if (whatsappNumber !== undefined) vendor.whatsappNumber = String(whatsappNumber).trim();

  await vendor.save();
  const populated = await Vendor.findById(vendor._id).populate('category');

  await logActivity({
    user: req.user._id,
    vendor: vendor._id,
    action: 'PROFILE_UPDATED',
    description: 'Updated brand profile (logo / message style)',
    ip: req.ip,
  });

  res.json({ success: true, data: populated });
});

module.exports = { getProfile, updateProfile };

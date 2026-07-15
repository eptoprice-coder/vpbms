const User = require('../models/User');
const Vendor = require('../models/Vendor');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../middleware/asyncHandler');
const logActivity = require('../middleware/activityLogger');
const crypto = require('crypto');

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { username, password, remember } = req.body;
  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const user = await User.findOne({ username: username.toLowerCase() }).select('+password');
  if (!user) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  if (user.status === 'disabled') {
    return res.status(403).json({ success: false, message: 'This account has been disabled by the administrator.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials.' });

  let vendor = null;
  if (user.role === 'vendor') {
    vendor = await Vendor.findOne({ user: user._id }).populate('category');
    if (!vendor) return res.status(404).json({ success: false, message: 'Vendor profile not found.' });
    if (vendor.status === 'disabled') {
      return res.status(403).json({ success: false, message: 'Vendor account disabled by administrator.' });
    }
  }

  user.lastLogin = new Date();
  await user.save();

  const token = generateToken(user, remember);

  await logActivity({
    user: user._id,
    vendor: vendor?._id,
    action: 'LOGIN',
    description: `${user.role} "${user.username}" logged in`,
    ip: req.ip,
  });

  res.json({
    success: true,
    token,
    user: user.toSafeObject(),
    vendor,
  });
});

// POST /api/auth/forgot-password  (generates a temp reset token; in production this would email/SMS the vendor)
const forgotPassword = asyncHandler(async (req, res) => {
  const { username } = req.body;
  const user = await User.findOne({ username: username?.toLowerCase() });
  if (!user) {
    // Do not reveal whether the account exists.
    return res.json({ success: true, message: 'If the account exists, a reset link has been generated.' });
  }
  const tempToken = crypto.randomBytes(20).toString('hex');
  user.rememberToken = tempToken;
  user.passwordResetRequired = true;
  await user.save();

  res.json({
    success: true,
    message: 'Password reset requested. Please contact your Super Admin to complete the reset.',
    // In a production deployment this token would be sent via SMS/email, not returned in the API response.
    resetToken: tempToken,
  });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  let vendor = null;
  if (req.user.role === 'vendor') {
    vendor = await Vendor.findOne({ user: req.user._id }).populate('category');
  }
  res.json({ success: true, user: req.user.toSafeObject(), vendor });
});

// POST /api/auth/change-password
// Lets any signed-in user (vendors included) replace their password — e.g. after
// logging in with a temp password shared by the Eptomart admin.
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Current and new password are required.' });
  }
  if (String(newPassword).length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const user = await User.findById(req.user._id).select('+password');
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) return res.status(401).json({ success: false, message: 'Current password is incorrect.' });

  user.password = newPassword;
  user.passwordResetRequired = false;
  await user.save();

  await logActivity({
    user: user._id,
    vendor: req.vendor?._id,
    action: 'PASSWORD_CHANGED',
    description: `${user.role} "${user.username}" changed their password`,
    ip: req.ip,
  });

  res.json({ success: true, message: 'Password changed successfully.' });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  await logActivity({
    user: req.user._id,
    vendor: req.vendor?._id,
    action: 'LOGOUT',
    description: `${req.user.role} "${req.user.username}" logged out`,
    ip: req.ip,
  });
  res.json({ success: true, message: 'Logged out.' });
});

module.exports = { login, forgotPassword, getMe, logout, changePassword };

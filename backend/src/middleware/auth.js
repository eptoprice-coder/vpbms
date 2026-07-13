const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vendor = require('../models/Vendor');

const protect = async (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Not authenticated. Token missing.' });
    }
    const token = header.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id);
    if (!user || user.status === 'disabled') {
      return res.status(401).json({ success: false, message: 'Account inactive or not found.' });
    }

    req.user = user;

    if (user.role === 'vendor') {
      const vendor = await Vendor.findOne({ user: user._id }).populate('category');
      if (!vendor || vendor.status === 'disabled') {
        return res.status(403).json({ success: false, message: 'Vendor account disabled.' });
      }
      req.vendor = vendor;
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Access denied for this role.' });
  }
  next();
};

module.exports = { protect, authorize };

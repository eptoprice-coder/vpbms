const jwt = require('jsonwebtoken');

// Sessions persist until the user (vendor or admin) explicitly logs out —
// tokens are issued with a very long lifetime. Access can still be cut off
// at any time by the Super Admin disabling the account, which is enforced
// on every request by the auth middleware.
const generateToken = (user) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '365d';
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;

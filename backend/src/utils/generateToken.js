const jwt = require('jsonwebtoken');

const generateToken = (user, remember = false) => {
  const expiresIn = remember
    ? process.env.JWT_REFRESH_EXPIRES_IN || '30d'
    : process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn });
};

module.exports = generateToken;

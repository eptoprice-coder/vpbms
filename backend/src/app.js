const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const mongoose = require('mongoose');

const { errorHandler, notFound } = require('./middleware/errorHandler');

const authRoutes = require('./routes/authRoutes');
const vendorAdminRoutes = require('./routes/vendorAdminRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const productMasterRoutes = require('./routes/productMasterRoutes');
const vendorProductRoutes = require('./routes/vendorProductRoutes');
const customerRoutes = require('./routes/customerRoutes');
const whatsappRoutes = require('./routes/whatsappRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const activityRoutes = require('./routes/activityRoutes');
const searchRoutes = require('./routes/searchRoutes');
const vendorReportRoutes = require('./routes/vendorReportRoutes');

const app = express();

// Render (and most PaaS hosts) sit behind a reverse proxy — trust the first hop
// so req.ip / express-rate-limit read the real client IP from X-Forwarded-For.
app.set('trust proxy', 1);

app.use(helmet());

// CLIENT_URL supports a comma-separated list, e.g.
// "https://vpbms.pages.dev,https://app.yourdomain.com"
const allowedOrigins = (process.env.CLIENT_URL || '*')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// Global rate limiter to slow brute-force / abuse; auth endpoints get a stricter one.
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 500 });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 });
app.use('/api/', apiLimiter);
app.use('/api/auth/login', authLimiter);

app.get('/api/health', (req, res) => res.json({ success: true, message: 'VPBMS API is running', time: new Date() }));

// TEMPORARY diagnostic route — remove after debugging the login issue.
// Reports exactly which database/host this running instance is connected to,
// plus a live count of documents in the users collection, with no auth required.
app.get('/api/debug-db', async (req, res) => {
  try {
    const usersCount = await mongoose.connection.db.collection('users').countDocuments();
    const adminUser = await mongoose.connection.db.collection('users').findOne({ username: 'admin' }, { projection: { username: 1, role: 1, status: 1 } });
    res.json({
      success: true,
      dbName: mongoose.connection.name,
      host: mongoose.connection.host,
      readyState: mongoose.connection.readyState, // 1 = connected
      usersCount,
      adminUserFound: !!adminUser,
      adminUser: adminUser || null,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/admin/vendors', vendorAdminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productMasterRoutes);
app.use('/api/vendor/products', vendorProductRoutes);
app.use('/api/vendor/customers', customerRoutes);
app.use('/api/vendor/whatsapp', whatsappRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin/activity', activityRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/vendor/reports', vendorReportRoutes);
app.use('/api/vendor/profile', require('./routes/vendorProfileRoutes'));

app.use(notFound);
app.use(errorHandler);

module.exports = app;

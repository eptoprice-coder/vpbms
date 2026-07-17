require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  // Idempotent data fix-ups (safe to run on every boot)
  require('./utils/migrations').migratePrivateProducts();
  app.listen(PORT, () => {
    console.log(`[Server] VPBMS API running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
  });
  startKeepAlive();
};

// Render spins idle services down, causing slow cold starts for vendors.
// Ping our own health endpoint every 10 minutes to stay warm.
// Uses RENDER_EXTERNAL_URL (set automatically by Render) or KEEP_ALIVE_URL.
const startKeepAlive = () => {
  const base = process.env.KEEP_ALIVE_URL || process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.NODE_ENV !== 'production') return;
  const url = `${base.replace(/\/$/, '')}/api/health`;
  console.log(`[KeepAlive] Pinging ${url} every 10 minutes`);
  setInterval(() => {
    fetch(url).catch(() => {}); // best effort — never crash over a failed ping
  }, 10 * 60 * 1000);
};

start();

process.on('unhandledRejection', (err) => {
  console.error('[UnhandledRejection]', err);
});

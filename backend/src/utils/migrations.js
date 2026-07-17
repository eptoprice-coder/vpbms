const Product = require('../models/Product');
const Vendor = require('../models/Vendor');
const ActivityLog = require('../models/ActivityLog');

// One-time (idempotent) fix-up: products added by vendors before ownership
// scoping existed have no createdByVendor, so they leaked into every vendor's
// sheet in the category. The activity log recorded who added what — use it
// to tag those products as private to their creator.
const migratePrivateProducts = async () => {
  try {
    const logs = await ActivityLog.find({
      description: /^Vendor added new product /,
      vendor: { $ne: null },
    }).select('vendor description');

    let tagged = 0;
    for (const log of logs) {
      const m = /Vendor added new product "(.+)"/.exec(log.description);
      if (!m) continue;
      const vendor = await Vendor.findById(log.vendor).select('category');
      if (!vendor) continue;
      const res = await Product.updateMany(
        {
          name: m[1],
          category: vendor.category,
          $or: [{ createdByVendor: null }, { createdByVendor: { $exists: false } }],
        },
        { $set: { createdByVendor: log.vendor } }
      );
      tagged += res.modifiedCount || 0;
    }
    if (tagged) console.log(`[Migration] Tagged ${tagged} vendor-private product(s).`);
  } catch (err) {
    console.error('[Migration] privateProducts failed (non-fatal):', err.message);
  }
};

module.exports = { migratePrivateProducts };

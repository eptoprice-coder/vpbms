const mongoose = require('mongoose');

// Per-vendor product state: current price, quantity, visibility.
const vendorProductSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantityAvailable: { type: Number, default: 0 },
    currentPrice: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

vendorProductSchema.index({ vendor: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('VendorProduct', vendorProductSchema);

const mongoose = require('mongoose');

// Append-only. Never edit or delete existing entries.
const priceHistorySchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    oldPrice: { type: Number, required: true },
    newPrice: { type: Number, required: true },
    difference: { type: Number, required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

priceHistorySchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('PriceHistory', priceHistorySchema);

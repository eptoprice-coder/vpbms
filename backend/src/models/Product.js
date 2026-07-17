const mongoose = require('mongoose');

// Master product catalog. Only products assigned to a vendor's category appear for them.
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    tamilName: { type: String, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    unit: { type: String, required: true, default: 'kg' },
    defaultQuantity: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    // null = global catalog product (added by Super Admin, visible to all vendors
    // in the category). Set = private product added by that vendor, visible only to them.
    createdByVendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', default: null },
  },
  { timestamps: true }
);

productSchema.index({ name: 'text', tamilName: 'text' });

module.exports = mongoose.model('Product', productSchema);

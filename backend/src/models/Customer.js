const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true, trim: true },
    businessName: { type: String, trim: true },
    location: { type: String, trim: true },
    group: {
      type: String,
      enum: ['Hotels', 'Retail Shops', 'Wholesalers', 'Restaurants', 'Street Vendors', 'Supermarkets', 'Other'],
      default: 'Other',
    },
    remarks: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  },
  { timestamps: true }
);

customerSchema.index({ vendor: 1, mobile: 1 }, { unique: true });
customerSchema.index({ name: 'text', businessName: 'text' });

module.exports = mongoose.model('Customer', customerSchema);

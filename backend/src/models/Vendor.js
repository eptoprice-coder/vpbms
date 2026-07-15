const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true, trim: true },
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    address: { type: String, trim: true },
    location: { type: String, trim: true },
    whatsappNumber: { type: String, trim: true },
    status: { type: String, enum: ['active', 'disabled'], default: 'active' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    settings: {
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      messageFooter: { type: String, default: 'Thank you.' },
      messageHeader: { type: String, default: '🌿 Fresh Market Price List' },
      logo: { type: String, default: '' }, // vendor's own logo as a compact data URL
      // Admin-controlled: whether the vendor's price list is shared as a text message or a PDF.
      shareFormat: { type: String, enum: ['text', 'pdf'], default: 'text' },
    },
  },
  { timestamps: true }
);

vendorSchema.index({ businessName: 'text' });

module.exports = mongoose.model('Vendor', vendorSchema);

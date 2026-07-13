const mongoose = require('mongoose');

// Immutable audit trail. History cannot be deleted via API.
const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    action: {
      type: String,
      required: true,
      enum: [
        'LOGIN', 'LOGOUT', 'PRICE_UPDATED', 'CUSTOMER_ADDED', 'CUSTOMER_UPDATED',
        'CUSTOMER_DELETED', 'WHATSAPP_SENT', 'WHATSAPP_FAILED', 'PRODUCT_UPDATED',
        'VENDOR_CREATED', 'VENDOR_UPDATED', 'VENDOR_DISABLED', 'VENDOR_DELETED',
        'PASSWORD_RESET', 'CATEGORY_CREATED', 'CATEGORY_UPDATED', 'CATEGORY_DELETED',
      ],
    },
    description: { type: String },
    metadata: { type: mongoose.Schema.Types.Mixed },
    ip: { type: String },
  },
  { timestamps: true }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);

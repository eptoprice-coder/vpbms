const mongoose = require('mongoose');

const messageHistorySchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    // Either a customer (individual send) or a groupName (group/broadcast send) is set.
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
    groupName: { type: String, trim: true },
    recipientType: { type: String, enum: ['customer', 'group'], default: 'customer' },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date },
    waLink: { type: String },
  },
  { timestamps: true }
);

messageHistorySchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('MessageHistory', messageHistorySchema);

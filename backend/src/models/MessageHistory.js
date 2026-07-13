const mongoose = require('mongoose');

const messageHistorySchema = new mongoose.Schema(
  {
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['pending', 'sent', 'failed'], default: 'pending' },
    sentAt: { type: Date },
    waLink: { type: String },
  },
  { timestamps: true }
);

messageHistorySchema.index({ vendor: 1, createdAt: -1 });

module.exports = mongoose.model('MessageHistory', messageHistorySchema);

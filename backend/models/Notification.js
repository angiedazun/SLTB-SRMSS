const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: {
      type: String,
      enum: ['info', 'warning', 'danger', 'success', 'maintenance', 'schedule', 'fuel'],
      default: 'info',
    },
    recipients: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isGlobal: { type: Boolean, default: false },
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    relatedEntity: { type: String }, // Bus, Driver, Route, etc.
    relatedId: { type: mongoose.Schema.Types.ObjectId },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    expiresAt: { type: Date },
    actionUrl: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 }); // auto-delete after 30 days

module.exports = mongoose.model('Notification', notificationSchema);

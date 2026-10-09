const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  departureTime: { type: String, required: true }, // "HH:MM"
  arrivalTime: { type: String, required: true },
  bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
  driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
  actualDeparture: { type: Date },
  actualArrival: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'delayed', 'cancelled'],
    default: 'scheduled',
  },
  delayMinutes: { type: Number, default: 0 },
  passengersCount: { type: Number, default: 0 },
  notes: { type: String },
});

const scheduleSchema = new mongoose.Schema(
  {
    scheduleCode: { type: String, unique: true },
    title: { type: String, required: true },
    route: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
    type: { type: String, enum: ['daily', 'weekly', 'monthly', 'special'], default: 'daily' },
    effectiveFrom: { type: Date, required: true },
    effectiveTo: { type: Date },
    trips: [tripSchema],
    status: {
      type: String,
      enum: ['active', 'draft', 'suspended', 'expired'],
      default: 'draft',
    },
    depot: { type: String, required: true },
    operatingDays: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: false },
      sunday: { type: Boolean, default: false },
    },
    conflictsWith: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Schedule' }],
    priority: { type: Number, default: 1 },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

scheduleSchema.pre('save', function (next) {
  if (!this.scheduleCode) {
    this.scheduleCode = `SCH-${Date.now().toString(36).toUpperCase()}`;
  }
  next();
});

module.exports = mongoose.model('Schedule', scheduleSchema);

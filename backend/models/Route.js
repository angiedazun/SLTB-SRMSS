const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: { type: Number },
  lng: { type: Number },
  order: { type: Number, required: true },
  distanceFromPrev: { type: Number, default: 0 }, // km
  timeFromPrev: { type: Number, default: 0 }, // minutes
  landmark: { type: String },
});

const routeSchema = new mongoose.Schema(
  {
    routeNumber: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    origin: { type: String, required: true },
    destination: { type: String, required: true },
    stops: [stopSchema],
    totalDistance: { type: Number, default: 0 }, // km
    estimatedDuration: { type: Number, default: 0 }, // minutes
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'under_review'],
      default: 'active',
    },
    type: { type: String, enum: ['express', 'local', 'inter_city', 'rural'], default: 'local' },
    fare: {
      base: { type: Number, default: 0 },
      perKm: { type: Number, default: 0 },
    },
    operatingDays: {
      monday: { type: Boolean, default: true },
      tuesday: { type: Boolean, default: true },
      wednesday: { type: Boolean, default: true },
      thursday: { type: Boolean, default: true },
      friday: { type: Boolean, default: true },
      saturday: { type: Boolean, default: true },
      sunday: { type: Boolean, default: false },
    },
    depot: { type: String, required: true },
    assignedBuses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Bus' }],
    assignedDrivers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Driver' }],
    color: { type: String, default: '#4F9CF9' },
    peakHours: [{ start: String, end: String }],
    avgPassengersPerTrip: { type: Number, default: 0 },
    totalTripsCompleted: { type: Number, default: 0 },
    onTimePerformance: { type: Number, default: 100 }, // percentage
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Route', routeSchema);

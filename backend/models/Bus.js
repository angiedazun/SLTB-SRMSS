const mongoose = require('mongoose');

const busSchema = new mongoose.Schema(
  {
    busNumber: { type: String, required: true, unique: true, uppercase: true, trim: true },
    registrationNumber: { type: String, required: true, unique: true, uppercase: true },
    model: { type: String, required: true },
    manufacturer: { type: String },
    year: { type: Number },
    capacity: { type: Number, required: true },
    fuelType: { type: String, enum: ['diesel', 'petrol', 'electric', 'hybrid'], default: 'diesel' },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'delayed', 'out_of_service', 'idle'],
      default: 'idle',
    },
    depot: { type: String, required: true },
    currentMileage: { type: Number, default: 0 },
    lastServiceMileage: { type: Number, default: 0 },
    nextServiceMileage: { type: Number },
    insuranceExpiry: { type: Date },
    licenseExpiry: { type: Date },
    purchaseDate: { type: Date },
    color: { type: String, default: '#1E40AF' },
    engineNumber: { type: String },
    chassisNumber: { type: String },
    lastLocation: {
      lat: { type: Number },
      lng: { type: Number },
      updatedAt: { type: Date },
    },
    fuelCapacity: { type: Number, default: 200 },
    currentFuelLevel: { type: Number, default: 0 },
    assignedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    assignedDriver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    notes: { type: String },
    images: [{ type: String }],
  },
  { timestamps: true }
);

busSchema.virtual('maintenanceRecords', {
  ref: 'MaintenanceRecord',
  localField: '_id',
  foreignField: 'bus',
});

busSchema.virtual('fuelLogs', {
  ref: 'FuelLog',
  localField: '_id',
  foreignField: 'bus',
});

/**
 * Compute a 0–100 health score for a bus based on:
 *   - Status (out_of_service → 0, maintenance → 30 base, active/idle → 100 base)
 *   - Service overdue (currentMileage vs nextServiceMileage)
 *   - Insurance / license expiry (deduct points if expired / within 30 days)
 *   - Vehicle age (deduct 1pt per year over 10 years)
 *   - Fuel level (underweight if < 10% capacity)
 */
busSchema.methods.computeHealthScore = function () {
  if (this.status === 'out_of_service') return 0;

  let score = 100;

  // Status penalty
  if (this.status === 'maintenance') score -= 30;
  else if (this.status === 'delayed') score -= 10;

  // Service overdue
  if (this.nextServiceMileage && this.currentMileage) {
    const mileageLeft = this.nextServiceMileage - this.currentMileage;
    if (mileageLeft < 0) score -= 20;           // overdue
    else if (mileageLeft < 500) score -= 10;    // due soon
    else if (mileageLeft < 1000) score -= 5;
  }

  // Insurance expiry
  if (this.insuranceExpiry) {
    const daysLeft = Math.floor((new Date(this.insuranceExpiry) - Date.now()) / 86400000);
    if (daysLeft < 0) score -= 20;
    else if (daysLeft < 30) score -= 10;
    else if (daysLeft < 60) score -= 5;
  }

  // License expiry
  if (this.licenseExpiry) {
    const daysLeft = Math.floor((new Date(this.licenseExpiry) - Date.now()) / 86400000);
    if (daysLeft < 0) score -= 15;
    else if (daysLeft < 30) score -= 8;
    else if (daysLeft < 60) score -= 3;
  }

  // Vehicle age (deduct 1pt per year over 10)
  if (this.year) {
    const age = new Date().getFullYear() - this.year;
    if (age > 10) score -= Math.min(age - 10, 15);
  }

  // Low fuel
  if (this.fuelCapacity && this.fuelCapacity > 0) {
    const fuelPct = (this.currentFuelLevel || 0) / this.fuelCapacity;
    if (fuelPct < 0.1) score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

busSchema.set('toJSON', { virtuals: false });
busSchema.set('toObject', { virtuals: false });

module.exports = mongoose.model('Bus', busSchema);

const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    employeeId: { type: String, required: true, unique: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, required: true },
    nic: { type: String, required: true, unique: true, uppercase: true },
    address: { type: String },
    dateOfBirth: { type: Date },
    joinDate: { type: Date, default: Date.now },
    licenseNumber: { type: String, required: true, unique: true, uppercase: true },
    licenseExpiry: { type: Date, required: true },
    licenseClass: { type: String, enum: ['A', 'B', 'C', 'D', 'E'], default: 'D' },
    status: {
      type: String,
      enum: ['active', 'on_leave', 'suspended', 'inactive'],
      default: 'active',
    },
    depot: { type: String, required: true },
    shift: { type: String, enum: ['morning', 'evening', 'night', 'split'], default: 'morning' },
    assignedBus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus' },
    assignedRoute: { type: mongoose.Schema.Types.ObjectId, ref: 'Route' },
    totalTrips: { type: Number, default: 0 },
    totalMileage: { type: Number, default: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    avatar: { type: String },
    documents: [
      {
        type: { type: String },
        url: { type: String },
        expiryDate: { type: Date },
      },
    ],
    workingHoursThisMonth: { type: Number, default: 0 },
    notes: { type: String },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Driver', driverSchema);

const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema(
  {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    type: {
      type: String,
      enum: ['routine', 'repair', 'inspection', 'overhaul', 'emergency', 'preventive'],
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    scheduledDate: { type: Date, required: true },
    completedDate: { type: Date },
    mileageAtService: { type: Number },
    nextServiceMileage: { type: Number },
    nextServiceDate: { type: Date },
    cost: { type: Number, default: 0 },
    laborCost: { type: Number, default: 0 },
    partsCost: { type: Number, default: 0 },
    spareParts: [
      {
        name: { type: String },
        quantity: { type: Number },
        unitCost: { type: Number },
        partNumber: { type: String },
      },
    ],
    technician: { type: String },
    workshop: { type: String },
    priority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    documents: [{ type: String }],
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

maintenanceSchema.virtual('totalCost').get(function () {
  return this.laborCost + this.partsCost;
});

module.exports = mongoose.model('MaintenanceRecord', maintenanceSchema);

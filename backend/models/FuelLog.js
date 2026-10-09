const mongoose = require('mongoose');

const fuelLogSchema = new mongoose.Schema(
  {
    bus: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
    driver: { type: mongoose.Schema.Types.ObjectId, ref: 'Driver' },
    date: { type: Date, required: true, default: Date.now },
    quantity: { type: Number, required: true }, // liters
    pricePerLiter: { type: Number, required: true },
    totalCost: { type: Number },
    mileageAtFueling: { type: Number, required: true },
    fuelStation: { type: String },
    fuelType: { type: String, enum: ['diesel', 'petrol', 'electric', 'hybrid'], default: 'diesel' },
    previousMileage: { type: Number },
    efficiency: { type: Number }, // km per liter calculated
    depot: { type: String },
    receiptNumber: { type: String },
    notes: { type: String },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

fuelLogSchema.pre('save', function (next) {
  if (this.quantity && this.pricePerLiter) {
    this.totalCost = parseFloat((this.quantity * this.pricePerLiter).toFixed(2));
  }
  if (this.mileageAtFueling && this.previousMileage && this.previousMileage > 0) {
    const distance = this.mileageAtFueling - this.previousMileage;
    if (distance > 0 && this.quantity > 0) {
      this.efficiency = parseFloat((distance / this.quantity).toFixed(2));
    }
  }
  next();
});

module.exports = mongoose.model('FuelLog', fuelLogSchema);

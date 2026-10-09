const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Route = require('../models/Route');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🌱 Seeding database...');

  await Promise.all([User.deleteMany({}), Bus.deleteMany({}), Driver.deleteMany({}), Route.deleteMany({})]);

  // Users
  await User.create([
    { name: 'Super Admin', email: 'admin@sltb.lk', password: 'Admin@1234', role: 'super_admin', depot: 'Colombo', employeeId: 'EMP001' },
    { name: 'Depot Manager', email: 'manager@sltb.lk', password: 'Manager@1234', role: 'depot_manager', depot: 'Colombo', employeeId: 'EMP002' },
    { name: 'Scheduler Officer', email: 'scheduler@sltb.lk', password: 'Scheduler@1234', role: 'scheduler_officer', depot: 'Colombo', employeeId: 'EMP003' },
    { name: 'Maintenance Officer', email: 'maintenance@sltb.lk', password: 'Maintenance@1234', role: 'maintenance_officer', depot: 'Colombo', employeeId: 'EMP004' },
  ]);

  // Buses
  const buses = await Bus.create([
    { busNumber: 'NC-1001', registrationNumber: 'WP-BA-1001', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2019, capacity: 52, status: 'active', depot: 'Colombo', currentMileage: 48500, fuelCapacity: 180 },
    { busNumber: 'NC-1002', registrationNumber: 'WP-BA-1002', model: 'Tata LPO 1512', manufacturer: 'Tata Motors', year: 2020, capacity: 48, status: 'active', depot: 'Colombo', currentMileage: 32000, fuelCapacity: 200 },
    { busNumber: 'NC-1003', registrationNumber: 'WP-BA-1003', model: 'Lanka Ashok Leyland', manufacturer: 'Ashok Leyland', year: 2018, capacity: 52, status: 'maintenance', depot: 'Colombo', currentMileage: 67000, fuelCapacity: 180 },
    { busNumber: 'NC-1004', registrationNumber: 'WP-BA-1004', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2021, capacity: 52, status: 'active', depot: 'Gampaha', currentMileage: 18000, fuelCapacity: 180 },
    { busNumber: 'NC-1005', registrationNumber: 'WP-BA-1005', model: 'Tata LPO 1512', manufacturer: 'Tata Motors', year: 2017, capacity: 48, status: 'idle', depot: 'Kandy', currentMileage: 95000, fuelCapacity: 200 },
  ]);

  // Drivers
  await Driver.create([
    { employeeId: 'DRV001', name: 'Sunil Perera', phone: '0771234567', nic: '850123456V', licenseNumber: 'B1234567', licenseExpiry: new Date('2025-12-31'), depot: 'Colombo', shift: 'morning', status: 'active', assignedBus: buses[0]._id },
    { employeeId: 'DRV002', name: 'Kamal Silva', phone: '0779876543', nic: '890456789V', licenseNumber: 'B9876543', licenseExpiry: new Date('2026-06-30'), depot: 'Colombo', shift: 'evening', status: 'active', assignedBus: buses[1]._id },
    { employeeId: 'DRV003', name: 'Nimal Fernando', phone: '0761234567', nic: '780789012V', licenseNumber: 'B7654321', licenseExpiry: new Date('2024-03-15'), depot: 'Gampaha', shift: 'morning', status: 'active' },
    { employeeId: 'DRV004', name: 'Asanka Bandara', phone: '0712345678', nic: '920345678V', licenseNumber: 'B2345678', licenseExpiry: new Date('2027-01-20'), depot: 'Kandy', shift: 'night', status: 'on_leave' },
  ]);

  // Routes
  await Route.create([
    {
      routeNumber: 'R001',
      name: 'Colombo Fort — Kandy',
      origin: 'Colombo Fort',
      destination: 'Kandy',
      totalDistance: 115.5,
      estimatedDuration: 180,
      status: 'active',
      type: 'inter_city',
      depot: 'Colombo',
      stops: [
        { name: 'Colombo Fort', order: 1 },
        { name: 'Kelaniya', order: 2, distanceFromPrev: 12, timeFromPrev: 25 },
        { name: 'Ambepussa', order: 3, distanceFromPrev: 45, timeFromPrev: 65 },
        { name: 'Kegalle', order: 4, distanceFromPrev: 25, timeFromPrev: 40 },
        { name: 'Kandy', order: 5, distanceFromPrev: 33.5, timeFromPrev: 50 },
      ],
      assignedBuses: [buses[0]._id],
    },
    {
      routeNumber: 'R002',
      name: 'Colombo — Gampaha',
      origin: 'Colombo',
      destination: 'Gampaha',
      totalDistance: 30,
      estimatedDuration: 60,
      status: 'active',
      type: 'local',
      depot: 'Colombo',
      stops: [
        { name: 'Colombo', order: 1 },
        { name: 'Wattala', order: 2, distanceFromPrev: 10, timeFromPrev: 20 },
        { name: 'Ja-Ela', order: 3, distanceFromPrev: 8, timeFromPrev: 15 },
        { name: 'Gampaha', order: 4, distanceFromPrev: 12, timeFromPrev: 25 },
      ],
      assignedBuses: [buses[1]._id],
    },
  ]);

  console.log('✅ Seed complete!');
  console.log('\n📌 Login Credentials:');
  console.log('   Super Admin:  admin@sltb.lk / Admin@1234');
  console.log('   Manager:      manager@sltb.lk / Manager@1234');
  console.log('   Scheduler:    scheduler@sltb.lk / Scheduler@1234');
  process.exit(0);
};

seed().catch((err) => { console.error(err); process.exit(1); });

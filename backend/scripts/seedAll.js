const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: require('path').join(__dirname, '../.env') });

const User = require('../models/User');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const FuelLog = require('../models/FuelLog');

const seed = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('🌱 Connected to MongoDB. Seeding all collections...\n');

  // Clear all collections
  await Promise.all([
    Bus.deleteMany({}),
    Driver.deleteMany({}),
    Route.deleteMany({}),
    Schedule.deleteMany({}),
    MaintenanceRecord.deleteMany({}),
    FuelLog.deleteMany({}),
  ]);
  console.log('🗑️  Cleared existing data (users preserved)');

  // ── USERS ──────────────────────────────────────────────
  let adminUser = await User.findOne({ role: 'super_admin' });
  if (!adminUser) {
    const users = await User.create([
      { name: 'Super Admin', email: 'admin@sltb.lk', password: 'Admin@1234', role: 'super_admin', depot: 'Colombo', employeeId: 'EMP001' },
      { name: 'Depot Manager', email: 'manager@sltb.lk', password: 'Manager@1234', role: 'depot_manager', depot: 'Colombo', employeeId: 'EMP002' },
      { name: 'Scheduler Officer', email: 'scheduler@sltb.lk', password: 'Scheduler@1234', role: 'scheduler_officer', depot: 'Colombo', employeeId: 'EMP003' },
      { name: 'Maintenance Officer', email: 'maintenance@sltb.lk', password: 'Maintenance@1234', role: 'maintenance_officer', depot: 'Colombo', employeeId: 'EMP004' },
    ]);
    adminUser = users[0];
    console.log('👤 Users created');
  } else {
    console.log('👤 Users already exist — skipped');
  }

  // ── BUSES ──────────────────────────────────────────────
  const buses = await Bus.create([
    { busNumber: 'NC-1001', registrationNumber: 'WP-BA-1001', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2019, capacity: 52, status: 'active', depot: 'Colombo', currentMileage: 48500, fuelCapacity: 180, currentFuelLevel: 120, fuelType: 'diesel' },
    { busNumber: 'NC-1002', registrationNumber: 'WP-BA-1002', model: 'Tata LPO 1512', manufacturer: 'Tata Motors', year: 2020, capacity: 48, status: 'active', depot: 'Colombo', currentMileage: 32000, fuelCapacity: 200, currentFuelLevel: 160, fuelType: 'diesel' },
    { busNumber: 'NC-1003', registrationNumber: 'WP-BA-1003', model: 'Lanka Ashok Leyland', manufacturer: 'Ashok Leyland', year: 2018, capacity: 52, status: 'maintenance', depot: 'Colombo', currentMileage: 67000, fuelCapacity: 180, currentFuelLevel: 40, fuelType: 'diesel' },
    { busNumber: 'NC-1004', registrationNumber: 'WP-BA-1004', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2021, capacity: 52, status: 'active', depot: 'Gampaha', currentMileage: 18000, fuelCapacity: 180, currentFuelLevel: 90, fuelType: 'diesel' },
    { busNumber: 'NC-1005', registrationNumber: 'WP-BA-1005', model: 'Tata LPO 1512', manufacturer: 'Tata Motors', year: 2017, capacity: 48, status: 'idle', depot: 'Kandy', currentMileage: 95000, fuelCapacity: 200, currentFuelLevel: 50, fuelType: 'diesel' },
    { busNumber: 'NC-1006', registrationNumber: 'SP-BA-2001', model: 'Isuzu NQR', manufacturer: 'Isuzu', year: 2022, capacity: 40, status: 'active', depot: 'Galle', currentMileage: 9500, fuelCapacity: 150, currentFuelLevel: 130, fuelType: 'diesel' },
    { busNumber: 'NC-1007', registrationNumber: 'CP-BA-3001', model: 'Ashok Leyland Viking', manufacturer: 'Ashok Leyland', year: 2016, capacity: 52, status: 'out_of_service', depot: 'Kandy', currentMileage: 138000, fuelCapacity: 180, currentFuelLevel: 0, fuelType: 'diesel' },
    { busNumber: 'NC-1008', registrationNumber: 'WP-BA-1008', model: 'Tata LPO 1512', manufacturer: 'Tata Motors', year: 2023, capacity: 48, status: 'active', depot: 'Colombo', currentMileage: 4200, fuelCapacity: 200, currentFuelLevel: 180, fuelType: 'diesel' },
  ]);
  console.log(`🚌 ${buses.length} buses created`);

  // ── DRIVERS ──────────────────────────────────────────────
  const drivers = await Driver.create([
    { employeeId: 'DRV001', name: 'Sunil Perera', phone: '0771234567', nic: '850123456V', licenseNumber: 'B1234567', licenseExpiry: new Date('2026-12-31'), depot: 'Colombo', shift: 'morning', status: 'active', assignedBus: buses[0]._id, experience: 8 },
    { employeeId: 'DRV002', name: 'Kamal Silva', phone: '0779876543', nic: '890456789V', licenseNumber: 'B9876543', licenseExpiry: new Date('2027-06-30'), depot: 'Colombo', shift: 'evening', status: 'active', assignedBus: buses[1]._id, experience: 5 },
    { employeeId: 'DRV003', name: 'Nimal Fernando', phone: '0761234567', nic: '780789012V', licenseNumber: 'B7654321', licenseExpiry: new Date('2025-08-15'), depot: 'Gampaha', shift: 'morning', status: 'active', assignedBus: buses[3]._id, experience: 12 },
    { employeeId: 'DRV004', name: 'Asanka Bandara', phone: '0712345678', nic: '920345678V', licenseNumber: 'B2345678', licenseExpiry: new Date('2028-01-20'), depot: 'Kandy', shift: 'night', status: 'on_leave', experience: 3 },
    { employeeId: 'DRV005', name: 'Chaminda Rathnayake', phone: '0751234567', nic: '800123456V', licenseNumber: 'B3456789', licenseExpiry: new Date('2026-09-10'), depot: 'Colombo', shift: 'morning', status: 'active', assignedBus: buses[7]._id, experience: 10 },
    { employeeId: 'DRV006', name: 'Roshan Jayawardena', phone: '0763456789', nic: '910234567V', licenseNumber: 'B4567890', licenseExpiry: new Date('2027-03-25'), depot: 'Galle', shift: 'morning', status: 'active', assignedBus: buses[5]._id, experience: 6 },
    { employeeId: 'DRV007', name: 'Pradeep Dissanayake', phone: '0778901234', nic: '870345678V', licenseNumber: 'B5678901', licenseExpiry: new Date('2025-11-30'), depot: 'Kandy', shift: 'evening', status: 'inactive', experience: 9 },
  ]);
  console.log(`👨‍✈️  ${drivers.length} drivers created`);

  // ── ROUTES ──────────────────────────────────────────────
  const routes = await Route.create([
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
      onTimePerformance: 87,
      totalTripsCompleted: 324,
      stops: [
        { name: 'Colombo Fort', order: 1 },
        { name: 'Kelaniya', order: 2, distanceFromPrev: 12, timeFromPrev: 25 },
        { name: 'Ambepussa', order: 3, distanceFromPrev: 45, timeFromPrev: 65 },
        { name: 'Kegalle', order: 4, distanceFromPrev: 25, timeFromPrev: 40 },
        { name: 'Kandy', order: 5, distanceFromPrev: 33.5, timeFromPrev: 50 },
      ],
      assignedBuses: [buses[0]._id, buses[2]._id],
      assignedDrivers: [drivers[0]._id],
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
      onTimePerformance: 92,
      totalTripsCompleted: 518,
      stops: [
        { name: 'Colombo', order: 1 },
        { name: 'Wattala', order: 2, distanceFromPrev: 10, timeFromPrev: 20 },
        { name: 'Ja-Ela', order: 3, distanceFromPrev: 8, timeFromPrev: 15 },
        { name: 'Gampaha', order: 4, distanceFromPrev: 12, timeFromPrev: 25 },
      ],
      assignedBuses: [buses[1]._id],
      assignedDrivers: [drivers[1]._id],
    },
    {
      routeNumber: 'R003',
      name: 'Kandy — Nuwara Eliya',
      origin: 'Kandy',
      destination: 'Nuwara Eliya',
      totalDistance: 78,
      estimatedDuration: 150,
      status: 'active',
      type: 'inter_city',
      depot: 'Kandy',
      onTimePerformance: 75,
      totalTripsCompleted: 186,
      stops: [
        { name: 'Kandy', order: 1 },
        { name: 'Peradeniya', order: 2, distanceFromPrev: 5, timeFromPrev: 10 },
        { name: 'Gampola', order: 3, distanceFromPrev: 18, timeFromPrev: 35 },
        { name: 'Nawalapitiya', order: 4, distanceFromPrev: 20, timeFromPrev: 40 },
        { name: 'Nuwara Eliya', order: 5, distanceFromPrev: 35, timeFromPrev: 65 },
      ],
      assignedBuses: [buses[4]._id],
      assignedDrivers: [drivers[3]._id],
    },
    {
      routeNumber: 'R004',
      name: 'Colombo — Galle Express',
      origin: 'Colombo',
      destination: 'Galle',
      totalDistance: 119,
      estimatedDuration: 120,
      status: 'active',
      type: 'express',
      depot: 'Galle',
      onTimePerformance: 95,
      totalTripsCompleted: 412,
      stops: [
        { name: 'Colombo', order: 1 },
        { name: 'Moratuwa', order: 2, distanceFromPrev: 18, timeFromPrev: 25 },
        { name: 'Panadura', order: 3, distanceFromPrev: 10, timeFromPrev: 15 },
        { name: 'Kalutara', order: 4, distanceFromPrev: 15, timeFromPrev: 20 },
        { name: 'Aluthgama', order: 5, distanceFromPrev: 22, timeFromPrev: 25 },
        { name: 'Galle', order: 6, distanceFromPrev: 54, timeFromPrev: 35 },
      ],
      assignedBuses: [buses[5]._id],
      assignedDrivers: [drivers[5]._id],
    },
    {
      routeNumber: 'R005',
      name: 'Colombo — Kurunegala',
      origin: 'Colombo',
      destination: 'Kurunegala',
      totalDistance: 94,
      estimatedDuration: 120,
      status: 'active',
      type: 'local',
      depot: 'Colombo',
      onTimePerformance: 82,
      totalTripsCompleted: 267,
      stops: [
        { name: 'Colombo', order: 1 },
        { name: 'Kelaniya', order: 2, distanceFromPrev: 12, timeFromPrev: 20 },
        { name: 'Nittambuwa', order: 3, distanceFromPrev: 30, timeFromPrev: 40 },
        { name: 'Kurunegala', order: 4, distanceFromPrev: 52, timeFromPrev: 60 },
      ],
      assignedBuses: [buses[7]._id],
      assignedDrivers: [drivers[4]._id],
    },
  ]);
  console.log(`🗺️  ${routes.length} routes created`);

  // ── SCHEDULES ──────────────────────────────────────────────
  const today = new Date();
  const d = (offsetDays) => { const dt = new Date(today); dt.setDate(dt.getDate() + offsetDays); return dt; };

  const schedules = await Schedule.create([
    {
      scheduleCode: 'SCH-R001-AM',
      title: 'Colombo Fort — Kandy Morning Express',
      route: routes[0]._id,
      type: 'daily',
      effectiveFrom: d(-30),
      effectiveTo: d(60),
      status: 'active',
      depot: 'Colombo',
      operatingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: false },
      trips: [
        { departureTime: '05:30', arrivalTime: '08:30', bus: buses[0]._id, driver: drivers[0]._id, status: 'scheduled' },
        { departureTime: '08:00', arrivalTime: '11:00', bus: buses[0]._id, driver: drivers[0]._id, status: 'scheduled' },
        { departureTime: '13:00', arrivalTime: '16:00', bus: buses[0]._id, driver: drivers[0]._id, status: 'scheduled' },
      ],
      createdBy: adminUser._id,
    },
    {
      scheduleCode: 'SCH-R002-ALL',
      title: 'Colombo — Gampaha Daily Service',
      route: routes[1]._id,
      type: 'daily',
      effectiveFrom: d(-60),
      effectiveTo: d(90),
      status: 'active',
      depot: 'Colombo',
      operatingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
      trips: [
        { departureTime: '06:00', arrivalTime: '07:00', bus: buses[1]._id, driver: drivers[1]._id, status: 'scheduled' },
        { departureTime: '08:30', arrivalTime: '09:30', bus: buses[1]._id, driver: drivers[1]._id, status: 'scheduled' },
        { departureTime: '12:00', arrivalTime: '13:00', bus: buses[1]._id, driver: drivers[1]._id, status: 'scheduled' },
        { departureTime: '16:00', arrivalTime: '17:00', bus: buses[1]._id, driver: drivers[1]._id, status: 'scheduled' },
        { departureTime: '19:00', arrivalTime: '20:00', bus: buses[1]._id, driver: drivers[1]._id, status: 'scheduled' },
      ],
      createdBy: adminUser._id,
    },
    {
      scheduleCode: 'SCH-R003-WD',
      title: 'Kandy — Nuwara Eliya Weekday',
      route: routes[2]._id,
      type: 'daily',
      effectiveFrom: d(-15),
      effectiveTo: d(45),
      status: 'active',
      depot: 'Kandy',
      operatingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
      trips: [
        { departureTime: '07:00', arrivalTime: '09:30', bus: buses[4]._id, driver: drivers[6]._id, status: 'scheduled' },
        { departureTime: '14:00', arrivalTime: '16:30', bus: buses[4]._id, driver: drivers[6]._id, status: 'scheduled' },
      ],
      createdBy: adminUser._id,
    },
    {
      scheduleCode: 'SCH-R004-EXP',
      title: 'Colombo — Galle Express Daily',
      route: routes[3]._id,
      type: 'daily',
      effectiveFrom: d(-45),
      effectiveTo: d(120),
      status: 'active',
      depot: 'Galle',
      operatingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: true, sunday: true },
      trips: [
        { departureTime: '06:30', arrivalTime: '08:30', bus: buses[5]._id, driver: drivers[5]._id, status: 'scheduled' },
        { departureTime: '10:00', arrivalTime: '12:00', bus: buses[5]._id, driver: drivers[5]._id, status: 'scheduled' },
        { departureTime: '15:30', arrivalTime: '17:30', bus: buses[5]._id, driver: drivers[5]._id, status: 'scheduled' },
      ],
      createdBy: adminUser._id,
    },
    {
      scheduleCode: 'SCH-R005-AM',
      title: 'Colombo — Kurunegala Morning',
      route: routes[4]._id,
      type: 'daily',
      effectiveFrom: d(-20),
      effectiveTo: d(40),
      status: 'active',
      depot: 'Colombo',
      operatingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
      trips: [
        { departureTime: '05:45', arrivalTime: '07:45', bus: buses[7]._id, driver: drivers[4]._id, status: 'scheduled' },
        { departureTime: '11:00', arrivalTime: '13:00', bus: buses[7]._id, driver: drivers[4]._id, status: 'scheduled' },
        { departureTime: '17:00', arrivalTime: '19:00', bus: buses[7]._id, driver: drivers[4]._id, status: 'scheduled' },
      ],
      createdBy: adminUser._id,
    },
    {
      scheduleCode: 'SCH-R001-OLD',
      title: 'Colombo Fort — Kandy (Previous Quarter)',
      route: routes[0]._id,
      type: 'daily',
      effectiveFrom: d(-120),
      effectiveTo: d(-31),
      status: 'expired',
      depot: 'Colombo',
      operatingDays: { monday: true, tuesday: true, wednesday: true, thursday: true, friday: true, saturday: false, sunday: false },
      trips: [
        { departureTime: '06:00', arrivalTime: '09:00', bus: buses[2]._id, driver: drivers[0]._id, status: 'completed' },
      ],
      createdBy: adminUser._id,
    },
  ]);
  console.log(`📅 ${schedules.length} schedules created`);

  // ── MAINTENANCE RECORDS ──────────────────────────────────────────────
  const maintenanceRecords = await MaintenanceRecord.create([
    {
      bus: buses[0]._id,
      type: 'routine',
      title: 'Engine Oil & Filter Change',
      description: 'Routine engine oil change with filter replacement at 48,500 km service interval.',
      status: 'completed',
      scheduledDate: d(-45),
      completedDate: d(-43),
      mileageAtService: 48500,
      nextServiceMileage: 53500,
      nextServiceDate: d(75),
      cost: 12500,
      laborCost: 3500,
      partsCost: 9000,
      spareParts: [
        { name: 'Engine Oil 15W-40 (5L)', quantity: 3, unitCost: 2200, partNumber: 'OIL-15W40' },
        { name: 'Oil Filter', quantity: 1, unitCost: 1400, partNumber: 'FLT-OIL-001' },
      ],
      technician: 'Anura Kumara',
      workshop: 'SLTB Colombo Workshop',
      priority: 'medium',
      createdBy: adminUser._id,
    },
    {
      bus: buses[1]._id,
      type: 'repair',
      title: 'Brake Pad Replacement — Front Axle',
      description: 'Front brake pads worn below minimum thickness. Replaced all four front pads.',
      status: 'completed',
      scheduledDate: d(-20),
      completedDate: d(-18),
      mileageAtService: 32000,
      nextServiceMileage: 52000,
      cost: 38500,
      laborCost: 8500,
      partsCost: 30000,
      spareParts: [
        { name: 'Front Brake Pad Set', quantity: 2, unitCost: 12000, partNumber: 'BRK-FP-TATA' },
        { name: 'Brake Caliper Grease', quantity: 1, unitCost: 600, partNumber: 'GRS-BRK-001' },
      ],
      technician: 'Priya Senaratne',
      workshop: 'SLTB Colombo Workshop',
      priority: 'high',
      createdBy: adminUser._id,
    },
    {
      bus: buses[2]._id,
      type: 'repair',
      title: 'AC System Compressor Overhaul',
      description: 'AC compressor seized. Full compressor replacement and system recharge required.',
      status: 'in_progress',
      scheduledDate: d(-5),
      mileageAtService: 67000,
      cost: 95000,
      laborCost: 20000,
      partsCost: 75000,
      spareParts: [
        { name: 'AC Compressor Assembly', quantity: 1, unitCost: 65000, partNumber: 'AC-COMP-AL' },
        { name: 'Refrigerant R134a (1kg)', quantity: 2, unitCost: 3500, partNumber: 'REF-R134A' },
      ],
      technician: 'Sampath Wijesinghe',
      workshop: 'SLTB Colombo Workshop',
      priority: 'high',
      createdBy: adminUser._id,
    },
    {
      bus: buses[2]._id,
      type: 'inspection',
      title: 'Annual Safety Inspection',
      description: 'Mandatory annual safety inspection covering brakes, lights, tyres, and body.',
      status: 'scheduled',
      scheduledDate: d(7),
      mileageAtService: 67000,
      cost: 15000,
      laborCost: 15000,
      partsCost: 0,
      technician: 'Transport Board Inspector',
      workshop: 'RMV Inspection Centre — Colombo',
      priority: 'critical',
      createdBy: adminUser._id,
    },
    {
      bus: buses[3]._id,
      type: 'preventive',
      title: 'Tyre Rotation & Pressure Check',
      description: 'Scheduled tyre rotation, pressure adjustment and tread depth measurement.',
      status: 'completed',
      scheduledDate: d(-30),
      completedDate: d(-29),
      mileageAtService: 18000,
      nextServiceMileage: 26000,
      cost: 4500,
      laborCost: 4500,
      partsCost: 0,
      technician: 'Lalith Perera',
      workshop: 'Gampaha Depot Workshop',
      priority: 'low',
      createdBy: adminUser._id,
    },
    {
      bus: buses[4]._id,
      type: 'repair',
      title: 'Transmission Fluid Leak — Gearbox Seal',
      description: 'Gearbox output shaft seal leaking. Seal replacement and fluid top-up.',
      status: 'scheduled',
      scheduledDate: d(3),
      mileageAtService: 95000,
      cost: 28000,
      laborCost: 12000,
      partsCost: 16000,
      spareParts: [
        { name: 'Output Shaft Seal Kit', quantity: 1, unitCost: 8500, partNumber: 'SEL-GBOX-001' },
        { name: 'Transmission Fluid ATF (5L)', quantity: 2, unitCost: 3750, partNumber: 'FLD-ATF-5L' },
      ],
      technician: 'Mahesh Bandara',
      workshop: 'Kandy Regional Workshop',
      priority: 'high',
      createdBy: adminUser._id,
    },
    {
      bus: buses[5]._id,
      type: 'routine',
      title: 'First Service — 10,000 km',
      description: 'First scheduled service at 10,000 km. Oil change, filter replacement, full inspection.',
      status: 'scheduled',
      scheduledDate: d(5),
      mileageAtService: 9500,
      nextServiceMileage: 20000,
      cost: 18000,
      laborCost: 5000,
      partsCost: 13000,
      spareParts: [
        { name: 'Engine Oil 15W-40 (5L)', quantity: 3, unitCost: 2200 },
        { name: 'Oil Filter', quantity: 1, unitCost: 1400 },
        { name: 'Air Filter', quantity: 1, unitCost: 3800 },
        { name: 'Fuel Filter', quantity: 1, unitCost: 2400 },
      ],
      technician: 'Isuzu Authorized Technician',
      workshop: 'Galle Service Centre',
      priority: 'medium',
      createdBy: adminUser._id,
    },
    {
      bus: buses[7]._id,
      type: 'routine',
      title: 'Engine Oil Change & Multi-Point Inspection',
      description: 'Routine oil change with 25-point vehicle inspection checklist.',
      status: 'completed',
      scheduledDate: d(-10),
      completedDate: d(-9),
      mileageAtService: 4200,
      nextServiceMileage: 9200,
      cost: 11500,
      laborCost: 3000,
      partsCost: 8500,
      spareParts: [
        { name: 'Engine Oil 15W-40 (5L)', quantity: 3, unitCost: 2200 },
        { name: 'Oil Filter', quantity: 1, unitCost: 1400 },
      ],
      technician: 'Anura Kumara',
      workshop: 'SLTB Colombo Workshop',
      priority: 'low',
      createdBy: adminUser._id,
    },
    {
      bus: buses[0]._id,
      type: 'emergency',
      title: 'Radiator Hose Burst — Roadside',
      description: 'Upper radiator hose burst during route R001. Emergency repair at roadside, temporary fix then towed to workshop.',
      status: 'completed',
      scheduledDate: d(-60),
      completedDate: d(-59),
      mileageAtService: 46200,
      cost: 8500,
      laborCost: 4000,
      partsCost: 4500,
      spareParts: [
        { name: 'Upper Radiator Hose', quantity: 1, unitCost: 3800, partNumber: 'HOS-RAD-UP' },
        { name: 'Hose Clamps Set', quantity: 1, unitCost: 700 },
      ],
      technician: 'Roadside Assistance Team',
      workshop: 'SLTB Emergency Unit',
      priority: 'critical',
      createdBy: adminUser._id,
    },
  ]);
  console.log(`🔧 ${maintenanceRecords.length} maintenance records created`);

  // ── FUEL LOGS ──────────────────────────────────────────────
  const fuelLogs = [];
  const fuelData = [
    // bus[0] NC-1001
    { bus: buses[0], driver: drivers[0], daysAgo: 55, qty: 120, prev: 46200, curr: 47640, price: 320, station: 'IOC Kelaniya', receipt: 'RCT-001' },
    { bus: buses[0], driver: drivers[0], daysAgo: 40, qty: 135, prev: 47640, curr: 48500, price: 320, station: 'Ceylon Petroleum Colombo 07', receipt: 'RCT-002' },
    { bus: buses[0], driver: drivers[0], daysAgo: 20, qty: 110, prev: 48500, curr: 49280, price: 325, station: 'IOC Kelaniya', receipt: 'RCT-003' },
    { bus: buses[0], driver: drivers[0], daysAgo: 5, qty: 140, prev: 49280, curr: 50120, price: 325, station: 'LAUGFS Kiribathgoda', receipt: 'RCT-004' },
    // bus[1] NC-1002
    { bus: buses[1], driver: drivers[1], daysAgo: 45, qty: 160, prev: 30500, curr: 31480, price: 320, station: 'Ceylon Petroleum Colombo 07', receipt: 'RCT-005' },
    { bus: buses[1], driver: drivers[1], daysAgo: 25, qty: 145, prev: 31480, curr: 32000, price: 320, station: 'IOC Colombo 03', receipt: 'RCT-006' },
    { bus: buses[1], driver: drivers[1], daysAgo: 8, qty: 155, prev: 32000, curr: 32870, price: 325, station: 'LAUGFS Wattala', receipt: 'RCT-007' },
    // bus[3] NC-1004
    { bus: buses[3], driver: drivers[2], daysAgo: 35, qty: 90, prev: 17200, curr: 17890, price: 320, station: 'IOC Gampaha', receipt: 'RCT-008' },
    { bus: buses[3], driver: drivers[2], daysAgo: 15, qty: 95, prev: 17890, curr: 18000, price: 325, station: 'Ceylon Petroleum Gampaha', receipt: 'RCT-009' },
    // bus[5] NC-1006
    { bus: buses[5], driver: drivers[5], daysAgo: 28, qty: 80, prev: 8900, curr: 9500, price: 320, station: 'LAUGFS Galle', receipt: 'RCT-010' },
    // bus[7] NC-1008
    { bus: buses[7], driver: drivers[4], daysAgo: 12, qty: 130, prev: 3400, curr: 4200, price: 325, station: 'IOC Borella', receipt: 'RCT-011' },
    // bus[4] NC-1005
    { bus: buses[4], driver: drivers[6], daysAgo: 50, qty: 170, prev: 93500, curr: 94800, price: 320, station: 'Ceylon Petroleum Kandy', receipt: 'RCT-012' },
    { bus: buses[4], driver: drivers[6], daysAgo: 18, qty: 160, prev: 94800, curr: 95000, price: 325, station: 'IOC Kandy', receipt: 'RCT-013' },
  ];

  for (const f of fuelData) {
    const date = d(-f.daysAgo);
    const log = new FuelLog({
      bus: f.bus._id,
      driver: f.driver._id,
      date,
      quantity: f.qty,
      pricePerLiter: f.price,
      totalCost: parseFloat((f.qty * f.price).toFixed(2)),
      mileageAtFueling: f.curr,
      previousMileage: f.prev,
      efficiency: parseFloat(((f.curr - f.prev) / f.qty).toFixed(2)),
      fuelStation: f.station,
      fuelType: 'diesel',
      depot: f.bus.depot,
      receiptNumber: f.receipt,
      createdBy: adminUser._id,
    });
    await log.save();
    fuelLogs.push(log);
  }
  console.log(`⛽ ${fuelLogs.length} fuel logs created`);

  // ── SUMMARY ──────────────────────────────────────────────
  console.log('\n✅ Database seeded successfully!\n');
  console.log('📊 Summary:');
  console.log(`   🚌 Buses:               ${buses.length}`);
  console.log(`   👨‍✈️  Drivers:             ${drivers.length}`);
  console.log(`   🗺️  Routes:              ${routes.length}`);
  console.log(`   📅 Schedules:           ${schedules.length}`);
  console.log(`   🔧 Maintenance Records: ${maintenanceRecords.length}`);
  console.log(`   ⛽ Fuel Logs:           ${fuelLogs.length}`);
  console.log('\n📌 Login Credentials:');
  console.log('   Super Admin:  admin@sltb.lk     / Admin@1234');
  console.log('   Manager:      manager@sltb.lk   / Manager@1234');
  console.log('   Scheduler:    scheduler@sltb.lk / Scheduler@1234');
  console.log('   Maintenance:  maintenance@sltb.lk / Maintenance@1234');

  process.exit(0);
};

seed().catch((err) => { console.error('❌ Seed failed:', err.message); process.exit(1); });

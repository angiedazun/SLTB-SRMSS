const express = require('express');
const router = express.Router();
const Driver = require('../models/Driver');
const User = require('../models/User');
const Schedule = require('../models/Schedule');
const Bus = require('../models/Bus');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const resolveDriverByUser = async (user) => {
  let driver = await Driver.findOne({ user: user._id });
  if (!driver && user.employeeId) driver = await Driver.findOne({ employeeId: user.employeeId });
  if (!driver && user.email) driver = await Driver.findOne({ email: user.email.toLowerCase() });
  if (!driver && user.name) {
    driver = await Driver.findOne({
      name: { $regex: `^${String(user.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });
  }

  if (driver && String(driver.user || '') !== String(user._id)) {
    driver.user = user._id;
    if (!driver.email && user.email) driver.email = user.email;
    if (!driver.employeeId && user.employeeId) driver.employeeId = user.employeeId;
    await driver.save({ validateBeforeSave: false });
  }

  return driver;
};

const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const mapDriverSchedules = (schedules, driverId) => schedules
  .map((schedule) => {
    const trips = (schedule.trips || []).filter((trip) => {
      if (!trip.driver) return false;
      const tripDriverId = typeof trip.driver === 'object' ? String(trip.driver._id) : String(trip.driver);
      return tripDriverId === String(driverId);
    });

    return trips.length
      ? {
          _id: schedule._id,
          title: schedule.title,
          scheduleCode: schedule.scheduleCode,
          route: schedule.route,
          effectiveFrom: schedule.effectiveFrom,
          effectiveTo: schedule.effectiveTo,
          status: schedule.status,
          trips,
        }
      : null;
  })
  .filter(Boolean);

// Strip empty/invalid values so they don't crash Mongoose casting or required checks
const sanitizeDriverPayload = (payload) => {
  const cleaned = { ...payload };
  // ObjectId reference fields: an empty string is not a valid ObjectId -> remove it
  ['assignedBus', 'assignedRoute', 'user'].forEach((field) => {
    if (cleaned[field] === '' || cleaned[field] === null) delete cleaned[field];
  });
  // Trim plain string fields and drop empties
  ['name', 'email', 'phone', 'nic', 'licenseNumber', 'depot', 'employeeId'].forEach((field) => {
    if (typeof cleaned[field] === 'string') {
      cleaned[field] = cleaned[field].trim();
      if (cleaned[field] === '') delete cleaned[field];
    }
  });
  return cleaned;
};

const generateEmployeeId = () => `DRV-${Date.now().toString(36).toUpperCase()}`;

const syncDriverBusAssignment = async (driverId, assignedBus) => {
  await Bus.updateMany({ assignedDriver: driverId, _id: { $ne: assignedBus || null } }, { $unset: { assignedDriver: '' } });
  if (assignedBus) {
    await Bus.findByIdAndUpdate(assignedBus, { assignedDriver: driverId });
  }
};

// GET /api/drivers
router.get('/', authorize('super_admin', 'depot_manager', 'scheduler_officer', 'maintenance_officer'), async (req, res) => {
  try {
    const { page = 1, limit = 20, status, depot, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (depot) query.depot = depot;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
      { licenseNumber: { $regex: search, $options: 'i' } },
      { nic: { $regex: search, $options: 'i' } },
    ];

    const total = await Driver.countDocuments(query);
    const drivers = await Driver.find(query)
      .populate('assignedBus', 'busNumber registrationNumber')
      .populate('assignedRoute', 'routeNumber name')
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ drivers, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/drivers/expiring-licenses
router.get('/expiring-licenses', authorize('super_admin', 'depot_manager', 'scheduler_officer', 'maintenance_officer'), async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const drivers = await Driver.find({
      licenseExpiry: { $lte: thirtyDaysFromNow },
      status: { $ne: 'inactive' },
    }).select('name employeeId licenseNumber licenseExpiry');
    res.json({ drivers });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/drivers/analytics
router.get('/analytics', authorize('super_admin', 'depot_manager', 'scheduler_officer', 'maintenance_officer'), async (req, res) => {
  try {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [statusBreakdown, licenseWarnings, shiftBreakdown] = await Promise.all([
      Driver.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Driver.countDocuments({ licenseExpiry: { $lte: thirtyDays }, status: { $ne: 'inactive' } }),
      Driver.aggregate([{ $group: { _id: '$shift', count: { $sum: 1 } } }]),
    ]);
    const statusMap = {};
    statusBreakdown.forEach((row) => { statusMap[row._id] = row.count; });
    res.json({
      active: statusMap.active || 0,
      onLeave: statusMap.on_leave || 0,
      suspended: statusMap.suspended || 0,
      inactive: statusMap.inactive || 0,
      licenseWarnings,
      statusBreakdown,
      shiftBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/drivers/me
router.get('/me', authorize('driver'), async (req, res) => {
  try {
    const driver = await resolveDriverByUser(req.user);
    if (!driver) {
      return res.json({
        driver: {
          _id: `user-${req.user._id}`,
          user: req.user._id,
          name: req.user.name,
          email: req.user.email,
          phone: req.user.phone,
          depot: req.user.depot,
          employeeId: req.user.employeeId,
          shift: 'morning',
          status: req.user.isActive ? 'active' : 'inactive',
          assignedBus: null,
          assignedRoute: null,
          _linkedProfile: false,
        },
      });
    }

    const populated = await Driver.findById(driver._id)
      .populate('assignedBus', 'busNumber registrationNumber model status')
      .populate('assignedRoute', 'routeNumber name origin destination status stops');

    res.json({ driver: populated || driver, linkedProfile: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/drivers/me/today-routes
router.get('/me/today-routes', authorize('driver'), async (req, res) => {
  try {
    const driver = await resolveDriverByUser(req.user);
    if (!driver) {
      return res.json({ date: new Date().toISOString().split('T')[0], driverId: null, schedules: [], scope: 'today' });
    }

    const today = new Date();
    const schedules = await Schedule.find({
      status: 'active',
      effectiveFrom: { $lte: today },
      $or: [{ effectiveTo: { $gte: today } }, { effectiveTo: null }],
      'trips.driver': driver._id,
    })
      .populate('route', 'routeNumber name origin destination stops')
      .populate('trips.bus', 'busNumber registrationNumber status')
      .populate('trips.driver', 'name employeeId')
      .sort({ createdAt: -1 });

    const dailyRoutes = mapDriverSchedules(schedules, driver._id);

    if (dailyRoutes.length) {
      return res.json({ date: today.toISOString().split('T')[0], driverId: driver._id, schedules: dailyRoutes, scope: 'today' });
    }

    for (let offset = 1; offset <= 14; offset += 1) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + offset);

      const upcomingSchedules = await Schedule.find({
        status: 'active',
        effectiveFrom: { $lte: targetDate },
        $or: [{ effectiveTo: { $gte: targetDate } }, { effectiveTo: null }],
        'trips.driver': driver._id,
      })
        .populate('route', 'routeNumber name origin destination stops')
        .populate('trips.bus', 'busNumber registrationNumber status')
        .populate('trips.driver', 'name employeeId')
        .sort({ effectiveFrom: 1, createdAt: -1 });

      const nextRoutes = mapDriverSchedules(upcomingSchedules, driver._id);
      if (nextRoutes.length) {
        return res.json({
          date: targetDate.toISOString().split('T')[0],
          driverId: driver._id,
          schedules: nextRoutes,
          scope: 'upcoming',
        });
      }
    }

    res.json({ date: today.toISOString().split('T')[0], driverId: driver._id, schedules: [], scope: 'today' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/drivers/me/schedules
router.get('/me/schedules', authorize('driver'), async (req, res) => {
  try {
    const driver = await resolveDriverByUser(req.user);
    if (!driver) {
      return res.json({ driverId: null, schedules: [] });
    }

    const schedules = await Schedule.find({ 'trips.driver': driver._id })
      .populate('route', 'routeNumber name origin destination stops')
      .populate('trips.bus', 'busNumber registrationNumber status')
      .populate('trips.driver', 'name employeeId')
      .sort({ effectiveFrom: 1, createdAt: -1 });

    res.json({ driverId: driver._id, schedules: mapDriverSchedules(schedules, driver._id) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/drivers/:id/status
router.patch('/:id([0-9a-fA-F]{24})/status', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const { status } = req.body;
    const driver = await Driver.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/drivers/:id
router.get('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager', 'scheduler_officer', 'maintenance_officer'), async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id)
      .populate('assignedBus', 'busNumber registrationNumber model')
      .populate('assignedRoute', 'routeNumber name origin destination');
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });
    res.json({ driver });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/drivers
router.post('/', authorize('super_admin', 'depot_manager'), async (req, res) => {
  let linkedUserId = null;
  try {
    const {
      loginUsername,
      loginPassword,
      loginEmail,
      ...rawPayload
    } = req.body;

    const driverPayload = sanitizeDriverPayload(rawPayload);
    if (!driverPayload.employeeId) driverPayload.employeeId = generateEmployeeId();

    let linkedUser = null;
    if (loginUsername || loginPassword || loginEmail) {
      if (!loginUsername || !loginPassword) {
        return res.status(400).json({ error: 'Driver login username and password are required.' });
      }

      const normalizedUsername = String(loginUsername).trim().toLowerCase();
      const normalizedEmail = String(
        loginEmail || driverPayload.email || `${normalizedUsername}@drivers.sltb.local`
      ).trim().toLowerCase();

      const [usernameExists, emailExists] = await Promise.all([
        User.findOne({ username: normalizedUsername }),
        User.findOne({ email: normalizedEmail }),
      ]);

      if (usernameExists) return res.status(409).json({ error: 'Driver login username already exists.' });
      if (emailExists) return res.status(409).json({ error: 'Driver login email already exists.' });

      linkedUser = await User.create({
        name: driverPayload.name,
        email: normalizedEmail,
        username: normalizedUsername,
        password: loginPassword,
        role: 'driver',
        phone: driverPayload.phone,
        depot: driverPayload.depot,
        employeeId: driverPayload.employeeId,
      });
      linkedUserId = linkedUser._id;

      if (!driverPayload.email) {
        driverPayload.email = normalizedEmail;
      }
    }

    const driver = await Driver.create({
      ...driverPayload,
      user: linkedUser?._id,
    });
    await syncDriverBusAssignment(driver._id, driver.assignedBus);
    res.status(201).json({ driver });
  } catch (err) {
    if (linkedUserId) {
      await User.findByIdAndDelete(linkedUserId).catch(() => {});
    }
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `A driver with this ${field} already exists.` });
    }
    if (err.name === 'ValidationError') {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ error: messages.join(' ') });
    }
    if (err.name === 'CastError') {
      return res.status(400).json({ error: `Invalid value for ${err.path}.` });
    }
    console.error('Create driver failed:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/drivers/:id
router.put('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const { loginUsername, loginPassword, loginEmail, ...rawPayload } = req.body;
    const update = sanitizeDriverPayload(rawPayload);
    const driver = await Driver.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!driver) return res.status(404).json({ error: 'Driver not found.' });
    await syncDriverBusAssignment(driver._id, driver.assignedBus);
    res.json({ driver });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      return res.status(409).json({ error: `A driver with this ${field} already exists.` });
    }
    if (err.name === 'ValidationError') {
      return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(' ') });
    }
    if (err.name === 'CastError') return res.status(400).json({ error: `Invalid value for ${err.path}.` });
    console.error('Update driver failed:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/drivers/:id
router.delete('/:id([0-9a-fA-F]{24})', authorize('super_admin'), async (req, res) => {
  try {
    await Driver.findByIdAndDelete(req.params.id);
    res.json({ message: 'Driver deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const Schedule = require('../models/Schedule');
const Route = require('../models/Route');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const DAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

const deriveOperatingDaysFromDates = (effectiveFrom, effectiveTo) => {
  const days = DAY_KEYS.reduce((acc, key) => ({ ...acc, [key]: false }), {});
  const endDate = effectiveTo || effectiveFrom;
  const cursor = new Date(effectiveFrom);

  while (cursor <= endDate) {
    days[DAY_KEYS[cursor.getDay()]] = true;
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
};

const normalizeOperatingDays = (value) => {
  if (!value) return undefined;

  if (Array.isArray(value)) {
    return DAY_KEYS.reduce((acc, key) => {
      acc[key] = value.some((day) => String(day).toLowerCase().startsWith(key.slice(0, 3)));
      return acc;
    }, {});
  }

  if (typeof value === 'object') return value;
  return undefined;
};

const normalizeTrips = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .filter((trip) => trip && trip.departureTime && trip.arrivalTime)
    .map((trip) => ({
      departureTime: trip.departureTime,
      arrivalTime: trip.arrivalTime,
      bus: trip.bus || undefined,
      driver: trip.driver || undefined,
      status: trip.status || 'scheduled',
      notes: trip.notes || undefined,
    }));
};

const buildSchedulePayload = async (payload) => {
  const routeDoc = payload.route ? await Route.findById(payload.route).select('depot') : null;

  if (payload.route && !routeDoc) {
    const error = new Error('Selected route was not found.');
    error.status = 400;
    throw error;
  }

  const effectiveFrom = payload.effectiveFrom ? new Date(payload.effectiveFrom) : new Date();
  const effectiveTo = payload.effectiveTo ? new Date(payload.effectiveTo) : null;

  if (Number.isNaN(effectiveFrom.getTime())) {
    const error = new Error('Effective From date is invalid.');
    error.status = 400;
    throw error;
  }

  if (effectiveTo && Number.isNaN(effectiveTo.getTime())) {
    const error = new Error('Effective To date is invalid.');
    error.status = 400;
    throw error;
  }

  return {
    ...payload,
    type: payload.type || 'daily',
    status: payload.status || 'active',
    effectiveFrom,
    effectiveTo: effectiveTo || effectiveFrom,
    depot: payload.depot || routeDoc?.depot,
    operatingDays: normalizeOperatingDays(payload.operatingDays) || deriveOperatingDaysFromDates(effectiveFrom, effectiveTo || effectiveFrom),
    trips: normalizeTrips(payload.trips),
  };
};

// GET /api/schedules
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, route, depot } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (route) query.route = route;
    if (depot) query.depot = depot;

    const total = await Schedule.countDocuments(query);
    const schedules = await Schedule.find(query)
      .populate('route', 'routeNumber name origin destination')
      .populate('trips.bus', 'busNumber')
      .populate('trips.driver', 'name employeeId')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ schedules, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/schedules/today
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayDay = dayNames[today.getDay()];

    const schedules = await Schedule.find({
      status: 'active',
      effectiveFrom: { $lte: today },
      $or: [{ effectiveTo: { $gte: today } }, { effectiveTo: null }],
    })
      .populate('route', 'routeNumber name origin destination')
      .populate('trips.bus', 'busNumber status')
      .populate('trips.driver', 'name');

    res.json({ schedules, date: today.toISOString().split('T')[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/schedules/stats
router.get('/stats', async (req, res) => {
  try {
    const [statusBreakdown, total] = await Promise.all([
      Schedule.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Schedule.countDocuments(),
    ]);
    const statusMap = {};
    statusBreakdown.forEach((row) => { statusMap[row._id] = row.count; });
    res.json({
      total,
      active: statusMap.active || 0,
      inactive: statusMap.inactive || 0,
      draft: statusMap.draft || 0,
      statusBreakdown,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/schedules/:id
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('route', 'routeNumber name stops origin destination')
      .populate('trips.bus', 'busNumber registrationNumber status')
      .populate('trips.driver', 'name employeeId phone')
      .populate('createdBy', 'name');
    if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });
    res.json({ schedule });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/schedules
router.post('/', authorize('super_admin', 'depot_manager', 'scheduler_officer'), async (req, res) => {
  try {
    const schedulePayload = await buildSchedulePayload(req.body);
    const schedule = await Schedule.create({ ...schedulePayload, createdBy: req.user._id });
    res.status(201).json({ schedule });
  } catch (err) {
    const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
    const message = err.name === 'ValidationError'
      ? Object.values(err.errors || {})[0]?.message || 'Schedule validation failed.'
      : err.message || 'Server error.';
    res.status(status).json({ error: message });
  }
});

// PUT /api/schedules/:id
router.put('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager', 'scheduler_officer'), async (req, res) => {
  try {
    const schedulePayload = await buildSchedulePayload(req.body);
    const schedule = await Schedule.findByIdAndUpdate(req.params.id, schedulePayload, { new: true, runValidators: true });
    if (!schedule) return res.status(404).json({ error: 'Schedule not found.' });
    res.json({ schedule });
  } catch (err) {
    const status = err.status || (err.name === 'ValidationError' ? 400 : 500);
    const message = err.name === 'ValidationError'
      ? Object.values(err.errors || {})[0]?.message || 'Schedule validation failed.'
      : err.message || 'Server error.';
    res.status(status).json({ error: message });
  }
});

// DELETE /api/schedules/:id
router.delete('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    await Schedule.findByIdAndDelete(req.params.id);
    res.json({ message: 'Schedule deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

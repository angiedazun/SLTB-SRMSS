const express = require('express');
const router = express.Router();
const Route = require('../models/Route');
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const toObjectIdList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

// Drop stops with no name (they crash required validation), then re-number order
const sanitizeRoutePayload = (payload) => {
  const cleaned = { ...payload };
  if (Array.isArray(cleaned.stops)) {
    cleaned.stops = cleaned.stops
      .filter((s) => s && typeof s.name === 'string' && s.name.trim() !== '')
      .map((s, idx) => ({ ...s, name: s.name.trim(), order: idx + 1 }));
  }
  // Empty assignment arrays are fine; strip empty-string entries just in case
  if (Array.isArray(cleaned.assignedBuses)) cleaned.assignedBuses = cleaned.assignedBuses.filter(Boolean);
  if (Array.isArray(cleaned.assignedDrivers)) cleaned.assignedDrivers = cleaned.assignedDrivers.filter(Boolean);
  return cleaned;
};

const sendRouteError = (res, err, fallback) => {
  if (err.code === 11000) return res.status(409).json({ error: 'Route number already exists.' });
  if (err.name === 'ValidationError') {
    return res.status(400).json({ error: Object.values(err.errors).map((e) => e.message).join(' ') });
  }
  if (err.name === 'CastError') return res.status(400).json({ error: `Invalid value for ${err.path}.` });
  console.error(fallback, err);
  return res.status(500).json({ error: 'Server error.' });
};

const syncRouteAssignments = async (routeId, assignedBuses, assignedDrivers) => {
  const busIds = toObjectIdList(assignedBuses);
  const driverIds = toObjectIdList(assignedDrivers);

  await Promise.all([
    Bus.updateMany({ assignedRoute: routeId, _id: { $nin: busIds } }, { $unset: { assignedRoute: '' } }),
    Driver.updateMany({ assignedRoute: routeId, _id: { $nin: driverIds } }, { $unset: { assignedRoute: '' } }),
    busIds.length ? Bus.updateMany({ _id: { $in: busIds } }, { $set: { assignedRoute: routeId } }) : Promise.resolve(),
    driverIds.length ? Driver.updateMany({ _id: { $in: driverIds } }, { $set: { assignedRoute: routeId } }) : Promise.resolve(),
  ]);
};

// GET /api/routes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, depot, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (depot) query.depot = depot;
    if (search) query.$or = [
      { routeNumber: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { origin: { $regex: search, $options: 'i' } },
      { destination: { $regex: search, $options: 'i' } },
    ];

    const total = await Route.countDocuments(query);
    const routes = await Route.find(query)
      .populate('assignedBuses', 'busNumber status')
      .populate('assignedDrivers', 'name employeeId status')
      .sort({ routeNumber: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ routes, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/routes/active
router.get('/active', async (req, res) => {
  try {
    const routes = await Route.find({ status: 'active' }).select('routeNumber name origin destination');
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/routes/analytics
router.get('/analytics', async (req, res) => {
  try {
    const [statusBreakdown, typeBreakdown, total, avgPerformance] = await Promise.all([
      Route.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Route.aggregate([{ $group: { _id: '$type', count: { $sum: 1 } } }]),
      Route.countDocuments(),
      Route.aggregate([
        { $match: { status: 'active' } },
        { $group: { _id: null, avgOnTime: { $avg: '$onTimePerformance' }, totalTrips: { $sum: '$totalTripsCompleted' } } },
      ]),
    ]);
    const statusMap = {};
    statusBreakdown.forEach((row) => { statusMap[row._id] = row.count; });
    res.json({
      total,
      active: statusMap.active || 0,
      inactive: statusMap.inactive || 0,
      statusBreakdown,
      typeBreakdown,
      avgOnTimePerformance: Math.round(avgPerformance[0]?.avgOnTime || 0),
      totalTrips: avgPerformance[0]?.totalTrips || 0,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/routes/:id
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const route = await Route.findById(req.params.id)
      .populate('assignedBuses', 'busNumber registrationNumber status model')
      .populate('assignedDrivers', 'name employeeId status shift')
      .populate('createdBy', 'name email');
    if (!route) return res.status(404).json({ error: 'Route not found.' });
    res.json({ route });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/routes
router.post('/', authorize('super_admin', 'depot_manager', 'scheduler_officer'), async (req, res) => {
  try {
    const payload = sanitizeRoutePayload(req.body);
    const route = await Route.create({ ...payload, createdBy: req.user._id });
    await syncRouteAssignments(route._id, route.assignedBuses, route.assignedDrivers);
    res.status(201).json({ route });
  } catch (err) {
    sendRouteError(res, err, 'Create route failed:');
  }
});

// PUT /api/routes/:id
router.put('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager', 'scheduler_officer'), async (req, res) => {
  try {
    const payload = sanitizeRoutePayload(req.body);
    const route = await Route.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
    if (!route) return res.status(404).json({ error: 'Route not found.' });
    await syncRouteAssignments(route._id, route.assignedBuses, route.assignedDrivers);
    res.json({ route });
  } catch (err) {
    sendRouteError(res, err, 'Update route failed:');
  }
});

// DELETE /api/routes/:id
router.delete('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (route) {
      await Promise.all([
        Bus.updateMany({ assignedRoute: route._id }, { $unset: { assignedRoute: '' } }),
        Driver.updateMany({ assignedRoute: route._id }, { $unset: { assignedRoute: '' } }),
      ]);
    }
    res.json({ message: 'Route deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

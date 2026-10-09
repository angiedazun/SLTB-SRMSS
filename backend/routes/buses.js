const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Bus = require('../models/Bus');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/buses
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, depot, search } = req.query;
    const query = {};
    if (status) query.status = status;
    if (depot) query.depot = depot;
    if (search) query.$or = [
      { busNumber: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } },
      { model: { $regex: search, $options: 'i' } },
    ];

    const total = await Bus.countDocuments(query);
    const buses = await Bus.find(query)
      .populate('assignedRoute', 'routeNumber name')
      .populate('assignedDriver', 'name employeeId')
      .sort({ busNumber: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const busesWithHealth = buses.map((b) => {
      const obj = b.toObject();
      obj.healthScore = b.computeHealthScore();
      return obj;
    });

    res.json({ buses: busesWithHealth, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/buses/stats
router.get('/stats', async (req, res) => {
  try {
    const stats = await Bus.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const total = await Bus.countDocuments();
    const statusMap = {};
    stats.forEach((s) => (statusMap[s._id] = s.count));
    res.json({ total, statusBreakdown: statusMap });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/buses/:id
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id)
      .populate('assignedRoute', 'routeNumber name origin destination')
      .populate('assignedDriver', 'name employeeId phone');
    if (!bus) return res.status(404).json({ error: 'Bus not found.' });
    const busObj = bus.toObject();
    busObj.healthScore = bus.computeHealthScore();
    res.json({ bus: busObj });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/buses
router.post('/', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const bus = await Bus.create(req.body);
    res.status(201).json({ bus });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Bus number or registration already exists.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/buses/:id
router.put('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager', 'maintenance_officer'), async (req, res) => {
  try {
    const bus = await Bus.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!bus) return res.status(404).json({ error: 'Bus not found.' });
    res.json({ bus });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/buses/:id
router.delete('/:id([0-9a-fA-F]{24})', authorize('super_admin'), async (req, res) => {
  try {
    await Bus.findByIdAndDelete(req.params.id);
    res.json({ message: 'Bus deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/buses/:id/location  — update GPS coordinates
router.patch(
  '/:id([0-9a-fA-F]{24})/location',
  [
    body('lat').isFloat({ min: -90, max: 90 }).withMessage('lat must be between -90 and 90'),
    body('lng').isFloat({ min: -180, max: 180 }).withMessage('lng must be between -180 and 180'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { lat, lng } = req.body;
    try {
      const bus = await Bus.findByIdAndUpdate(
        req.params.id,
        { lastLocation: { lat, lng, updatedAt: new Date() } },
        { new: true }
      );
      if (!bus) return res.status(404).json({ error: 'Bus not found.' });
      res.json({ lastLocation: bus.lastLocation });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// PATCH /api/buses/:id/fuel  — update current fuel level
router.patch(
  '/:id([0-9a-fA-F]{24})/fuel',
  [body('currentFuelLevel').isFloat({ min: 0 }).withMessage('Fuel level must be a non-negative number')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const bus = await Bus.findById(req.params.id);
      if (!bus) return res.status(404).json({ error: 'Bus not found.' });

      const level = Math.min(req.body.currentFuelLevel, bus.fuelCapacity || Infinity);
      bus.currentFuelLevel = level;
      await bus.save({ validateBeforeSave: false });
      res.json({ currentFuelLevel: bus.currentFuelLevel, fuelCapacity: bus.fuelCapacity });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// PATCH /api/buses/:id/mileage  — update current mileage
router.patch(
  '/:id([0-9a-fA-F]{24})/mileage',
  [body('currentMileage').isFloat({ min: 0 }).withMessage('Mileage must be a non-negative number')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    try {
      const bus = await Bus.findByIdAndUpdate(
        req.params.id,
        { currentMileage: req.body.currentMileage },
        { new: true }
      );
      if (!bus) return res.status(404).json({ error: 'Bus not found.' });
      res.json({ currentMileage: bus.currentMileage, healthScore: bus.computeHealthScore() });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// GET /api/buses/health  — fleet health scores
router.get('/health', async (req, res) => {
  try {
    const buses = await Bus.find({});
    const fleet = buses.map((b) => ({
      _id: b._id,
      busNumber: b.busNumber,
      status: b.status,
      depot: b.depot,
      healthScore: b.computeHealthScore(),
    }));

    const avg = fleet.length
      ? Math.round(fleet.reduce((sum, b) => sum + b.healthScore, 0) / fleet.length)
      : 0;

    const distribution = {
      excellent: fleet.filter((b) => b.healthScore >= 80).length,
      good: fleet.filter((b) => b.healthScore >= 60 && b.healthScore < 80).length,
      fair: fleet.filter((b) => b.healthScore >= 40 && b.healthScore < 60).length,
      poor: fleet.filter((b) => b.healthScore < 40).length,
    };

    res.json({ fleet, averageHealthScore: avg, distribution });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

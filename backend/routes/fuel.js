const express = require('express');
const router = express.Router();
const FuelLog = require('../models/FuelLog');
const Bus = require('../models/Bus');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/fuel
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, bus, from, to } = req.query;
    const query = {};
    if (bus) query.bus = bus;
    if (from || to) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);
    }

    const total = await FuelLog.countDocuments(query);
    const logs = await FuelLog.find(query)
      .populate('bus', 'busNumber registrationNumber model')
      .populate('driver', 'name employeeId')
      .populate('createdBy', 'name')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ logs, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/fuel/analytics
router.get('/analytics', async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [monthly, topConsumers] = await Promise.all([
      FuelLog.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
            totalQuantity: { $sum: '$quantity' },
            totalCost: { $sum: '$totalCost' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      FuelLog.aggregate([
        { $match: { date: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$bus', total: { $sum: '$quantity' }, cost: { $sum: '$totalCost' } } },
        { $sort: { total: -1 } },
        { $limit: 5 },
        { $lookup: { from: 'buses', localField: '_id', foreignField: '_id', as: 'busInfo' } },
      ]),
    ]);

    res.json({ monthly, topConsumers });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/fuel
router.post('/', authorize('super_admin', 'depot_manager', 'maintenance_officer'), async (req, res) => {
  try {
    // Get last fuel log for this bus to calculate efficiency
    const lastLog = await FuelLog.findOne({ bus: req.body.bus }).sort({ date: -1 });
    const logData = { ...req.body, createdBy: req.user._id };
    if (lastLog) logData.previousMileage = lastLog.mileageAtFueling;

    const log = await FuelLog.create(logData);
    // Update bus fuel level
    await Bus.findByIdAndUpdate(req.body.bus, { currentFuelLevel: req.body.quantity });
    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/fuel/:id
router.put('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager', 'maintenance_officer'), async (req, res) => {
  try {
    const update = { ...req.body };
    const log = await FuelLog.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!log) return res.status(404).json({ error: 'Fuel log not found.' });

    if (update.bus && update.quantity) {
      await Bus.findByIdAndUpdate(update.bus, { currentFuelLevel: update.quantity });
    }

    res.json({ log });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/fuel/:id
router.delete('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const log = await FuelLog.findById(req.params.id);
    if (!log) return res.status(404).json({ error: 'Fuel log not found.' });
    await FuelLog.findByIdAndDelete(req.params.id);
    res.json({ message: 'Fuel log deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

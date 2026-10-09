const express = require('express');
const router = express.Router();
const MaintenanceRecord = require('../models/MaintenanceRecord');
const Bus = require('../models/Bus');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

const normalizeStatus = (status) => {
  if (status === 'pending') return 'scheduled';
  return status || 'scheduled';
};

const normalizeType = (type) => {
  if (type === 'corrective') return 'repair';
  if (type === 'routine') return 'preventive';
  return type || 'preventive';
};

// GET /api/maintenance
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, status, type, bus, priority } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (bus) query.bus = bus;
    if (priority) query.priority = priority;

    const total = await MaintenanceRecord.countDocuments(query);
    const records = await MaintenanceRecord.find(query)
      .populate('bus', 'busNumber registrationNumber model')
      .populate('createdBy', 'name')
      .sort({ scheduledDate: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ records, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/maintenance/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const records = await MaintenanceRecord.find({
      status: 'scheduled',
      scheduledDate: { $lte: sevenDays, $gte: new Date() },
    })
      .populate('bus', 'busNumber registrationNumber')
      .sort({ scheduledDate: 1 });
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/maintenance/stats
router.get('/stats', async (req, res) => {
  try {
    const [statusBreakdown, costSummary] = await Promise.all([
      MaintenanceRecord.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      MaintenanceRecord.aggregate([
        { $match: { status: 'completed' } },
        { $group: { _id: null, totalCost: { $sum: '$cost' }, avgCost: { $avg: '$cost' } } },
      ]),
    ]);
    const statusMap = {};
    statusBreakdown.forEach((row) => {
      statusMap[row._id] = row.count;
    });
    res.json({
      pending: statusMap.scheduled || statusMap.pending || 0,
      inProgress: statusMap.in_progress || 0,
      completed: statusMap.completed || 0,
      critical: 0,
      statusBreakdown,
      costSummary: costSummary[0] || { totalCost: 0, avgCost: 0 },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/maintenance/cost-trends
router.get('/cost-trends', async (req, res) => {
  try {
    const [monthlyTrend, categoryBreakdown] = await Promise.all([
      MaintenanceRecord.aggregate([
        { $match: { status: 'completed' } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$completedDate' } },
            totalCost: { $sum: '$cost' },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
        { $limit: 6 },
      ]),
      MaintenanceRecord.aggregate([
        { $group: { _id: '$type', totalCost: { $sum: '$cost' }, count: { $sum: 1 } } },
      ]),
    ]);
    res.json({ monthlyTrend, categoryBreakdown });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/maintenance/:id
router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const record = await MaintenanceRecord.findById(req.params.id)
      .populate('bus', 'busNumber registrationNumber model year')
      .populate('createdBy', 'name');
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/maintenance
router.post('/', authorize('super_admin', 'depot_manager', 'maintenance_officer'), async (req, res) => {
  try {
    const busId = req.body.bus || req.body.busId;
    if (!busId) return res.status(400).json({ error: 'Bus is required.' });

    const record = await MaintenanceRecord.create({
      ...req.body,
      bus: busId,
      type: normalizeType(req.body.type || req.body.category),
      status: normalizeStatus(req.body.status),
      cost: req.body.cost ?? req.body.estimatedCost ?? 0,
      createdBy: req.user._id,
    });
    // Update bus status if maintenance starts
    if (record.status === 'in_progress') {
      await Bus.findByIdAndUpdate(record.bus, { status: 'maintenance' });
    }
    res.status(201).json({ record });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/maintenance/:id
router.put('/:id([0-9a-fA-F]{24})', authorize('super_admin', 'depot_manager', 'maintenance_officer'), async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.status) update.status = normalizeStatus(update.status);
    if (update.type || update.category) update.type = normalizeType(update.type || update.category);
    if (update.status === 'completed') {
      update.completedDate = update.completedDate || new Date();
    }
    const record = await MaintenanceRecord.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    // Keep bus state aligned with the maintenance lifecycle.
    if (update.status === 'in_progress') {
      await Bus.findByIdAndUpdate(record.bus, { status: 'maintenance' });
    }
    if (update.status === 'completed') {
      const busUpdate = { status: 'active' };
      if (update.mileageAtService !== undefined) busUpdate.lastServiceMileage = update.mileageAtService;
      if (update.nextServiceMileage !== undefined) busUpdate.nextServiceMileage = update.nextServiceMileage;
      if (update.nextServiceDate !== undefined) busUpdate.nextServiceDate = update.nextServiceDate;
      await Bus.findByIdAndUpdate(record.bus, busUpdate);
    }
    res.json({ record });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/maintenance/:id
router.delete('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const record = await MaintenanceRecord.findById(req.params.id);
    if (!record) return res.status(404).json({ error: 'Record not found.' });
    await MaintenanceRecord.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

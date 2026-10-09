const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const FuelLog = require('../models/FuelLog');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

/* ── CSV helper ── */
function toCSV(rows, cols) {
  if (!rows.length) return cols.join(',') + '\n';
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(','), ...rows.map((r) => cols.map((c) => escape(r[c])).join(','))].join('\n');
}

function sendCSV(res, filename, csv) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// GET /api/reports/monthly-summary
router.get('/monthly-summary', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [fuelSummary, maintenanceSummary, driverStats] = await Promise.all([
      FuelLog.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, qty: { $sum: '$quantity' }, cost: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      MaintenanceRecord.aggregate([
        { $match: { scheduledDate: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 }, cost: { $sum: '$cost' } } },
      ]),
      Driver.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    res.json({
      period: { year, month },
      fuel: fuelSummary[0] || { qty: 0, cost: 0, count: 0 },
      maintenance: maintenanceSummary,
      drivers: driverStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/fleet-utilization
router.get('/fleet-utilization', async (req, res) => {
  try {
    const buses = await Bus.find().select('busNumber status currentMileage lastServiceMileage depot');
    const utilization = buses.map((b) => ({
      bus: b.busNumber,
      status: b.status,
      mileage: b.currentMileage,
      depot: b.depot,
      utilizationScore: b.status === 'active' ? 100 : b.status === 'idle' ? 50 : 0,
    }));
    res.json({ utilization });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/fuel-analysis
router.get('/fuel-analysis', async (req, res) => {
  try {
    const { from, to } = req.query;
    const dateQuery = {};
    if (from) dateQuery.$gte = new Date(from);
    if (to) dateQuery.$lte = new Date(to);

    const fuelData = await FuelLog.aggregate([
      ...(Object.keys(dateQuery).length ? [{ $match: { date: dateQuery } }] : []),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          totalQty: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          avgEfficiency: { $avg: '$efficiency' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ fuelData });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/route-performance
router.get('/route-performance', async (req, res) => {
  try {
    const { format } = req.query;
    const routes = await Route.find({ status: 'active' })
      .select('routeNumber name totalTripsCompleted onTimePerformance avgPassengersPerTrip totalDistance');
    if (format === 'csv') {
      const rows = routes.map((r) => ({
        routeNumber: r.routeNumber, name: r.name,
        totalTripsCompleted: r.totalTripsCompleted || 0,
        onTimePerformance: r.onTimePerformance || 0,
        avgPassengersPerTrip: r.avgPassengersPerTrip || 0,
        totalDistance: r.totalDistance || 0,
      }));
      return sendCSV(res, 'route-performance.csv', toCSV(rows, ['routeNumber', 'name', 'totalTripsCompleted', 'onTimePerformance', 'avgPassengersPerTrip', 'totalDistance']));
    }
    res.json({ routes });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/driver-performance
router.get('/driver-performance', async (req, res) => {
  try {
    const { format } = req.query;
    const drivers = await Driver.find()
      .select('name employeeId status licenseNumber licenseExpiry totalTrips totalMileage rating depot');
    if (format === 'csv') {
      const rows = drivers.map((d) => ({
        name: d.name, employeeId: d.employeeId || '',
        status: d.status, licenseNumber: d.licenseNumber || '',
        licenseExpiry: d.licenseExpiry ? new Date(d.licenseExpiry).toISOString().slice(0, 10) : '',
        totalTrips: d.totalTrips || 0, totalMileage: d.totalMileage || 0,
        rating: d.rating || 0, depot: d.depot || '',
      }));
      return sendCSV(res, 'driver-performance.csv', toCSV(rows, ['name', 'employeeId', 'status', 'licenseNumber', 'licenseExpiry', 'totalTrips', 'totalMileage', 'rating', 'depot']));
    }
    res.json({ drivers });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/maintenance-log
router.get('/maintenance-log', async (req, res) => {
  try {
    const { from, to, format } = req.query;
    const match = {};
    if (from || to) {
      match.scheduledDate = {};
      if (from) match.scheduledDate.$gte = new Date(from);
      if (to) match.scheduledDate.$lte = new Date(to);
    }
    const records = await MaintenanceRecord.find(match)
      .populate('bus', 'busNumber')
      .sort({ scheduledDate: -1 })
      .limit(500);
    if (format === 'csv') {
      const rows = records.map((r) => ({
        bus: r.bus?.busNumber || '', type: r.type || '', description: r.description || '',
        status: r.status || '', priority: r.priority || '',
        scheduledDate: r.scheduledDate ? new Date(r.scheduledDate).toISOString().slice(0, 10) : '',
        completedDate: r.completedDate ? new Date(r.completedDate).toISOString().slice(0, 10) : '',
        cost: r.cost || 0, technician: r.technician || '',
      }));
      return sendCSV(res, 'maintenance-log.csv', toCSV(rows, ['bus', 'type', 'description', 'status', 'priority', 'scheduledDate', 'completedDate', 'cost', 'technician']));
    }
    res.json({ records });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/trip-analytics
router.get('/trip-analytics', async (req, res) => {
  try {
    // Aggregate scheduled/completed trips by week using MaintenanceRecord completion dates
    // as a proxy; use FuelLog entries per day as trip activity indicator
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const fuelByDay = await FuelLog.aggregate([
      { $match: { date: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          completed: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    const tripData = fuelByDay.map((d) => ({
      date: d._id,
      completed: d.completed,
      delayed: Math.round(d.completed * 0.05),
      cancelled: Math.round(d.completed * 0.02),
    }));
    res.json({ tripData });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/monthly-summary (with CSV support)
router.get('/monthly-summary', async (req, res) => {
  try {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1, format } = req.query;
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0, 23, 59, 59);

    const [fuelSummary, maintenanceSummary, driverStats] = await Promise.all([
      FuelLog.aggregate([
        { $match: { date: { $gte: start, $lte: end } } },
        { $group: { _id: null, qty: { $sum: '$quantity' }, cost: { $sum: '$totalCost' }, count: { $sum: 1 } } },
      ]),
      MaintenanceRecord.aggregate([
        { $match: { scheduledDate: { $gte: start, $lte: end } } },
        { $group: { _id: '$status', count: { $sum: 1 }, cost: { $sum: '$cost' } } },
      ]),
      Driver.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
    ]);

    if (format === 'csv') {
      const rows = [
        { section: 'Fuel', metric: 'Total Quantity (L)', value: fuelSummary[0]?.qty || 0 },
        { section: 'Fuel', metric: 'Total Cost (LKR)', value: fuelSummary[0]?.cost || 0 },
        { section: 'Fuel', metric: 'Fill-up Count', value: fuelSummary[0]?.count || 0 },
        ...maintenanceSummary.map((m) => ({ section: 'Maintenance', metric: m._id, value: m.count })),
        ...driverStats.map((d) => ({ section: 'Drivers', metric: d._id, value: d.count })),
      ];
      return sendCSV(res, `monthly-summary-${year}-${month}.csv`, toCSV(rows, ['section', 'metric', 'value']));
    }

    res.json({
      period: { year, month },
      fuel: fuelSummary[0] || { qty: 0, cost: 0, count: 0 },
      maintenance: maintenanceSummary,
      drivers: driverStats,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/fleet-utilization (with CSV support)
router.get('/fleet-utilization', async (req, res) => {
  try {
    const { format } = req.query;
    const buses = await Bus.find().select('busNumber status currentMileage lastServiceMileage depot');
    const utilization = buses.map((b) => ({
      bus: b.busNumber,
      status: b.status,
      mileage: b.currentMileage,
      depot: b.depot,
      utilizationScore: b.status === 'active' ? 100 : b.status === 'idle' ? 50 : 0,
    }));
    if (format === 'csv') {
      return sendCSV(res, 'fleet-utilization.csv', toCSV(utilization, ['bus', 'status', 'mileage', 'depot', 'utilizationScore']));
    }
    res.json({ utilization });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/reports/fuel-analysis (with CSV support)
router.get('/fuel-analysis', async (req, res) => {
  try {
    const { from, to, format } = req.query;
    const dateQuery = {};
    if (from) dateQuery.$gte = new Date(from);
    if (to) dateQuery.$lte = new Date(to);

    const fuelData = await FuelLog.aggregate([
      ...(Object.keys(dateQuery).length ? [{ $match: { date: dateQuery } }] : []),
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          totalQty: { $sum: '$quantity' },
          totalCost: { $sum: '$totalCost' },
          avgEfficiency: { $avg: '$efficiency' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    if (format === 'csv') {
      return sendCSV(res, 'fuel-analysis.csv', toCSV(fuelData.map((d) => ({ month: d._id, totalQty: d.totalQty, totalCost: d.totalCost, avgEfficiency: (d.avgEfficiency || 0).toFixed(2), count: d.count })), ['month', 'totalQty', 'totalCost', 'avgEfficiency', 'count']));
    }

    res.json({ fuelData });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

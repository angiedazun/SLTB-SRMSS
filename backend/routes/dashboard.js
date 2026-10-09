const express = require('express');
const router = express.Router();
const Bus = require('../models/Bus');
const Driver = require('../models/Driver');
const Route = require('../models/Route');
const Schedule = require('../models/Schedule');
const MaintenanceRecord = require('../models/MaintenanceRecord');
const FuelLog = require('../models/FuelLog');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

router.use(protect);

// GET /api/dashboard/stats
router.get('/stats', async (req, res) => {
  try {
    const [
      totalBuses, activeBuses, maintenanceBuses,
      totalDrivers, activeDrivers,
      totalRoutes, activeRoutes,
      schedulesToday,
      pendingMaintenance,
      recentFuelCost,
    ] = await Promise.all([
      Bus.countDocuments(),
      Bus.countDocuments({ status: 'active' }),
      Bus.countDocuments({ status: 'maintenance' }),
      Driver.countDocuments(),
      Driver.countDocuments({ status: 'active' }),
      Route.countDocuments(),
      Route.countDocuments({ status: 'active' }),
      Schedule.countDocuments({ status: 'active' }),
      MaintenanceRecord.countDocuments({ status: { $in: ['scheduled', 'in_progress'] } }),
      FuelLog.aggregate([
        { $match: { date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } } },
        { $group: { _id: null, total: { $sum: '$totalCost' }, qty: { $sum: '$quantity' } } },
      ]),
    ]);

    res.json({
      buses: { total: totalBuses, active: activeBuses, maintenance: maintenanceBuses },
      drivers: { total: totalDrivers, active: activeDrivers },
      routes: { total: totalRoutes, active: activeRoutes },
      schedules: { today: schedulesToday },
      maintenance: { pending: pendingMaintenance },
      fuel: {
        monthlySpend: recentFuelCost[0]?.total || 0,
        monthlyQty: recentFuelCost[0]?.qty || 0,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/dashboard/recent-activity
router.get('/recent-activity', async (req, res) => {
  try {
    const [maintenance, fuel] = await Promise.all([
      MaintenanceRecord.find({ status: 'in_progress' })
        .populate('bus', 'busNumber')
        .sort({ updatedAt: -1 })
        .limit(5),
      FuelLog.find()
        .populate('bus', 'busNumber')
        .sort({ date: -1 })
        .limit(5),
    ]);

    const activities = [
      ...maintenance.map((m) => ({
        id: m._id,
        type: 'maintenance',
        title: `${m.bus?.busNumber} — ${m.title}`,
        time: m.updatedAt,
        status: m.status,
      })),
      ...fuel.map((f) => ({
        id: f._id,
        type: 'fuel',
        title: `${f.bus?.busNumber} — ${f.quantity}L fueled`,
        time: f.date,
        cost: f.totalCost,
      })),
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

    res.json({ activities });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/dashboard/fleet-overview
router.get('/fleet-overview', async (req, res) => {
  try {
    const statusCounts = await Bus.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    const fuelTrend = await FuelLog.aggregate([
      { $match: { date: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          quantity: { $sum: '$quantity' },
          cost: { $sum: '$totalCost' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({ statusCounts, fuelTrend });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/dashboard/alerts
router.get('/alerts', async (req, res) => {
  try {
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const [expiringLicenses, upcomingMaintenance, outOfServiceBuses] = await Promise.all([
      Driver.find({ licenseExpiry: { $lte: thirtyDays }, status: { $ne: 'inactive' } })
        .select('name employeeId licenseExpiry')
        .limit(5),
      MaintenanceRecord.find({ status: 'scheduled', scheduledDate: { $lte: thirtyDays } })
        .populate('bus', 'busNumber')
        .select('title scheduledDate priority bus')
        .limit(5),
      Bus.find({ status: 'out_of_service' }).select('busNumber depot').limit(5),
    ]);

    res.json({ expiringLicenses, upcomingMaintenance, outOfServiceBuses });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/dashboard/depot-analytics
router.get('/depot-analytics', async (req, res) => {
  try {
    const [busByDepot, driverByDepot, routeByDepot, scheduleByDepot] = await Promise.all([
      Bus.aggregate([
        { $group: { _id: '$depot', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }, maintenance: { $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
      Driver.aggregate([
        { $group: { _id: '$depot', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } }, onLeave: { $sum: { $cond: [{ $eq: ['$status', 'on_leave'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
      Route.aggregate([
        { $group: { _id: '$depot', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
      Schedule.aggregate([
        { $group: { _id: '$depot', total: { $sum: 1 }, active: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    const depotMap = {};
    const merge = (arr, key) => arr.forEach((row) => {
      const name = row._id || 'Unassigned';
      if (!depotMap[name]) depotMap[name] = { depot: name, buses: { total: 0, active: 0, maintenance: 0 }, drivers: { total: 0, active: 0, onLeave: 0 }, routes: { total: 0, active: 0 }, schedules: { total: 0, active: 0 } };
      depotMap[name][key] = { ...depotMap[name][key], ...row };
      delete depotMap[name][key]._id;
    });

    merge(busByDepot, 'buses');
    merge(driverByDepot, 'drivers');
    merge(routeByDepot, 'routes');
    merge(scheduleByDepot, 'schedules');

    const depots = Object.values(depotMap).sort((a, b) => (b.buses.total + b.drivers.total) - (a.buses.total + a.drivers.total));
    res.json({ depots });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

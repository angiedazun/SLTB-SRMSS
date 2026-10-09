const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// In-memory settings store (persists for server lifetime)
let store = {
  depotName: 'Colombo Central Depot',
  depotCode: 'CMB-01',
  timezone: 'Asia/Colombo',
  currency: 'LKR',
  dateFormat: 'DD/MM/YYYY',
  notifyMaintenance: true,
  notifyLicenseExpiry: true,
  notifyFuelThreshold: true,
  fuelThreshold: 20,
  maintenanceLeadDays: 7,
  licenseExpiryDays: 30,
  autoBackup: false,
};

const ALLOWED_KEYS = [
  'depotName', 'depotCode', 'timezone', 'currency', 'dateFormat',
  'notifyMaintenance', 'notifyLicenseExpiry', 'notifyFuelThreshold',
  'fuelThreshold', 'maintenanceLeadDays', 'licenseExpiryDays', 'autoBackup',
];

// GET /api/settings
router.get('/', (req, res) => {
  res.json(store);
});

// PUT /api/settings
router.put('/', authorize('super_admin', 'depot_manager'), (req, res) => {
  const update = {};
  for (const key of ALLOWED_KEYS) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }
  store = { ...store, ...update };
  res.json(store);
});

module.exports = router;

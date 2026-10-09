const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/users
router.get('/', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search, isActive } = req.query;
    const query = {};
    if (role) query.role = role;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { employeeId: { $regex: search, $options: 'i' } },
    ];

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const pages = Math.ceil(total / limit);
    res.json({
      users,
      pagination: { total, page: parseInt(page), pages, limit: parseInt(limit) },
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/users/invite
router.post('/invite', authorize('super_admin', 'depot_manager'), async (req, res) => {
  const { name, email, role, depot } = req.body;
  if (!name || !email || !role) return res.status(400).json({ error: 'name, email and role are required.' });
  try {
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) return res.status(409).json({ error: 'A user with this email already exists.' });
    // Generate a temporary random password
    const tempPassword = crypto.randomBytes(8).toString('hex');
    const user = await User.create({ name, email, role, depot: depot || '', password: tempPassword, isActive: true });
    res.status(201).json({ user: { _id: user._id, name: user.name, email: user.email, role: user.role }, tempPassword });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Email already in use.' });
    res.status(500).json({ error: 'Server error.' });
  }
});

// PATCH /api/users/:id/status
router.patch('/:id/status', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot change your own account status.' });
    }
    const { isActive } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { isActive }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/users/:id
router.get('/:id', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/users/:id
router.put('/:id', authorize('super_admin'), async (req, res) => {
  const { name, email, role, phone, depot, employeeId, isActive } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { name, email, role, phone, depot, employeeId, isActive },
      { new: true, runValidators: true }
    );
    if (!user) return res.status(404).json({ error: 'User not found.' });
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', authorize('super_admin'), async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

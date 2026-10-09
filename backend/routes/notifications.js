const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

// GET /api/notifications/stats
router.get('/stats', async (req, res) => {
  try {
    const query = { $or: [{ recipients: req.user._id }, { isGlobal: true }] };
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, readBy: { $ne: req.user._id } });
    res.json({ total, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// GET /api/notifications
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, type, priority } = req.query;
    const query = {
      $or: [
        { recipients: req.user._id },
        { isGlobal: true },
      ],
    };
    if (type) query.type = type;
    if (priority) query.priority = priority;

    const total = await Notification.countDocuments(query);
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const unreadCount = await Notification.countDocuments({
      ...query,
      readBy: { $ne: req.user._id },
    });

    res.json({ notifications, total, unreadCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/notifications/read-all
router.put('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      {
        $or: [{ recipients: req.user._id }, { isGlobal: true }],
        readBy: { $ne: req.user._id },
      },
      { $addToSet: { readBy: req.user._id } }
    );
    res.json({ message: 'All notifications marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// PUT /api/notifications/:id/read
router.put('/:id/read', async (req, res) => {
  try {
    await Notification.findByIdAndUpdate(req.params.id, {
      $addToSet: { readBy: req.user._id },
    });
    res.json({ message: 'Marked as read.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// DELETE /api/notifications/:id
router.delete('/:id', async (req, res) => {
  try {
    const notif = await Notification.findById(req.params.id);
    if (!notif) return res.status(404).json({ error: 'Notification not found.' });
    // Allow deletion if user is a recipient or admin
    const isAdmin = ['super_admin', 'depot_manager'].includes(req.user.role);
    const isRecipient = notif.recipients.some((r) => r.toString() === req.user._id.toString());
    if (!isAdmin && !isRecipient && !notif.isGlobal) {
      return res.status(403).json({ error: 'Not authorized.' });
    }
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ message: 'Notification deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// POST /api/notifications (Admin only)
router.post('/', authorize('super_admin', 'depot_manager'), async (req, res) => {
  try {
    const notification = await Notification.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ notification });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;

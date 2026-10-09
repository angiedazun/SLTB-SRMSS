const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { sendEmail } = require('../utils/email');

// @POST /api/auth/login
router.post(
  '/login',
  [
    body('identifier').optional().trim().notEmpty().withMessage('Username or email required'),
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { password } = req.body;
    const identifier = (req.body.identifier || req.body.email || '').trim().toLowerCase();
    if (!identifier) return res.status(400).json({ error: 'Username or email required.' });

    try {
      const user = await User.findOne({
        $or: [{ email: identifier }, { username: identifier }],
      }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        return res.status(401).json({ error: 'Invalid username/email or password.' });
      }
      if (!user.isActive) {
        return res.status(403).json({ error: 'Your account has been deactivated.' });
      }

      user.lastLogin = new Date();
      await user.save({ validateBeforeSave: false });

      const token = user.generateToken();
      const { password: _pw, ...userData } = user.toObject();

      res.json({ token, user: userData });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// @POST /api/auth/register (Super Admin only in real system)
router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().normalizeEmail(),
    body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('role').optional().isIn(['super_admin', 'depot_manager', 'scheduler_officer', 'driver', 'maintenance_officer']),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { name, email, username, password, role, phone, depot, employeeId } = req.body;
    try {
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: 'Email already registered.' });

      if (username) {
        const existingUsername = await User.findOne({ username: username.toLowerCase() });
        if (existingUsername) return res.status(409).json({ error: 'Username already taken.' });
      }

      const user = await User.create({ name, email, username, password, role, phone, depot, employeeId });
      const token = user.generateToken();
      const { password: _pw, ...userData } = user.toObject();

      res.status(201).json({ token, user: userData });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// @GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user });
});

// @PUT /api/auth/profile
router.put('/profile', protect, async (req, res) => {
  const { name, phone, depot, preferences } = req.body;
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, depot, preferences },
      { new: true, runValidators: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// @PUT /api/auth/change-password
router.put(
  '/change-password',
  protect,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { currentPassword, newPassword } = req.body;
    try {
      const user = await User.findById(req.user._id).select('+password');
      if (!(await user.comparePassword(currentPassword))) {
        return res.status(401).json({ error: 'Current password is incorrect.' });
      }
      user.password = newPassword;
      await user.save();
      res.json({ message: 'Password changed successfully.' });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// @POST /api/auth/forgot-password
router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const { email } = req.body;
    try {
      const user = await User.findOne({ email });
      // Always respond with success to prevent email enumeration
      if (!user) {
        return res.json({ message: 'If that email is registered, a reset link has been sent.' });
      }

      const resetToken = user.generatePasswordResetToken();
      await user.save({ validateBeforeSave: false });

      const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

      try {
        await sendEmail({
          to: user.email,
          subject: 'SLTB SRMSS – Password Reset Request',
          html: `
            <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
              <h2 style="color:#dc2626;margin-bottom:8px;">Password Reset</h2>
              <p>Hello <strong>${user.name}</strong>,</p>
              <p>Someone requested a password reset for your SLTB SRMSS account. Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${resetUrl}" style="background:#dc2626;color:#fff;padding:12px 28px;text-decoration:none;border-radius:8px;font-weight:bold;display:inline-block;">Reset My Password</a>
              </div>
              <p style="font-size:12px;color:#6b7280;">Or copy this link into your browser:<br/><a href="${resetUrl}" style="color:#dc2626;">${resetUrl}</a></p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;"/>
              <p style="font-size:12px;color:#9ca3af;">If you did not request a password reset, you can safely ignore this email. Your password will not change.</p>
            </div>
          `,
          text: `Reset your SLTB SRMSS password (expires in 1 hour):\n\n${resetUrl}\n\nIf you did not request this, ignore this email.`,
        });
        res.json({ message: 'If that email is registered, a reset link has been sent.' });
      } catch (emailErr) {
        // Roll back token if email failed
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });
        res.status(500).json({ error: 'Could not send reset email. Please try again later.' });
      }
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

// @POST /api/auth/reset-password/:token
router.post(
  '/reset-password/:token',
  [body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });

    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    try {
      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });
      if (!user) {
        return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
      }

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      const token = user.generateToken();
      const { password: _pw, ...userData } = user.toObject();
      res.json({ message: 'Password reset successfully.', token, user: userData });
    } catch (err) {
      res.status(500).json({ error: 'Server error.' });
    }
  }
);

module.exports = router;

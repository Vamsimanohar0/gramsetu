const express = require('express');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { requirePanchayathAuth } = require('../middleware/authMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: 'Too many login attempts. Please try again after 15 minutes.',
});

router.post('/login', loginLimiter, authController.login);
router.post('/logout', authController.logout);

router.use(requirePanchayathAuth);
router.get('/me', authController.me);
router.get('/dashboard', adminController.dashboard);
router.get('/complaints', adminController.listComplaints);
router.get('/complaints/:id', adminController.getComplaint);
router.patch('/complaints/:id/status', adminController.updateStatus);

router.limiters = {
  loginLimiter,
};

module.exports = router;

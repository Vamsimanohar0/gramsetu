const express = require('express');
const authController = require('../controllers/authController');
const adminController = require('../controllers/adminController');
const { requirePanchayathAuth } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/login', authController.login);
router.post('/logout', authController.logout);

router.use(requirePanchayathAuth);
router.get('/me', authController.me);
router.get('/dashboard', adminController.dashboard);
router.get('/complaints', adminController.listComplaints);
router.get('/complaints/:id', adminController.getComplaint);
router.patch('/complaints/:id/status', adminController.updateStatus);

module.exports = router;


const express = require('express');
const publicController = require('../controllers/publicController');
const {
  uploadComplaintImages,
  verifyUploadedImageContents,
} = require('../middleware/uploadMiddleware');
const { createRateLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

const submitComplaintLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many complaints submitted from this IP. Please try again after 15 minutes.',
});

const trackLookupLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: 'Too many tracking requests from this IP. Please try again shortly.',
});

router.get('/villages', publicController.listVillages);
router.post(
  '/complaints',
  submitComplaintLimiter,
  uploadComplaintImages,
  verifyUploadedImageContents,
  publicController.submitComplaint
);
router.post('/complaints/track', trackLookupLimiter, publicController.trackComplaint);
router.post('/complaints/lookup', trackLookupLimiter, publicController.lookupComplaintsByMobile);

router.limiters = {
  submitComplaintLimiter,
  trackLookupLimiter,
};

module.exports = router;

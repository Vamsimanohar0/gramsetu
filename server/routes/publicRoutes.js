const express = require('express');
const publicController = require('../controllers/publicController');
const {
  uploadComplaintImages,
  verifyUploadedImageContents,
} = require('../middleware/uploadMiddleware');
const { createSharedRateLimiter, ipKeyGenerator } = require('../middleware/rateLimiter');

const router = express.Router();

const submitComplaintLimiter = createSharedRateLimiter({
  prefix: 'submit:',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many complaints submitted from this IP. Please try again after 15 minutes.',
});

const trackComplaintLimiter = createSharedRateLimiter({
  prefix: 'track:',
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: 'Too many tracking requests from this IP. Please try again shortly.',
});

const lookupIpLimiter = createSharedRateLimiter({
  prefix: 'lookup_ip:',
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many mobile lookup requests from this IP. Please try again after 15 minutes.',
});

const lookupMobileLimiter = createSharedRateLimiter({
  prefix: 'lookup_mob:',
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const mobile = String(req.body?.mobile ?? '').trim();
    return /^[0-9]{10}$/.test(mobile)
      ? `mobile:${mobile}`
      : `ip:${ipKeyGenerator(req.ip || '127.0.0.1')}`;
  },
  message: 'Too many lookups for this mobile number. Please try again after 15 minutes.',
});

const voteIpLimiter = createSharedRateLimiter({
  prefix: 'vote_ip:',
  windowMs: 15 * 60 * 1000,
  max: 25,
  message: 'Too many voting requests from this IP. Please try again after 15 minutes.',
});

const feedbackLimiter = createSharedRateLimiter({
  prefix: 'feedback:',
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many feedback requests from this IP. Please try again shortly.',
});

router.get('/villages', publicController.listVillages);
router.post(
  '/complaints',
  submitComplaintLimiter,
  uploadComplaintImages,
  verifyUploadedImageContents,
  publicController.submitComplaint
);
router.post('/complaints/track', trackComplaintLimiter, publicController.trackComplaint);
router.post('/complaints/feedback', feedbackLimiter, publicController.submitFeedback);
router.get('/complaints/map', trackComplaintLimiter, publicController.listPublicMapComplaints);
router.post('/complaints/:complaintId/votes', voteIpLimiter, publicController.castVote);
router.delete('/complaints/:complaintId/votes', voteIpLimiter, publicController.withdrawVote);
router.post(
  '/complaints/lookup',
  lookupIpLimiter,
  lookupMobileLimiter,
  publicController.lookupComplaintsByMobile
);
router.get(
  '/complaints/evidence/:complaintId/:filename',
  trackComplaintLimiter,
  publicController.getCitizenEvidence
);

router.limiters = {
  submitComplaintLimiter,
  trackComplaintLimiter,
  lookupIpLimiter,
  lookupMobileLimiter,
  voteIpLimiter,
  feedbackLimiter,
};

module.exports = router;

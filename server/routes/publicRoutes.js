const express = require('express');
const publicController = require('../controllers/publicController');
const { uploadComplaintImages } = require('../middleware/uploadMiddleware');

const router = express.Router();

router.get('/villages', publicController.listVillages);
router.post('/complaints', uploadComplaintImages, publicController.submitComplaint);
router.post('/complaints/track', publicController.trackComplaint);
router.post('/complaints/lookup', publicController.lookupComplaintsByMobile);


module.exports = router;


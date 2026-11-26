const complaintService = require('../services/complaintService');
const {
  validateCreateComplaint,
  validateTrackComplaint,
} = require('../validators/complaintValidator');
const {
  collectUploadedFiles,
  cleanupUploadedFiles,
} = require('../middleware/uploadMiddleware');

async function listVillages(_req, res, next) {
  try {
    const villages = await complaintService.getActiveVillages();
    return res.json({
      status: 'success',
      villages,
    });
  } catch (err) {
    return next(err);
  }
}

async function submitComplaint(req, res, next) {
  const uploadedFiles = collectUploadedFiles(req);
  try {
    const validation = validateCreateComplaint(req.body);
    if (!validation.valid) {
      await cleanupUploadedFiles(uploadedFiles);
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const created = await complaintService.createComplaint(validation.data, uploadedFiles);
    return res.status(201).json({
      status: 'success',
      complaint_id: created.complaint_id,
      message: 'Complaint submitted successfully!',
      images: created.images,
    });
  } catch (err) {
    await cleanupUploadedFiles(uploadedFiles);
    return next(err);
  }
}

async function trackComplaint(req, res, next) {
  try {
    const validation = validateTrackComplaint(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const result = await complaintService.trackComplaint(
      validation.data.complaintId,
      validation.data.mobile
    );

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found. Please verify your Complaint ID and Mobile Number.',
      });
    }

    return res.json({
      status: 'success',
      complaint: result.complaint,
      updates: result.updates,
    });
  } catch (err) {
    return next(err);
  }
}

async function lookupComplaintsByMobile(req, res, next) {
  try {
    const mobile = String(req.body?.mobile ?? '').trim();
    if (!mobile) {
      return res.json([]);
    }

    const complaints = await complaintService.findComplaintsByMobile(mobile);
    return res.json(complaints);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listVillages,
  submitComplaint,
  trackComplaint,
  lookupComplaintsByMobile,
};


const complaintService = require('../services/complaintService');
const votingService = require('../services/votingService');
const {
  validateCreateComplaint,
  validateTrackComplaint,
  validateLookupMobile,
  validateFeedbackSubmit,
  validateVoteAction,
} = require('../validators/complaintValidator');
const {
  collectUploadedFiles,
  cleanupUploadedFiles,
} = require('../middleware/uploadMiddleware');
const { verifyCitizenEvidenceToken } = require('../utils/evidenceToken');
const { sendProtectedEvidenceImage } = require('../utils/fileResponse');
const { readSignedVoterCookie, getOrIssueVoterCookie } = require('../utils/voterCookie');

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
      privacy_mode: created.privacy_mode,
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

    const voterSession = readSignedVoterCookie(req);
    const result = await complaintService.trackComplaint(
      validation.data.complaintId,
      validation.data.mobile,
      { voterKeyHmac: voterSession?.voterKeyHmac || '' }
    );

    if (!result) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found. Please check your Complaint ID and Mobile Number.',
      });
    }

    return res.json({
      status: 'success',
      complaint: result.complaint,
      updates: result.updates,
      feedback: result.feedback || null,
    });
  } catch (err) {
    return next(err);
  }
}

async function submitFeedback(req, res, next) {
  try {
    const validation = validateFeedbackSubmit(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const result = await complaintService.submitComplaintFeedback(validation.data);
    return res.json({
      status: 'success',
      message: result.reopened
        ? 'Complaint reopened and routed back to Panchayat review.'
        : result.corrected
          ? 'Feedback updated successfully!'
          : 'Thank you for submitting your feedback!',
      complaint_id: result.complaint_id,
      complaint_status: result.status,
      reopened: result.reopened,
      corrected: result.corrected,
      feedback: result.feedback,
      updates: result.updates,
    });
  } catch (err) {
    return next(err);
  }
}

async function listPublicMapComplaints(req, res, next) {
  try {
    const { village_id = '', category = '', status = '' } = req.query;
    const voterSession = readSignedVoterCookie(req);
    const mapData = await complaintService.getPublicMapComplaints({
      villageId: village_id,
      category,
      status,
      voterKeyHmac: voterSession?.voterKeyHmac || '',
    });

    return res.json({
      status: 'success',
      ...mapData,
    });
  } catch (err) {
    return next(err);
  }
}

async function castVote(req, res, next) {
  try {
    const validation = validateVoteAction({
      ...req.body,
      complaint_id: req.params.complaintId || req.body?.complaint_id,
    });
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const { voterKeyHmac } = getOrIssueVoterCookie(req, res);
    const result = await votingService.castVote({
      complaintId: validation.data.complaintId,
      voterKeyHmac,
    });

    return res.status(201).json({
      status: 'success',
      message: 'Your support vote has been recorded.',
      ...result,
    });
  } catch (err) {
    return next(err);
  }
}

async function withdrawVote(req, res, next) {
  try {
    const validation = validateVoteAction({
      ...req.body,
      complaint_id: req.params.complaintId || req.body?.complaint_id,
    });
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const voterSession = readSignedVoterCookie(req);
    const result = await votingService.withdrawVote({
      complaintId: validation.data.complaintId,
      voterKeyHmac: voterSession?.voterKeyHmac || '',
    });

    return res.json({
      status: 'success',
      message: 'Your support vote has been withdrawn.',
      ...result,
    });
  } catch (err) {
    return next(err);
  }
}

async function lookupComplaintsByMobile(req, res, next) {
  try {
    const validation = validateLookupMobile(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const complaints = await complaintService.findComplaintsByMobile(validation.data.mobile);
    return res.json(complaints);
  } catch (err) {
    return next(err);
  }
}

async function getCitizenEvidence(req, res, next) {
  try {
    const { complaintId, filename } = req.params;
    const token = String(req.query?.token ?? '');

    if (!verifyCitizenEvidenceToken(token, complaintId, filename)) {
      return res.status(403).json({
        status: 'error',
        message: 'Invalid or expired evidence access token',
      });
    }

    const exists = await complaintService.complaintHasImage(complaintId, filename);
    if (!exists) {
      return res.status(404).json({
        status: 'error',
        message: 'Evidence file not found',
      });
    }

    return sendProtectedEvidenceImage(res, filename, next);
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  listVillages,
  submitComplaint,
  trackComplaint,
  submitFeedback,
  lookupComplaintsByMobile,
  getCitizenEvidence,
  listPublicMapComplaints,
  castVote,
  withdrawVote,
};


const { ALLOWED_STATUSES } = require('../utils/complaintUtils');
const { parseCoordinatePair } = require('../utils/locationUtils');
const { normalizeMobileNumber } = require('../utils/voterHash');

const MOBILE_REGEX = /^[0-9]{10}$/;
const COMPLAINT_ID_REGEX = /^[A-Za-z0-9-]{4,20}$/;

function validateCreateComplaint(body = {}) {
  const name = String(body.name ?? '').trim();
  const mobile = normalizeMobileNumber(body.mobile);
  const villageId = Number.parseInt(body.village_id, 10);
  const wardNo = String(body.ward_no ?? '').trim();
  const category = String(body.category ?? '').trim();
  const title = String(body.title ?? '').trim();
  const description = String(body.description ?? '').trim();

  if (!name || !mobile || !villageId || Number.isNaN(villageId) || villageId <= 0 || !category || !title || !description) {
    return {
      valid: false,
      message: 'Please fill all required fields',
    };
  }

  if (!MOBILE_REGEX.test(mobile)) {
    return {
      valid: false,
      message: 'Please enter a valid 10-digit mobile number',
    };
  }

  if (name.length > 100) {
    return { valid: false, message: 'Full name must be 100 characters or fewer' };
  }
  if (wardNo.length > 20) {
    return { valid: false, message: 'Ward number must be 20 characters or fewer' };
  }
  if (category.length > 100) {
    return { valid: false, message: 'Invalid complaint category' };
  }
  if (title.length > 255) {
    return { valid: false, message: 'Complaint title must be 255 characters or fewer' };
  }
  if (description.length > 1000) {
    return { valid: false, message: 'Description must be 1000 characters or fewer' };
  }

  const coords = parseCoordinatePair(body.latitude, body.longitude);
  if (!coords.valid) {
    return { valid: false, message: coords.message };
  }

  let locationSource = null;
  if (coords.provided) {
    const rawSource = String(body.location_source ?? 'manual').trim().toLowerCase();
    if (rawSource !== 'gps' && rawSource !== 'manual') {
      return { valid: false, message: 'Invalid location source' };
    }
    locationSource = rawSource;
  }

  return {
    valid: true,
    data: {
      name,
      mobile,
      villageId,
      wardNo,
      category,
      title,
      description,
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationSource,
    },
  };
}

function validateTrackComplaint(body = {}) {
  const complaintId = String(body.complaint_id ?? '').trim();
  const mobile = String(body.mobile ?? '').trim();

  if (!complaintId || !mobile) {
    return {
      valid: false,
      message: 'Missing Complaint ID or Mobile Number',
    };
  }

  if (!COMPLAINT_ID_REGEX.test(complaintId)) {
    return {
      valid: false,
      message: 'Please enter a valid Complaint ID',
    };
  }

  if (!MOBILE_REGEX.test(mobile)) {
    return {
      valid: false,
      message: 'Please enter a valid 10-digit mobile number',
    };
  }

  return {
    valid: true,
    data: { complaintId, mobile },
  };
}

function validateLookupMobile(body = {}) {
  const mobile = String(body.mobile ?? '').trim();
  if (!MOBILE_REGEX.test(mobile)) {
    return {
      valid: false,
      message: 'Please enter a valid 10-digit mobile number',
    };
  }
  return {
    valid: true,
    data: { mobile },
  };
}

function validateLogin(body = {}) {
  const username = String(body.username ?? '').trim();
  const password = String(body.password ?? '');

  if (!username || !password) {
    return {
      valid: false,
      message: 'Please fill in all fields',
    };
  }

  if (username.length > 50 || password.length > 255) {
    return {
      valid: false,
      message: 'Invalid username or password',
    };
  }

  return {
    valid: true,
    data: { username, password },
  };
}

function validateStatusUpdate(body = {}) {
  const status = String(body.status ?? '').trim();
  if (!ALLOWED_STATUSES.includes(status)) {
    return {
      valid: false,
      message: `Invalid status. Allowed values: ${ALLOWED_STATUSES.join(', ')}`,
    };
  }
  const note = String(body.note ?? body.remarks ?? '').trim();
  if (note.length > 500) {
    return {
      valid: false,
      message: 'Status note must be 500 characters or fewer.',
    };
  }
  return { valid: true, data: { status, note } };
}

function validateFeedbackSubmit(body = {}) {
  const complaintId = String(body.complaint_id ?? '').trim();
  const mobile = normalizeMobileNumber(body.mobile);
  const rating = Number(body.rating);
  const comment = String(body.comment ?? '').trim();
  const rawConfirmed = body.resolution_confirmed;

  if (!complaintId || !COMPLAINT_ID_REGEX.test(complaintId)) {
    return { valid: false, message: 'Please enter a valid Complaint ID.' };
  }

  if (!MOBILE_REGEX.test(mobile)) {
    return { valid: false, message: 'Please enter a valid 10-digit mobile number.' };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { valid: false, message: 'Please select a star rating between 1 and 5.' };
  }

  if (comment.length > 1000) {
    return { valid: false, message: 'Feedback comment must be 1000 characters or fewer.' };
  }

  let resolutionConfirmed;
  if (typeof rawConfirmed === 'boolean') {
    resolutionConfirmed = rawConfirmed;
  } else if (rawConfirmed === 'true' || rawConfirmed === 1 || rawConfirmed === '1') {
    resolutionConfirmed = true;
  } else if (rawConfirmed === 'false' || rawConfirmed === 0 || rawConfirmed === '0') {
    resolutionConfirmed = false;
  } else {
    return { valid: false, message: 'Please confirm whether the issue is resolved or needs reopening.' };
  }

  return {
    valid: true,
    data: {
      complaintId,
      mobile,
      rating,
      comment,
      resolutionConfirmed,
    },
  };
}

function validateVoteAction(body = {}, { requireToken = true } = {}) {
  const complaintId = String(body.complaint_id ?? '').trim();
  const mobile = normalizeMobileNumber(body.mobile);
  const verificationToken = String(body.verification_token ?? '').trim();

  if (!complaintId || !COMPLAINT_ID_REGEX.test(complaintId)) {
    return { valid: false, message: 'Please enter a valid Complaint ID.' };
  }

  if (!MOBILE_REGEX.test(mobile)) {
    return { valid: false, message: 'Please enter a valid 10-digit mobile number.' };
  }

  if (requireToken && !verificationToken) {
    return { valid: false, message: 'Mobile verification token is required before voting.' };
  }

  if (verificationToken.length > 255) {
    return { valid: false, message: 'Invalid verification token format.' };
  }

  return {
    valid: true,
    data: {
      complaintId,
      mobile,
      verificationToken,
    },
  };
}

module.exports = {
  validateCreateComplaint,
  validateTrackComplaint,
  validateLookupMobile,
  validateLogin,
  validateStatusUpdate,
  validateFeedbackSubmit,
  validateVoteAction,
};

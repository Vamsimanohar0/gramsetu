const { ALLOWED_STATUSES } = require('../utils/complaintUtils');

function validateCreateComplaint(body = {}) {
  const name = String(body.name ?? '').trim();
  const mobile = String(body.mobile ?? '').trim();
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

  if (!/^[0-9]{10}$/.test(mobile)) {
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

  return {
    valid: true,
    data: { complaintId, mobile },
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
  return { valid: true, data: { status } };
}

module.exports = {
  validateCreateComplaint,
  validateTrackComplaint,
  validateLogin,
  validateStatusUpdate,
};


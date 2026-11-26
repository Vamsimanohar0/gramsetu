const complaintService = require('../services/complaintService');
const { validateStatusUpdate } = require('../validators/complaintValidator');

async function dashboard(req, res, next) {
  try {
    const data = await complaintService.getDashboardData(req.panchayath.id);
    return res.json({
      status: 'success',
      panchayath: req.panchayath,
      ...data,
    });
  } catch (err) {
    return next(err);
  }
}

async function listComplaints(req, res, next) {
  try {
    const { status = '', search = '' } = req.query;
    const complaints = await complaintService.getAdminComplaints(req.panchayath.id, {
      status: String(status),
      search: String(search),
    });

    return res.json({
      status: 'success',
      complaints,
    });
  } catch (err) {
    return next(err);
  }
}

async function getComplaint(req, res, next) {
  try {
    const complaint = await complaintService.getAdminComplaintById(
      req.panchayath.id,
      req.params.id
    );

    if (!complaint) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found.',
      });
    }

    return res.json({
      status: 'success',
      complaint,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const validation = validateStatusUpdate(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        message: validation.message,
      });
    }

    const updated = await complaintService.updateAdminComplaintStatus(
      req.panchayath.id,
      req.params.id,
      validation.data.status
    );

    if (!updated) {
      return res.status(404).json({
        status: 'error',
        message: 'Complaint not found.',
      });
    }

    return res.json({
      status: 'success',
      message: 'Complaint status updated successfully!',
      complaint: updated,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  dashboard,
  listComplaints,
  getComplaint,
  updateStatus,
};


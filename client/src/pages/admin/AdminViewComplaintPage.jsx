import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, resolveUploadUrl } from '../../services/api';
import '../../styles/admin-view.css';
import '../../styles/features.css';

const STATUS_OPTIONS = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];

function formatDateTime(dateValue) {
  if (!dateValue) return 'N/A';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export default function AdminViewComplaintPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [complaint, setComplaint] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('Submitted');
  const [statusNote, setStatusNote] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'View Complaint - GramSetu';
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiRequest(`/api/admin/complaints/${id}`)
      .then((res) => {
        if (!active) return;
        if (res.complaint) {
          setComplaint(res.complaint);
          setSelectedStatus(res.complaint.status || 'Submitted');
        } else {
          navigate('/admin/complaints', { replace: true });
        }
      })
      .catch(() => {
        if (active) navigate('/admin/complaints', { replace: true });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, navigate]);

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    setSuccess('');
    setError('');
    setSaving(true);

    try {
      const res = await apiRequest(`/api/admin/complaints/${id}/status`, {
        method: 'PATCH',
        body: { status: selectedStatus, note: statusNote.trim() },
      });
      setComplaint(res.complaint);
      setSelectedStatus(res.complaint.status);
      setStatusNote('');
      setSuccess(res.message || 'Complaint status updated successfully!');
    } catch (err) {
      setError(err.message || 'Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-admin-view">
        <div className="container">
          <div className="card" style={{ textAlign: 'center' }}>
            <i className="fas fa-spinner fa-spin" style={{ color: '#7DFF6A', fontSize: '2rem' }} />
            <p style={{ marginTop: '12px', color: '#8a9bb5' }}>Loading complaint details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!complaint) {
    return null;
  }

  const statusClass = (complaint.status || '').toLowerCase().replace(/\s+/g, '-');
  const images = complaint.images || [];
  const hasAudio = complaint.audio_path && complaint.audio_path !== 'NULL';

  return (
    <div className="page-admin-view">
      <div className="container">
        <Link to="/admin/complaints" className="back-link">
          <i className="fas fa-arrow-left" /> Back to Complaints
        </Link>

        <div className="card">
          <h2>
            <i className="fas fa-clipboard-list" /> Complaint Details
          </h2>

          {success && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle" /> {success}
            </div>
          )}

          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle" /> {error}
            </div>
          )}

          <div className="detail-grid">
            <div className="detail-item">
              <div className="label">Complaint ID</div>
              <div className="value">{complaint.complaint_id}</div>
            </div>
            <div className="detail-item">
              <div className="label">Status</div>
              <div className="value">
                <span className={`status-badge ${statusClass}`}>{complaint.status}</span>
              </div>
            </div>
            <div className="detail-item">
              <div className="label">Citizen Name</div>
              <div className="value">{complaint.name}</div>
            </div>
            <div className="detail-item">
              <div className="label">Mobile Number</div>
              <div className="value">{complaint.mobile}</div>
            </div>
            <div className="detail-item">
              <div className="label">Village</div>
              <div className="value">{complaint.village || 'N/A'}</div>
            </div>
            <div className="detail-item">
              <div className="label">Ward Number</div>
              <div className="value">{complaint.ward_no || 'N/A'}</div>
            </div>
            <div className="detail-item">
              <div className="label">Category</div>
              <div className="value">{complaint.category}</div>
            </div>
            <div className="detail-item">
              <div className="label">Submitted On</div>
              <div className="value">{formatDateTime(complaint.created_at)}</div>
            </div>
            <div className="detail-item">
              <div className="label">Community Votes</div>
              <div className="value">{Number(complaint.vote_count || 0)}</div>
            </div>
            <div className="detail-item">
              <div className="label">Pinned Location</div>
              <div className="value">
                {complaint.has_location
                  ? `${Number(complaint.latitude).toFixed(5)}, ${Number(complaint.longitude).toFixed(5)} (${complaint.location_source || 'pin'})`
                  : 'Not provided'}
              </div>
            </div>
            <div className="detail-item full-width">
              <div className="label">Title</div>
              <div className="value">{complaint.title}</div>
            </div>
            <div className="detail-item full-width">
              <div className="label">Description</div>
              <div className="value" style={{ whiteSpace: 'pre-line' }}>
                {complaint.description}
              </div>
            </div>
          </div>
        </div>

        {(images.length > 0 || hasAudio) && (
          <div className="card">
            <h2>
              <i className="fas fa-image" /> Evidence
            </h2>
            {images.map((imgPath, idx) => (
              <div key={imgPath} className="evidence-item">
                <i className="fas fa-image" />
                <a href={resolveUploadUrl(imgPath)} target="_blank" rel="noreferrer">
                  View Image {images.length > 1 ? idx + 1 : ''}
                </a>
              </div>
            ))}
            {hasAudio && (
              <div className="evidence-item">
                <i className="fas fa-microphone-alt" />
                <audio controls style={{ height: '30px', maxWidth: '300px' }}>
                  <source src={resolveUploadUrl(complaint.audio_path)} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              </div>
            )}
          </div>
        )}

        {complaint.feedback && (
          <div className="card">
            <h2>
              <i className="fas fa-star" /> Citizen Feedback
            </h2>
            <div className="detail-grid">
              <div className="detail-item">
                <div className="label">Rating</div>
                <div className="value">{complaint.feedback.rating} / 5 Stars</div>
              </div>
              <div className="detail-item">
                <div className="label">Resolution Confirmation</div>
                <div className="value">
                  {complaint.feedback.resolution_confirmed
                    ? 'Confirmed Resolved'
                    : 'Not Resolved (Reopen Requested)'}
                </div>
              </div>
              {complaint.feedback.comment && (
                <div className="detail-item full-width">
                  <div className="label">Citizen Comment</div>
                  <div className="value">{complaint.feedback.comment}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {Array.isArray(complaint.updates) && complaint.updates.length > 0 && (
          <div className="card">
            <h2>
              <i className="fas fa-history" /> Status History
            </h2>
            <div className="admin-timeline-list">
              {complaint.updates.map((u, idx) => (
                <div key={u.id || idx} className="admin-timeline-item">
                  <strong>{u.status}</strong> — {u.remarks}
                  <small>
                    Actor: {u.actor_type || 'system'} · {formatDateTime(u.updated_at)}
                  </small>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="card">
          <h2>
            <i className="fas fa-edit" /> Update Status
          </h2>
          <form onSubmit={handleUpdateStatus}>
            <div className="form-group">
              <label htmlFor="status">Change Status</label>
              <select
                name="status"
                id="status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                required
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="statusNote">Remarks / Action Note (Optional)</label>
              <input
                type="text"
                id="statusNote"
                maxLength={500}
                placeholder="Optional note recorded in complaint status history..."
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={saving}>
              <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'} />{' '}
              <span>{saving ? 'Updating...' : 'Update Status'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}


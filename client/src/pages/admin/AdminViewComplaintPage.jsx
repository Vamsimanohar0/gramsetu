import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { apiRequest, resolveUploadUrl } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
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
      <AdminLayout subtitle="Loading complaint inspection view">
        <section className="admin-glass-card" style={{ textAlign: 'center', padding: '44px 20px' }}>
          <i className="fas fa-spinner fa-spin" style={{ color: 'var(--accent-soft)', fontSize: '28px' }} />
          <p style={{ marginTop: '12px', color: 'var(--text-secondary)' }}>Loading complaint details...</p>
        </section>
      </AdminLayout>
    );
  }

  if (!complaint) {
    return null;
  }

  const statusClass = (complaint.status || '').toLowerCase().replace(/\s+/g, '-');
  const images = complaint.images || [];
  const hasAudio = complaint.audio_path && complaint.audio_path !== 'NULL';

  return (
    <AdminLayout subtitle={`Inspecting ${complaint.complaint_id} · ${complaint.village || 'Village'}`}>
      <div className="admin-toolbar-row">
        <Link to="/admin/complaints" className="admin-pill">
          <i className="fas fa-arrow-left" /> Back to Complaints
        </Link>
        <span className={`admin-status-badge ${statusClass}`}>{complaint.status}</span>
      </div>

      {success && (
        <div className="admin-alert success">
          <i className="fas fa-check-circle" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="admin-alert error">
          <i className="fas fa-exclamation-circle" />
          <span>{error}</span>
        </div>
      )}

      <div className="admin-detail-layout">
        <section className="admin-glass-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">
              <i className="fas fa-clipboard-list" style={{ color: 'var(--accent-soft)', marginRight: '8px' }} />
              Complaint Details
            </h2>
          </div>

          <div className="admin-form-grid">
            <div className="admin-detail-box">
              <div className="label">Complaint ID</div>
              <div className="value">{complaint.complaint_id}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Citizen Name</div>
              <div className="value">{complaint.name}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Mobile Number</div>
              <div className="value">{complaint.mobile}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Village</div>
              <div className="value">{complaint.village || 'N/A'}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Ward Number</div>
              <div className="value">{complaint.ward_no || 'N/A'}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Category</div>
              <div className="value">{complaint.category}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Submitted On</div>
              <div className="value">{formatDateTime(complaint.created_at)}</div>
            </div>
            <div className="admin-detail-box">
              <div className="label">Community Votes</div>
              <div className="value">{Number(complaint.vote_count || 0)}</div>
            </div>
            <div className="admin-detail-box full">
              <div className="label">Pinned Location</div>
              <div className="value">
                {complaint.has_location
                  ? `${Number(complaint.latitude).toFixed(5)}, ${Number(complaint.longitude).toFixed(5)} (${complaint.location_source || 'pin'})`
                  : 'Not provided'}
              </div>
            </div>
            <div className="admin-detail-box full">
              <div className="label">Title</div>
              <div className="value">{complaint.title}</div>
            </div>
            <div className="admin-detail-box full">
              <div className="label">Description</div>
              <div className="value" style={{ whiteSpace: 'pre-line', lineHeight: 1.5 }}>
                {complaint.description}
              </div>
            </div>
          </div>
        </section>

        <div className="admin-col-stack">
          <section className="admin-glass-card">
            <div className="admin-card-head">
              <h2 className="admin-card-title">
                <i className="fas fa-edit" style={{ color: 'var(--accent-soft)', marginRight: '8px' }} />
                Update Status
              </h2>
            </div>

            <form onSubmit={handleUpdateStatus} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label htmlFor="status" style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Change Status
                </label>
                <select
                  name="status"
                  id="status"
                  className="admin-select"
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

              <div>
                <label htmlFor="statusNote" style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Remarks / Action Note (Optional)
                </label>
                <input
                  type="text"
                  id="statusNote"
                  className="admin-input"
                  maxLength={500}
                  placeholder="Optional note recorded in status history..."
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
              </div>

              <button type="submit" className="admin-cta-btn" disabled={saving} style={{ justifyContent: 'center' }}>
                <i className={saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'} />
                <span>{saving ? 'Updating...' : 'Update Status'}</span>
              </button>
            </form>
          </section>

          {(images.length > 0 || hasAudio) && (
            <section className="admin-glass-card">
              <div className="admin-card-head">
                <h2 className="admin-card-title">
                  <i className="fas fa-image" style={{ color: 'var(--accent-soft)', marginRight: '8px' }} />
                  Uploaded Evidence
                </h2>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {images.map((imgPath, idx) => (
                  <a
                    key={imgPath}
                    href={resolveUploadUrl(imgPath)}
                    target="_blank"
                    rel="noreferrer"
                    className="admin-pill"
                  >
                    <i className="fas fa-image" style={{ color: 'var(--accent-soft)' }} />
                    <span>View Image {images.length > 1 ? idx + 1 : ''}</span>
                  </a>
                ))}
                {hasAudio && (
                  <audio controls style={{ height: '32px', maxWidth: '100%' }}>
                    <source src={resolveUploadUrl(complaint.audio_path)} type="audio/mpeg" />
                  </audio>
                )}
              </div>
            </section>
          )}

          {complaint.feedback && (
            <section className="admin-glass-card">
              <div className="admin-card-head">
                <h2 className="admin-card-title">
                  <i className="fas fa-star" style={{ color: 'var(--accent-soft)', marginRight: '8px' }} />
                  Citizen Feedback
                </h2>
              </div>
              <div className="admin-form-grid">
                <div className="admin-detail-box">
                  <div className="label">Rating</div>
                  <div className="value">{complaint.feedback.rating} / 5 Stars</div>
                </div>
                <div className="admin-detail-box">
                  <div className="label">Outcome</div>
                  <div className="value">
                    {complaint.feedback.resolution_confirmed ? 'Confirmed Resolved' : 'Reopen Requested'}
                  </div>
                </div>
                {complaint.feedback.comment && (
                  <div className="admin-detail-box full">
                    <div className="label">Comment</div>
                    <div className="value">{complaint.feedback.comment}</div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>

      {Array.isArray(complaint.updates) && complaint.updates.length > 0 && (
        <section className="admin-glass-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">
              <i className="fas fa-history" style={{ color: 'var(--accent-soft)', marginRight: '8px' }} />
              Status History
            </h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {complaint.updates.map((u, idx) => (
              <div
                key={u.id || idx}
                style={{
                  borderLeft: '2px solid var(--accent)',
                  paddingLeft: '14px',
                }}
              >
                <strong style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{u.status}</strong>
                <span style={{ color: 'var(--text-secondary)', fontSize: '13.5px' }}> — {u.remarks}</span>
                <small style={{ display: 'block', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Actor: {u.actor_type || 'system'} · {formatDateTime(u.updated_at)}
                </small>
              </div>
            ))}
          </div>
        </section>
      )}
    </AdminLayout>
  );
}

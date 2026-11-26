import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest, resolveUploadUrl } from '../services/api';
import '../styles/track.css';
import '../styles/features.css';

function getProgressPercentage(status) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return 25;
    case 'verified':
    case 'assigned':
      return 50;
    case 'in progress':
    case 'in-progress':
      return 75;
    case 'resolved':
    case 'completed':
      return 100;
    default:
      return 25;
  }
}

function getStatusBadgeMeta(status) {
  switch ((status || '').toLowerCase()) {
    case 'submitted':
      return { icon: 'fa-clock', color: '#f9b84a' };
    case 'verified':
    case 'assigned':
      return { icon: 'fa-check-circle', color: '#4CAF50' };
    case 'in progress':
    case 'in-progress':
      return { icon: 'fa-spinner fa-pulse', color: '#7DFF6A' };
    case 'resolved':
    case 'completed':
      return { icon: 'fa-check-circle', color: '#4CAF50' };
    case 'rejected':
      return { icon: 'fa-times-circle', color: '#ff6b6b' };
    default:
      return { icon: 'fa-circle', color: '#7DFF6A' };
  }
}

export default function TrackPage() {
  const [searchParams] = useSearchParams();
  const [complaintId, setComplaintId] = useState(searchParams.get('id') || '');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [tracked, setTracked] = useState(null);

  const [searchMobile, setSearchMobile] = useState('');
  const [lookupResults, setLookupResults] = useState(null);
  const [lookupError, setLookupError] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [feedbackText, setFeedbackText] = useState('');
  const [resolutionConfirmed, setResolutionConfirmed] = useState(true);
  const [feedbackEditing, setFeedbackEditing] = useState(false);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState({ type: '', text: '' });
  const [votingStatus, setVotingStatus] = useState({ enabled: false, message: '' });

  const complaintInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  useEffect(() => {
    document.title = 'GRAMSETU - Track Complaint';
    apiRequest('/api/votes/status')
      .then((res) => {
        if (res.voting) setVotingStatus(res.voting);
      })
      .catch(() => {});
  }, []);

  const handleTrack = async () => {
    const idTrimmed = complaintId.trim();
    const mobileTrimmed = mobile.trim();

    if (!idTrimmed || !mobileTrimmed) {
      alert('Please enter both Complaint ID and Mobile Number');
      return;
    }

    setLoading(true);
    setTracked(null);
    setNotFound(false);
    setFeedbackNotice({ type: '', text: '' });

    try {
      const data = await apiRequest('/api/complaints/track', {
        method: 'POST',
        body: { complaint_id: idTrimmed, mobile: mobileTrimmed },
      });

      if (data.status === 'success' && data.complaint) {
        setTracked(data);
        if (data.feedback) {
          setRating(data.feedback.rating || 5);
          setFeedbackText(data.feedback.comment || '');
          setResolutionConfirmed(Boolean(data.feedback.resolution_confirmed));
          setFeedbackEditing(false);
        } else {
          setRating(5);
          setFeedbackText('');
          setResolutionConfirmed(true);
          setFeedbackEditing(data.complaint.status === 'Resolved');
        }
      } else {
        setNotFound(true);
      }
    } catch (err) {
      if (err.status === 404) {
        setNotFound(true);
      } else {
        alert(`Error fetching complaint: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setComplaintId('');
    setMobile('');
    setTracked(null);
    setNotFound(false);
  };

  const handleLookupByMobile = async () => {
    const trimmedMobile = searchMobile.trim();
    if (!/^[0-9]{10}$/.test(trimmedMobile)) {
      setLookupError('Please enter a valid 10-digit mobile number');
      setLookupResults(null);
      return;
    }

    setLookupError('');
    setLookupLoading(true);
    try {
      const data = await apiRequest('/api/complaints/lookup', {
        method: 'POST',
        body: { mobile: trimmedMobile },
      });
      setLookupResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setLookupError(err.message || 'Unable to look up complaints.');
      setLookupResults(null);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleFeedbackSubmit = async () => {
    if (!complaint?.complaint_id || !mobile.trim()) {
      setFeedbackNotice({
        type: 'error',
        text: 'Please track your complaint with your registered mobile number first.',
      });
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackNotice({ type: '', text: '' });
    try {
      const res = await apiRequest('/api/complaints/feedback', {
        method: 'POST',
        body: {
          complaint_id: complaint.complaint_id,
          mobile: mobile.trim(),
          rating,
          comment: feedbackText.trim(),
          resolution_confirmed: resolutionConfirmed,
        },
      });

      setTracked((prev) =>
        prev
          ? {
              ...prev,
              complaint: { ...prev.complaint, status: res.complaint_status },
              feedback: res.feedback,
              updates: res.updates || prev.updates,
            }
          : prev
      );
      setFeedbackEditing(false);
      setFeedbackNotice({
        type: 'success',
        text: res.message || 'Feedback saved successfully!',
      });
    } catch (err) {
      setFeedbackNotice({
        type: 'error',
        text: err.message || 'Unable to submit feedback right now.',
      });
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const complaint = tracked?.complaint || null;
  const updates = tracked?.updates || [];
  const percentage = complaint ? getProgressPercentage(complaint.status) : 0;
  const badgeMeta = complaint
    ? getStatusBadgeMeta(complaint.status)
    : { icon: 'fa-spinner fa-pulse', color: '#7DFF6A' };
  const evidenceImages = complaint?.images || [];
  const hasAudio =
    complaint?.audio_path && complaint.audio_path !== 'NULL' && complaint.audio_path !== '';

  return (
    <div className="page-track">
      <Navbar />

      <div className="wave-bg">
        <div className="wave" />
        <div className="wave" />
        <div className="wave" />
      </div>

      <div className="app">
        <section style={{ textAlign: 'center', padding: '1rem 0 0.8rem', marginTop: '100px' }}>
          <div className="badge" style={{ margin: '0 auto 1rem', width: 'fit-content' }}>
            <i className="fas fa-search" style={{ color: '#7DFF6A' }} /> Track Complaint
          </div>
          <h1>Track Your Complaint Status</h1>
          <p className="subhead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Enter your Complaint ID to view real-time progress and updates from your Panchayat.
          </p>
        </section>

        <div className="tracking-wrapper">
          <div className="glass tracking-card">
            <section className="glass" style={{ marginBottom: '2rem' }}>
              <h3
                style={{
                  fontWeight: 500,
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                }}
              >
                <i className="fas fa-file-alt" style={{ color: '#7DFF6A' }} /> Find Your Complaint
              </h3>
              <div className="form-group">
                <label htmlFor="complaintId">
                  <i className="fas fa-hashtag" style={{ marginRight: '6px', color: '#7DFF6A' }} />{' '}
                  Complaint ID
                </label>
                <div className="input-icon">
                  <i className="fas fa-id-card" />
                  <input
                    ref={complaintInputRef}
                    type="text"
                    id="complaintId"
                    placeholder="GS-2026-001245"
                    value={complaintId}
                    onChange={(e) => setComplaintId(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') mobileInputRef.current?.focus();
                    }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="mobile">
                  <i className="fas fa-phone-alt" style={{ marginRight: '6px', color: '#7DFF6A' }} />{' '}
                  Mobile Number
                </label>
                <div className="input-icon">
                  <i className="fas fa-mobile-alt" />
                  <input
                    ref={mobileInputRef}
                    type="tel"
                    id="mobile"
                    placeholder="9876543210"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleTrack();
                    }}
                  />
                </div>
              </div>
              <div className="btn-group">
                <button type="button" className="btn btn-primary" id="trackBtn" onClick={handleTrack}>
                  <i className="fas fa-search" /> Track Complaint
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  id="clearBtn"
                  onClick={handleClear}
                >
                  <i className="fas fa-undo-alt" /> Clear
                </button>
              </div>
            </section>
          </div>

          <div className="glass search-card">
            <h2>Find Your Complaint ID</h2>
            <p className="text-muted">
              Enter your registered mobile number to view all complaint IDs.
            </p>
            <div className="form-group">
              <label htmlFor="searchMobile">Mobile Number</label>
              <div className="input-icon">
                <i className="fas fa-phone" />
                <input
                  type="text"
                  id="searchMobile"
                  placeholder="Enter Mobile Number"
                  value={searchMobile}
                  onChange={(e) => setSearchMobile(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLookupByMobile();
                  }}
                />
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              id="searchComplaintBtn"
              onClick={handleLookupByMobile}
              disabled={lookupLoading}
            >
              <span>{lookupLoading ? 'Searching...' : 'Search Complaint IDs'}</span>
            </button>

            <div id="complaintList" className="mt-1">
              {lookupError && <p style={{ color: '#ff6b6b' }}>{lookupError}</p>}
              {!lookupError && lookupResults !== null && lookupResults.length === 0 && (
                <p>No complaints found.</p>
              )}
              {lookupResults !== null &&
                lookupResults.map((c) => (
                  <div
                    key={c.complaint_id}
                    className="complaint-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setComplaintId(c.complaint_id);
                      setMobile(searchMobile.trim());
                    }}
                  >
                    <h4>{c.complaint_id}</h4>
                    <p>{c.title}</p>
                    <p>
                      Status : <strong>{c.status}</strong>
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* LOADING STATE */}
        {loading && (
          <div id="loadingState" className="glass" style={{ textAlign: 'center', marginTop: '2rem' }}>
            <h3>
              <i className="fas fa-spinner fa-spin" /> Searching Complaint...
            </h3>
            <p>Please wait while we retrieve complaint details.</p>
          </div>
        )}

        {/* TRACKING RESULTS */}
        {complaint && !loading && (
          <div id="trackingResults">
            <section className="glass glass-light section-margin">
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                }}
              >
                <h3 style={{ fontWeight: 500 }}>
                  <i
                    className="fas fa-clipboard-list"
                    style={{ color: '#7DFF6A', marginRight: '10px' }}
                  />
                  Complaint Details
                </h3>
                <span className="status-badge" id="statusBadge">
                  <i
                    className={`fas ${badgeMeta.icon}`}
                    style={{ color: badgeMeta.color, marginRight: '6px' }}
                  />{' '}
                  <span>{complaint.status}</span>
                </span>
              </div>

              <div className="glass mt-1">
                <h4>
                  <i className="fas fa-align-left" /> Complaint Description
                </h4>
                <p id="complaintDescription">
                  {complaint.description || 'No description provided'}
                </p>
              </div>

              <div className="detail-grid" id="detailGrid">
                <div className="detail-item">
                  <div className="label">Complaint ID</div>
                  <div className="value">{complaint.complaint_id}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Citizen</div>
                  <div className="value">{complaint.name || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Category</div>
                  <div className="value">{complaint.category || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Mobile</div>
                  <div className="value">{complaint.mobile}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Village</div>
                  <div className="value">{complaint.village || 'N/A'}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Submitted</div>
                  <div className="value">
                    {complaint.created_at
                      ? new Date(complaint.created_at).toLocaleString()
                      : 'N/A'}
                  </div>
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  id="progressFill"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <div className="progress-label">
                <span>Submitted</span>
                <span id="progressPercentage">{percentage}% Complete</span>
                <span>Resolved</span>
              </div>

              <div style={{ marginTop: '2rem' }}>
                <h4 style={{ fontWeight: 500, marginBottom: '1.4rem' }}>
                  <i className="fas fa-clock" style={{ color: '#7DFF6A', marginRight: '8px' }} />
                  Status Timeline
                </h4>
                <div className="timeline" id="timelineContainer">
                  {updates.length === 0 ? (
                    <p style={{ color: '#b0c6e6' }}>No status updates available.</p>
                  ) : (
                    updates.map((item, idx) => {
                      const isLast = idx === updates.length - 1;
                      return (
                        <div key={idx} className="timeline-item">
                          <div className={`timeline-icon ${isLast ? 'current' : 'completed'}`}>
                            <i className={`fas ${isLast ? 'fa-circle' : 'fa-check'}`} />
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-title">{item.status || 'Update'}</div>
                            <div className="timeline-sub">
                              {item.remarks || ''}
                              {item.updated_at && (
                                <>
                                  <br />
                                  {new Date(item.updated_at).toLocaleString()}
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={{ marginTop: '2rem' }} id="evidenceSection">
                <h4 style={{ fontWeight: 500, marginBottom: '0.8rem' }}>
                  <i className="fas fa-images" style={{ color: '#7DFF6A', marginRight: '8px' }} />
                  Uploaded Evidence
                </h4>
                <div className="gallery" id="evidenceGallery">
                  {evidenceImages.length === 0 && !hasAudio && (
                    <p style={{ color: '#b0c6e6' }}>No evidence uploaded</p>
                  )}
                  {evidenceImages.map((imgPath, idx) => (
                    <div key={imgPath} className="gallery-item">
                      <i className="fas fa-image" />{' '}
                      <a href={resolveUploadUrl(imgPath)} target="_blank" rel="noreferrer">
                        View Image {evidenceImages.length > 1 ? idx + 1 : ''}
                      </a>
                    </div>
                  ))}
                  {hasAudio && (
                    <div className="gallery-item">
                      <i className="fas fa-microphone-alt" />
                      <audio controls style={{ height: '30px', maxWidth: '200px' }}>
                        <source src={resolveUploadUrl(complaint.audio_path)} type="audio/mpeg" />
                        Your browser does not support the audio element.
                      </audio>
                    </div>
                  )}
                </div>
              </div>

              <div className="community-vote-box">
                <div className="vote-meta-row">
                  <div>
                    <h4 style={{ fontWeight: 500, marginBottom: '0.2rem' }}>
                      <i className="fas fa-thumbs-up" style={{ color: '#7DFF6A', marginRight: '8px' }} />
                      Community Support Votes
                    </h4>
                    <small style={{ color: '#9ab5a6' }}>
                      {votingStatus.message ||
                        'Verified mobile OTP voting is disabled until an SMS verification provider is configured.'}
                    </small>
                  </div>
                  <div className="vote-count-pill">
                    <span>{Number(complaint.vote_count || 0)} Votes</span>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: '0.25rem 0.7rem', fontSize: '0.78rem', opacity: votingStatus.enabled ? 1 : 0.6 }}
                      disabled={!votingStatus.enabled}
                    >
                      {votingStatus.enabled ? 'Vote / Withdraw' : 'Verification Required'}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '2.2rem' }}>
                <h4 style={{ fontWeight: 500 }}>
                  <i className="fas fa-star" style={{ color: '#7DFF6A', marginRight: '8px' }} />
                  Citizen Feedback &amp; Reopening
                </h4>

                {tracked?.feedback && !feedbackEditing ? (
                  <div className="feedback-summary-box">
                    <p style={{ color: '#e9fff2', marginBottom: '0.4rem' }}>
                      <strong>Your Rating:</strong> {tracked.feedback.rating} / 5 Stars ·{' '}
                      <strong>Outcome:</strong>{' '}
                      {tracked.feedback.resolution_confirmed
                        ? 'Resolution Confirmed'
                        : 'Reopened (Issue Not Resolved)'}
                    </p>
                    {tracked.feedback.comment && (
                      <p style={{ color: '#b0c6e6', marginBottom: '0.6rem' }}>
                        &ldquo;{tracked.feedback.comment}&rdquo;
                      </p>
                    )}
                    {complaint.status === 'Resolved' && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.45rem 1rem', fontSize: '0.85rem' }}
                        onClick={() => setFeedbackEditing(true)}
                      >
                        <i className="fas fa-edit" /> Edit Feedback / Confirm Resolution
                      </button>
                    )}
                  </div>
                ) : complaint.status === 'Resolved' ? (
                  <>
                    <div className="stars" id="starRating">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <i
                          key={star}
                          className="fas fa-star"
                          data-star={star}
                          style={{
                            cursor: 'pointer',
                            color: star <= rating ? '#FFD700' : '#4a5d7a',
                          }}
                          onClick={() => setRating(star)}
                        />
                      ))}
                    </div>

                    <div className="confirm-choice-group">
                      <button
                        type="button"
                        className={`confirm-choice-btn${resolutionConfirmed ? ' active-resolved' : ''}`}
                        onClick={() => setResolutionConfirmed(true)}
                      >
                        <i className="fas fa-check-circle" /> Yes, Issue Resolved
                      </button>
                      <button
                        type="button"
                        className={`confirm-choice-btn${!resolutionConfirmed ? ' active-reopen' : ''}`}
                        onClick={() => setResolutionConfirmed(false)}
                      >
                        <i className="fas fa-undo" /> No, Reopen Complaint
                      </button>
                    </div>

                    <div className="form-group" style={{ marginTop: '0.2rem' }}>
                      <textarea
                        rows={2}
                        id="feedbackText"
                        maxLength={1000}
                        placeholder="Optional comment about the resolution or why it needs reopening..."
                        value={feedbackText}
                        onChange={(e) => setFeedbackText(e.target.value)}
                        style={{
                          borderRadius: '1.8rem',
                          padding: '0.9rem 1.4rem',
                          width: '100%',
                          background: 'rgba(255,255,255,0.02)',
                          border: '1px solid rgba(125,255,106,0.08)',
                          color: '#fff',
                        }}
                      />
                    </div>
                    <div className="flex-center">
                      <button
                        type="button"
                        className="btn btn-primary"
                        id="submitFeedback"
                        style={{ width: 'auto' }}
                        disabled={feedbackSubmitting}
                        onClick={handleFeedbackSubmit}
                      >
                        <i className={feedbackSubmitting ? 'fas fa-spinner fa-spin' : 'fas fa-paper-plane'} />{' '}
                        {feedbackSubmitting
                          ? 'Submitting...'
                          : resolutionConfirmed
                            ? 'Submit Feedback'
                            : 'Submit Feedback & Reopen Complaint'}
                      </button>
                      {tracked?.feedback && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => setFeedbackEditing(false)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="feedback-notice info">
                    Feedback and complaint reopening become available once the Panchayat marks this complaint as{' '}
                    <strong>Resolved</strong>.
                  </div>
                )}

                {feedbackNotice.text && (
                  <div className={`feedback-notice ${feedbackNotice.type}`}>
                    {feedbackNotice.text}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}

        {/* NOT FOUND STATE */}
        {notFound && !loading && (
          <section className="glass" id="notFoundState" style={{ margin: '2rem 0' }}>
            <div className="not-found">
              <i className="fas fa-search" style={{ fontSize: '3rem', color: '#7DFF6A' }} />
              <h3 style={{ color: '#d6e4ff' }}>Complaint Not Found</h3>
              <p className="text-muted" style={{ maxWidth: '300px', margin: '0.4rem auto' }}>
                Please verify your Complaint ID and try again.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                id="tryAgainBtn"
                style={{ marginTop: '1.2rem' }}
                onClick={() => {
                  setNotFound(false);
                  complaintInputRef.current?.focus();
                }}
              >
                <i className="fas fa-redo" /> Try Again
              </button>
            </div>
          </section>
        )}

        {/* FAQ SECTION */}
        <section className="glass glass-light section-margin">
          <h3 style={{ fontWeight: 500, marginBottom: '1.5rem' }}>
            <i
              className="fas fa-question-circle"
              style={{ color: '#7DFF6A', marginRight: '10px' }}
            />
            Frequently Asked Questions
          </h3>
          <div className="faq-item">
            <strong>How do I find my Complaint ID?</strong>
            <p>Your Complaint ID is sent via SMS and email after submission. It starts with &apos;GS-&apos;.</p>
          </div>
          <div className="faq-item">
            <strong>How often is status updated?</strong>
            <p>Status is updated in real-time. You may see changes within 2–4 hours of any action.</p>
          </div>
          <div className="faq-item">
            <strong>Can I edit my complaint?</strong>
            <p>Edits are allowed only within 24 hours of submission. Contact support for changes.</p>
          </div>
          <div className="faq-item">
            <strong>How do I contact support?</strong>
            <p>Call 1800-123-4567 or email support@gramsetu.gov.in (Mon-Sat 10am-5pm).</p>
          </div>
        </section>

        <footer className="footer">
          <p>
            © 2026 GramSetu · Panchayat Grievance Management · Built with{' '}
            <span style={{ color: '#7DFF6A' }}>❤</span> for rural India
          </p>
          <p style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>Track · Resolve · Empower</p>
        </footer>
      </div>
    </div>
  );
}


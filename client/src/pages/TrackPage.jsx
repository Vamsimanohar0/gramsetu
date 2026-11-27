import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { apiRequest, resolveUploadUrl } from '../services/api';
import { getStatusDisplayMeta, isVoteEligibleStatus } from '../utils/statusProgress';
import '../styles/track.css';
import '../styles/features.css';

const AUTO_REFRESH_INTERVAL_MS = 30000;

function dedupeStatusUpdates(list = []) {
  const seen = new Set();
  const result = [];
  for (const item of list) {
    const key =
      item?.id !== undefined && item?.id !== null
        ? `id:${item.id}`
        : `txt:${item?.status || ''}|${item?.updated_at || ''}|${item?.remarks || ''}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export default function TrackPage() {
  const [searchParams] = useSearchParams();
  const [complaintId, setComplaintId] = useState(searchParams.get('id') || '');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [tracked, setTracked] = useState(null);
  const [activeTarget, setActiveTarget] = useState(null);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [refreshError, setRefreshError] = useState('');
  const [pollingPaused, setPollingPaused] = useState(false);

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

  const [voteSubmitting, setVoteSubmitting] = useState(false);
  const [voteNotice, setVoteNotice] = useState({ type: '', text: '' });

  const complaintInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const inFlightRef = useRef(false);
  const abortControllerRef = useRef(null);
  const feedbackEditingRef = useRef(false);
  const lastUpdatedAtRef = useRef(null);

  useEffect(() => {
    feedbackEditingRef.current = feedbackEditing;
  }, [feedbackEditing]);

  useEffect(() => {
    document.title = 'GRAMSETU - Track Complaint';
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const fetchTrackedComplaint = useCallback(
    async ({ idTrimmed, mobileTrimmed, silent = false }) => {
      if (!idTrimmed || !mobileTrimmed) return;
      if (silent && inFlightRef.current) return;

      if (!silent) {
        abortControllerRef.current?.abort();
        setLoading(true);
        setTracked(null);
        setNotFound(false);
        setTrackError('');
        setFeedbackNotice({ type: '', text: '' });
        setVoteNotice({ type: '', text: '' });
        setRefreshError('');
        setPollingPaused(false);
      } else {
        setIsRefreshing(true);
      }

      inFlightRef.current = true;
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        const data = await apiRequest('/api/complaints/track', {
          method: 'POST',
          body: { complaint_id: idTrimmed, mobile: mobileTrimmed },
          signal: controller.signal,
        });

        if (data.status === 'success' && data.complaint) {
          const dedupedData = {
            ...data,
            updates: dedupeStatusUpdates(Array.isArray(data.updates) ? data.updates : []),
          };
          setTracked(dedupedData);
          const now = new Date();
          setLastUpdatedAt(now);
          lastUpdatedAtRef.current = now;
          setRefreshError('');
          setPollingPaused(false);
          setActiveTarget((prev) =>
            prev && prev.complaintId === idTrimmed && prev.mobile === mobileTrimmed
              ? prev
              : { complaintId: idTrimmed, mobile: mobileTrimmed }
          );

          if (!silent || !feedbackEditingRef.current) {
            if (data.feedback) {
              setRating(data.feedback.rating || 5);
              setFeedbackText(data.feedback.comment || '');
              setResolutionConfirmed(Boolean(data.feedback.resolution_confirmed));
              if (!silent) setFeedbackEditing(false);
            } else if (!silent) {
              setRating(5);
              setFeedbackText('');
              setResolutionConfirmed(true);
              setFeedbackEditing(data.complaint.status === 'Resolved');
            }
          }
        } else if (!silent) {
          setActiveTarget(null);
          setNotFound(true);
        }
      } catch (err) {
        if (err?.name === 'AbortError') return;

        if (!silent) {
          if (err.status === 404) {
            setActiveTarget(null);
            setNotFound(true);
          } else {
            setActiveTarget(null);
            setTrackError(
              err.message || 'Unable to fetch complaint details right now. Please try again shortly.'
            );
          }
        } else {
          // Preserve existing loaded complaint data on background refresh failures
          if (err.status === 429) {
            setPollingPaused(true);
            setRefreshError('Auto-refresh paused temporarily due to request limit. Click Refresh shortly.');
          } else {
            setRefreshError(
              `Unable to refresh status (${err.message || 'network error'}). Showing last loaded details.`
            );
          }
        }
      } finally {
        inFlightRef.current = false;
        if (!silent) {
          setLoading(false);
        } else {
          setIsRefreshing(false);
        }
      }
    },
    []
  );

  const handleTrack = async () => {
    const idTrimmed = complaintId.trim();
    const mobileTrimmed = mobile.trim();

    if (!idTrimmed || !mobileTrimmed) {
      alert('Please enter both Complaint ID and Mobile Number');
      return;
    }

    await fetchTrackedComplaint({ idTrimmed, mobileTrimmed, silent: false });
  };

  useEffect(() => {
    if (!activeTarget || pollingPaused || typeof document === 'undefined') {
      return undefined;
    }

    let timerId = null;

    const startPolling = () => {
      if (timerId) clearInterval(timerId);
      if (document.visibilityState === 'hidden') return;
      timerId = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchTrackedComplaint({
            idTrimmed: activeTarget.complaintId,
            mobileTrimmed: activeTarget.mobile,
            silent: true,
          });
        }
      }, AUTO_REFRESH_INTERVAL_MS);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        if (timerId) {
          clearInterval(timerId);
          timerId = null;
        }
      } else {
        const lastTime = lastUpdatedAtRef.current?.getTime() || 0;
        if (Date.now() - lastTime >= 10000) {
          fetchTrackedComplaint({
            idTrimmed: activeTarget.complaintId,
            mobileTrimmed: activeTarget.mobile,
            silent: true,
          });
        }
        startPolling();
      }
    };

    startPolling();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timerId) clearInterval(timerId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      abortControllerRef.current?.abort();
    };
  }, [activeTarget, pollingPaused, fetchTrackedComplaint]);

  const handleClear = () => {
    abortControllerRef.current?.abort();
    setActiveTarget(null);
    setComplaintId('');
    setMobile('');
    setTracked(null);
    setNotFound(false);
    setTrackError('');
    setLastUpdatedAt(null);
    lastUpdatedAtRef.current = null;
    setRefreshError('');
    setPollingPaused(false);
    setVoteNotice({ type: '', text: '' });
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

  const handleVoteToggle = async () => {
    if (!complaint?.complaint_id || voteSubmitting) return;
    setVoteSubmitting(true);
    setVoteNotice({ type: '', text: '' });

    const currentlyVoted = Boolean(complaint.user_voted);
    try {
      const res = await apiRequest(
        `/api/complaints/${encodeURIComponent(complaint.complaint_id)}/votes`,
        {
          method: currentlyVoted ? 'DELETE' : 'POST',
        }
      );

      setTracked((prev) =>
        prev
          ? {
              ...prev,
              complaint: {
                ...prev.complaint,
                vote_count: res.vote_count,
                user_voted: res.user_voted,
              },
            }
          : prev
      );
      setVoteNotice({
        type: 'success',
        text: res.message || (res.user_voted ? 'Support recorded.' : 'Support withdrawn.'),
      });
    } catch (err) {
      setVoteNotice({
        type: 'error',
        text: err.message || 'Unable to update vote right now.',
      });
    } finally {
      setVoteSubmitting(false);
    }
  };

  const complaint = tracked?.complaint || null;
  const updates = tracked?.updates || [];
  const statusMeta = getStatusDisplayMeta(complaint?.status);
  const canVote = complaint ? isVoteEligibleStatus(complaint.status) : false;
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
            Enter your Complaint ID and mobile number to view current progress and official updates from your Panchayat.
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

        {/* NON-404 ERROR STATE */}
        {trackError && !loading && (
          <section className="glass" id="trackErrorState" style={{ margin: '2rem 0' }}>
            <div className="feedback-notice error" role="alert">
              <i className="fas fa-exclamation-triangle" style={{ marginRight: '8px' }} />
              {trackError}
            </div>
          </section>
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
                <span className={`status-badge ${statusMeta.barClass}`} id="statusBadge">
                  <i
                    className={`fas ${statusMeta.icon}`}
                    style={{ color: statusMeta.color, marginRight: '6px' }}
                  />{' '}
                  <span>{statusMeta.label}</span>
                </span>
              </div>

              <div className="refresh-meta-bar">
                <span>
                  <i className={isRefreshing ? 'fas fa-sync fa-spin' : 'fas fa-sync-alt'} style={{ marginRight: '6px', color: '#7DFF6A' }} />
                  {lastUpdatedAt
                    ? `Last updated: ${lastUpdatedAt.toLocaleTimeString()} (auto-refreshes every 30s while open)`
                    : 'Auto-refresh active while tab is open'}
                </span>
                <button
                  type="button"
                  className="refresh-meta-btn"
                  disabled={isRefreshing || !activeTarget}
                  onClick={() =>
                    activeTarget &&
                    fetchTrackedComplaint({
                      idTrimmed: activeTarget.complaintId,
                      mobileTrimmed: activeTarget.mobile,
                      silent: true,
                    })
                  }
                >
                  {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
                </button>
              </div>
              {refreshError && <div className="feedback-notice error">{refreshError}</div>}

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
                  className={`progress-fill ${statusMeta.barClass}`}
                  id="progressFill"
                  style={{ width: `${statusMeta.percentage}%` }}
                />
              </div>
              <div className="progress-label">
                <span>{statusMeta.leftLabel}</span>
                <span id="progressPercentage">{statusMeta.stageLabel}</span>
                <span>{statusMeta.rightLabel}</span>
              </div>
              {statusMeta.note && <p className="terminal-status-note">{statusMeta.note}</p>}

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
                      {canVote
                        ? 'Citizens can support active complaints (one vote per browser, no account or login needed).'
                        : 'Voting is closed because this complaint is no longer in an active stage.'}
                    </small>
                  </div>
                  <div className="vote-count-pill">
                    <span>{Number(complaint.vote_count || 0)} Votes</span>
                    <button
                      type="button"
                      id="trackVoteBtn"
                      className="btn btn-secondary"
                      style={{
                        padding: '0.25rem 0.75rem',
                        fontSize: '0.78rem',
                        opacity: canVote ? 1 : 0.55,
                      }}
                      disabled={!canVote || voteSubmitting}
                      onClick={handleVoteToggle}
                    >
                      {voteSubmitting
                        ? 'Saving...'
                        : complaint.user_voted
                          ? 'Withdraw Support'
                          : 'Support Complaint'}
                    </button>
                  </div>
                </div>
                {voteNotice.text && (
                  <div className={`feedback-notice ${voteNotice.type}`} style={{ marginTop: '0.6rem' }}>
                    {voteNotice.text}
                  </div>
                )}
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
                Please check your Complaint ID and mobile number and try again.
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
            <p>
              Your Complaint ID (starting with &apos;GS-&apos;) is shown on-screen immediately after submitting a complaint. You can also use &quot;Find Your Complaint ID&quot; above with your registered mobile number.
            </p>
          </div>
          <div className="faq-item">
            <strong>How are complaint statuses updated?</strong>
            <p>
              Panchayat officials update your complaint status as they review and act on it. While this tracking page stays open, it automatically checks for new updates.
            </p>
          </div>
          <div className="faq-item">
            <strong>Can I edit my complaint or submit feedback?</strong>
            <p>
              Submitted complaint details cannot be edited directly. Once a complaint is marked Resolved, you can rate the resolution, leave feedback, or reopen it here if the issue is not fixed.
            </p>
          </div>
          <div className="faq-item">
            <strong>Need help from your Panchayat?</strong>
            <p>
              Please check your status history above or contact your local Gram Panchayat office directly with your Complaint ID.
            </p>
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


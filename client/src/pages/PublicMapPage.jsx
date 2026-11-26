import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ComplaintClusterMap from '../components/ComplaintClusterMap';
import { apiRequest } from '../services/api';
import '../styles/track.css';
import '../styles/features.css';

const CATEGORY_OPTIONS = [
  'Road Damage',
  'Street Light',
  'Drainage Issue',
  'Water Supply',
  'Garbage Collection',
  'Public Safety',
  'Other',
];

const STATUS_OPTIONS = ['Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];

export default function PublicMapPage() {
  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [mapData, setMapData] = useState({
    complaints: [],
    markers: [],
    summary: { total: 0, mapped: 0, unmapped: 0 },
  });
  const [votingStatus, setVotingStatus] = useState({ enabled: false, message: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    document.title = 'GRAMSETU - Complaint Map';
    apiRequest('/api/villages')
      .then((res) => setVillages(Array.isArray(res.villages) ? res.villages : []))
      .catch(() => setVillages([]));

    apiRequest('/api/votes/status')
      .then((res) => {
        if (res.voting) setVotingStatus(res.voting);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (villageId) params.set('village_id', villageId);
    if (category) params.set('category', category);
    if (status) params.set('status', status);
    const qs = params.toString();

    apiRequest(`/api/complaints/map${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (!active) return;
        setMapData({
          complaints: Array.isArray(res.complaints) ? res.complaints : [],
          markers: Array.isArray(res.markers) ? res.markers : [],
          summary: res.summary || { total: 0, mapped: 0, unmapped: 0 },
        });
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load complaint map right now.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [villageId, category, status]);

  return (
    <div className="page-track page-map">
      <Navbar />

      <div className="wave-bg">
        <div className="wave" />
        <div className="wave" />
        <div className="wave" />
      </div>

      <div className="app">
        <section style={{ textAlign: 'center', padding: '1rem 0 0.8rem', marginTop: '100px' }}>
          <div className="badge" style={{ margin: '0 auto 1rem', width: 'fit-content' }}>
            <i className="fas fa-map-marked-alt" style={{ color: '#7DFF6A' }} /> Public Complaint Map
          </div>
          <h1>Village Issues Map</h1>
          <p className="subhead" style={{ marginLeft: 'auto', marginRight: 'auto' }}>
            Explore reported issues across villages. Public markers show only privacy-safe approximate locations.
          </p>
        </section>

        <section className="glass">
          <div className="gs-map-filters">
            <select
              aria-label="Filter map by village"
              value={villageId}
              onChange={(e) => setVillageId(e.target.value)}
            >
              <option value="">All Villages</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter map by category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter map by status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="gs-map-summary">
            <span className="gs-summary-pill">
              Total Matching: <strong>{mapData.summary.total}</strong>
            </span>
            <span className="gs-summary-pill">
              Shown on Map: <strong>{mapData.summary.mapped}</strong>
            </span>
            <span className="gs-summary-pill">
              Without Location Pin: <strong>{mapData.summary.unmapped}</strong>
            </span>
          </div>

          {error && <div className="feedback-notice error">{error}</div>}
          {tileError && (
            <div className="feedback-notice info">
              Map tiles could not load right now. Matching complaints remain listed below.
            </div>
          )}

          <ComplaintClusterMap
            markers={mapData.markers}
            isAdmin={false}
            onTileError={setTileError}
          />

          <div className="community-vote-box">
            <div className="vote-meta-row">
              <div>
                <strong style={{ color: '#e9fff2' }}>Community Support Voting</strong>
                <p style={{ color: '#a8bbd8', fontSize: '0.86rem', marginTop: '4px' }}>
                  {votingStatus.message ||
                    'Community voting requires mobile OTP verification (disabled until an SMS provider is configured).'}
                </p>
              </div>
              <span className="vote-count-pill">
                <i className={votingStatus.enabled ? 'fas fa-thumbs-up' : 'fas fa-lock'} />
                {votingStatus.enabled ? 'Verified Voting Active' : 'OTP Verification Pending'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '10px', color: '#e9fff2' }}>
              Public Complaints List ({mapData.complaints.length})
            </h3>
            {loading ? (
              <p style={{ color: '#a8bbd8' }}>Loading complaints...</p>
            ) : mapData.complaints.length === 0 ? (
              <p style={{ color: '#a8bbd8' }}>No complaints match the selected filters.</p>
            ) : (
              <div className="gs-complaint-cards">
                {mapData.complaints.map((item) => (
                  <div key={item.complaint_id} className="gs-complaint-card">
                    <div className="gs-complaint-card-top">
                      <strong style={{ color: '#7DFF6A' }}>{item.complaint_id}</strong>
                      <span className="badge">{item.status}</span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>
                      {item.village} · {item.category}
                    </p>
                    <p>
                      {item.has_location ? 'Approx. map pin available' : 'Submitted without map pin'} · Votes:{' '}
                      <strong>{item.vote_count}</strong>
                    </p>
                    <div className="vote-meta-row" style={{ marginTop: '4px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', opacity: votingStatus.enabled ? 1 : 0.6 }}
                        disabled={!votingStatus.enabled}
                        title={
                          votingStatus.enabled
                            ? 'Vote with verified mobile number'
                            : 'Voting is disabled until mobile OTP verification is configured'
                        }
                      >
                        <i className="fas fa-thumbs-up" /> Support ({item.vote_count})
                      </button>
                      <Link
                        to={`/track?id=${encodeURIComponent(item.complaint_id)}`}
                        style={{ color: '#7DFF6A', fontSize: '0.84rem' }}
                      >
                        Track Status →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}


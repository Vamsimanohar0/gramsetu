import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ComplaintClusterMap from '../../components/ComplaintClusterMap';
import { apiRequest } from '../../services/api';
import '../../styles/features.css';

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

export default function AdminMapPage() {
  const [villages, setVillages] = useState([]);
  const [villageId, setVillageId] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');

  const [mapData, setMapData] = useState({
    complaints: [],
    markers: [],
    summary: { total: 0, mapped: 0, unmapped: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tileError, setTileError] = useState(false);

  useEffect(() => {
    document.title = 'Complaint Map - GramSetu Admin';
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

    apiRequest(`/api/admin/complaints/map${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (!active) return;
        setVillages(Array.isArray(res.villages) ? res.villages : []);
        setMapData({
          complaints: Array.isArray(res.complaints) ? res.complaints : [],
          markers: Array.isArray(res.markers) ? res.markers : [],
          summary: res.summary || { total: 0, mapped: 0, unmapped: 0 },
        });
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load Panchayat map view.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [villageId, category, status]);

  return (
    <div className="page-admin-map">
      <div className="admin-map-container">
        <div className="admin-map-header">
          <div>
            <Link to="/admin/dashboard" style={{ color: '#7DFF6A', textDecoration: 'none' }}>
              <i className="fas fa-arrow-left" /> Dashboard
            </Link>
            <h1 style={{ marginTop: '6px' }}>
              Panchayat <span>Complaint Map</span>
            </h1>
          </div>
          <Link
            to="/admin/complaints"
            style={{
              color: '#060d08',
              background: '#7DFF6A',
              padding: '8px 16px',
              borderRadius: '10px',
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <i className="fas fa-list" /> List View
          </Link>
        </div>

        <div className="admin-map-card">
          <div className="gs-map-filters">
            <select
              aria-label="Filter Panchayat map by village"
              value={villageId}
              onChange={(e) => setVillageId(e.target.value)}
            >
              <option value="">All My Villages</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter Panchayat map by category"
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
              aria-label="Filter Panchayat map by status"
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
              Jurisdiction Complaints: <strong>{mapData.summary.total}</strong>
            </span>
            <span className="gs-summary-pill">
              Exact Pins Shown: <strong>{mapData.summary.mapped}</strong>
            </span>
            <span className="gs-summary-pill">
              Without Coordinates: <strong>{mapData.summary.unmapped}</strong>
            </span>
          </div>

          {error && <p style={{ color: '#ff8787', marginBottom: '12px' }}>{error}</p>}
          {tileError && (
            <p style={{ color: '#f9b84a', marginBottom: '12px' }}>
              Map tiles unavailable right now. Scoped complaint records remain accessible below.
            </p>
          )}

          <ComplaintClusterMap
            markers={mapData.markers}
            isAdmin={true}
            onTileError={setTileError}
          />

          <div style={{ marginTop: '20px' }}>
            <h3 style={{ marginBottom: '12px' }}>
              Scoped Complaints ({mapData.complaints.length})
            </h3>
            {loading ? (
              <p style={{ color: '#8a9bb5' }}>Loading Panchayat complaints...</p>
            ) : (
              <div className="gs-complaint-cards">
                {mapData.complaints.map((item) => (
                  <div key={item.id} className="gs-complaint-card">
                    <div className="gs-complaint-card-top">
                      <strong style={{ color: '#7DFF6A' }}>{item.complaint_id}</strong>
                      <span>{item.status}</span>
                    </div>
                    <h4>{item.title}</h4>
                    <p>
                      {item.village} · {item.category} · Citizen: {item.name}
                    </p>
                    <p>
                      {item.has_location
                        ? `Pin (${item.location_source}): ${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}`
                        : 'No location pin provided'}
                    </p>
                    <Link
                      to={`/admin/complaints/${item.id}`}
                      style={{ color: '#7DFF6A', fontWeight: 600, fontSize: '0.85rem' }}
                    >
                      Open Complaint Details →
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


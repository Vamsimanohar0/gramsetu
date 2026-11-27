import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ComplaintClusterMap from '../../components/ComplaintClusterMap';
import AdminLayout from '../../components/AdminLayout';
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
    <AdminLayout
      subtitle="Exact complaint pin locations across your Panchayat jurisdiction"
      villages={villages}
    >
      <div className="admin-toolbar-row">
        <div className="admin-pill-tabs">
          <Link to="/admin/dashboard" className="admin-pill">
            Overview
          </Link>
          <Link to="/admin/complaints" className="admin-pill">
            Complaints
          </Link>
          <Link to="/admin/map" className="admin-pill active">
            Map View
          </Link>
        </div>

        <Link to="/admin/complaints" className="admin-mini-pill">
          <i className="fas fa-list" /> List View
        </Link>
      </div>

      <section className="admin-glass-card">
        <div className="gs-map-filters">
          <select
            className="admin-select"
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
            className="admin-select"
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
            className="admin-select"
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

        {error && (
          <div className="admin-alert error" style={{ marginBottom: '12px' }}>
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
          </div>
        )}
        {tileError && (
          <p style={{ color: 'var(--warning)', marginBottom: '12px', fontSize: '13px' }}>
            Map tiles unavailable right now. Scoped complaint records remain accessible below.
          </p>
        )}

        <ComplaintClusterMap markers={mapData.markers} isAdmin={true} onTileError={setTileError} />

        <div style={{ marginTop: '20px' }}>
          <h3 className="admin-card-title" style={{ marginBottom: '12px' }}>
            Scoped Complaints ({mapData.complaints.length})
          </h3>
          {loading ? (
            <p className="admin-metric-sub">Loading Panchayat complaints...</p>
          ) : (
            <div className="gs-complaint-cards">
              {mapData.complaints.map((item) => (
                <div key={item.id} className="gs-complaint-card">
                  <div className="gs-complaint-card-top">
                    <strong style={{ color: 'var(--accent-soft)' }}>{item.complaint_id}</strong>
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
                    className="admin-action-link"
                    style={{ width: 'fit-content' }}
                  >
                    Open Complaint Details →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </AdminLayout>
  );
}

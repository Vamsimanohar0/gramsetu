import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';

const FILTER_STATUSES = ['', 'Submitted', 'Verified', 'Assigned', 'In Progress', 'Resolved', 'Rejected'];

function formatShortDate(dateValue) {
  if (!dateValue) return 'N/A';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function AdminComplaintsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get('status') || '';
  const urlSearch = searchParams.get('search') || '';

  const [searchInput, setSearchInput] = useState(urlSearch);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = 'Complaints - GramSetu';
  }, []);

  useEffect(() => {
    setSearchInput(urlSearch);
  }, [urlSearch]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (urlSearch) params.set('search', urlSearch);
    const qs = params.toString();

    apiRequest(`/api/admin/complaints${qs ? `?${qs}` : ''}`)
      .then((res) => {
        if (active) setComplaints(Array.isArray(res.complaints) ? res.complaints : []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load complaints.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [statusFilter, urlSearch]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (statusFilter) next.set('status', statusFilter);
    if (searchInput.trim()) next.set('search', searchInput.trim());
    setSearchParams(next);
  };

  const buildFilterTarget = (status) => {
    const next = new URLSearchParams();
    if (status) next.set('status', status);
    const qs = next.toString();
    return `/admin/complaints${qs ? `?${qs}` : ''}`;
  };

  return (
    <AdminLayout
      subtitle={`Manage and filter complaints${statusFilter ? ` · Filter: ${statusFilter}` : ''}`}
    >
      <div className="admin-toolbar-row">
        <div className="admin-pill-tabs">
          {FILTER_STATUSES.map((st) => {
            const label = st || 'All';
            const isActive = statusFilter === st;
            return (
              <Link
                key={label}
                to={buildFilterTarget(st)}
                className={`admin-pill${isActive ? ' active' : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <form className="admin-search-pill" onSubmit={handleSearchSubmit}>
          <i className="fas fa-search" />
          <input
            type="text"
            name="search"
            placeholder="Search by name, ID, mobile..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" aria-label="Search">
            Search
          </button>
        </form>
      </div>

      <section className="admin-glass-card">
        <div className="admin-card-head">
          <h2 className="admin-card-title">
            All Complaints ({loading ? '...' : complaints.length})
          </h2>
          <Link to="/admin/map" className="admin-mini-pill">
            <i className="fas fa-map-marked-alt" /> Open Map View
          </Link>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-secondary)' }}>
            <i className="fas fa-spinner fa-spin" style={{ color: 'var(--accent-soft)', fontSize: '24px' }} />
            <p style={{ marginTop: '10px' }}>Loading complaints...</p>
          </div>
        ) : error ? (
          <div className="admin-alert error">
            <i className="fas fa-exclamation-circle" />
            <span>{error}</span>
          </div>
        ) : complaints.length > 0 ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Citizen</th>
                  <th>Village</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((row) => {
                  const statusClass = (row.status || '').toLowerCase().replace(/\s+/g, '-');
                  const privacyClass =
                    row.privacy_mode === 'ANONYMOUS'
                      ? 'anonymous'
                      : row.privacy_mode === 'CONSENT'
                        ? 'consent'
                        : 'legacy';
                  const privacyLabel =
                    row.privacy_mode === 'ANONYMOUS'
                      ? 'Anonymous'
                      : row.privacy_mode === 'CONSENT'
                        ? 'Consent'
                        : 'Legacy';
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.complaint_id}</strong>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span>{row.is_anonymous ? 'Anonymous Citizen' : row.name || 'N/A'}</span>
                          <span className={`admin-privacy-pill ${privacyClass}`}>{privacyLabel}</span>
                        </div>
                      </td>
                      <td>{row.village || 'N/A'}</td>
                      <td>{row.category}</td>
                      <td>
                        <span className={`admin-status-badge ${statusClass}`}>{row.status}</span>
                      </td>
                      <td>{formatShortDate(row.created_at)}</td>
                      <td>
                        <Link to={`/admin/complaints/${row.id}`} className="admin-action-link">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '44px 0', color: 'var(--text-secondary)' }}>
            <i className="fas fa-inbox" style={{ fontSize: '36px', marginBottom: '12px', display: 'block', opacity: 0.6 }} />
            <h3>No complaints found</h3>
            <p style={{ marginTop: '4px', fontSize: '13px' }}>
              {statusFilter ? `No ${statusFilter} complaints` : 'No complaints from your villages yet'}
            </p>
          </div>
        )}
      </section>
    </AdminLayout>
  );
}

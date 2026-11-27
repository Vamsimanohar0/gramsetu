import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiRequest } from '../../services/api';
import '../../styles/admin-complaints.css';

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
    <div className="page-admin-complaints">
      <div className="container">
        <div className="header">
          <div>
            <Link to="/admin/dashboard" className="back-link">
              <i className="fas fa-arrow-left" /> Dashboard
            </Link>
            <h1>
              All <span>Complaints</span>
            </h1>
          </div>
          <div className="search-box">
            <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Link to="/admin/map" className="back-link" style={{ margin: 0, whiteSpace: 'nowrap' }}>
                <i className="fas fa-map-marked-alt" /> Map
              </Link>
              <input
                type="text"
                name="search"
                placeholder="Search by name, ID, mobile..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" aria-label="Search">
                <i className="fas fa-search" />
              </button>
            </form>
          </div>
        </div>

        <div className="filters">
          {FILTER_STATUSES.map((st) => {
            const label = st || 'All';
            const isActive = statusFilter === st;
            return (
              <Link
                key={label}
                to={buildFilterTarget(st)}
                className={`filter-btn${isActive ? ' active' : ''}`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="table-container">
          {loading ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-spin" />
              <p>Loading complaints...</p>
            </div>
          ) : error ? (
            <div className="empty-state">
              <i className="fas fa-exclamation-circle" style={{ color: '#ff6b6b' }} />
              <p style={{ color: '#ff6b6b' }}>{error}</p>
            </div>
          ) : complaints.length > 0 ? (
            <table>
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
                  return (
                    <tr key={row.id}>
                      <td>
                        <strong>{row.complaint_id}</strong>
                      </td>
                      <td>{row.name}</td>
                      <td>{row.village || 'N/A'}</td>
                      <td>{row.category}</td>
                      <td>
                        <span className={`status-badge ${statusClass}`}>{row.status}</span>
                      </td>
                      <td>{formatShortDate(row.created_at)}</td>
                      <td>
                        <Link to={`/admin/complaints/${row.id}`} className="view-btn">
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="empty-state">
              <i className="fas fa-inbox" />
              <h3>No complaints found</h3>
              <p style={{ color: '#8a9bb5' }}>
                {statusFilter ? `No ${statusFilter} complaints` : 'No complaints from your villages yet'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


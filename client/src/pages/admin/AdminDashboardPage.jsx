import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import '../../styles/admin-dashboard.css';

const CHART_ITEMS = [
  { label: 'Submitted', color: '#f9b84a' },
  { label: 'Verified', color: '#3498db' },
  { label: 'In Progress', color: '#7DFF6A' },
  { label: 'Resolved', color: '#2ecc71' },
  { label: 'Rejected', color: '#ff6b6b' },
];

function formatShortDate(dateValue) {
  if (!dateValue) return 'N/A';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTodayHeader() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminDashboardPage() {
  const { panchayath, logout } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarRef = useRef(null);
  const toggleRef = useRef(null);

  useEffect(() => {
    document.title = `Dashboard - ${panchayath?.name || 'Panchayath'}`;
  }, [panchayath]);

  useEffect(() => {
    let active = true;
    apiRequest('/api/admin/dashboard')
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Failed to load dashboard data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (window.innerWidth <= 768) {
        if (
          sidebarRef.current &&
          !sidebarRef.current.contains(event.target) &&
          toggleRef.current &&
          !toggleRef.current.contains(event.target)
        ) {
          setSidebarOpen(false);
        }
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const panchayathName = data?.panchayath?.name || panchayath?.name || 'Panchayath';
  const villages = data?.villages || [];
  const villageNames = villages.map((v) => v.name);
  const stats = data?.stats || {
    total: 0,
    Submitted: 0,
    Verified: 0,
    'In Progress': 0,
    Resolved: 0,
    Rejected: 0,
  };
  const urgentCount = data?.urgentCount ?? (stats.Submitted || 0) + (stats.Verified || 0);
  const recentComplaints = data?.recentComplaints || [];
  const maxCount = Math.max(
    1,
    stats.Submitted || 0,
    stats.Verified || 0,
    stats['In Progress'] || 0,
    stats.Resolved || 0,
    stats.Rejected || 0
  );

  return (
    <div className="page-admin-dashboard">
      <aside ref={sidebarRef} className={`sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar">
        <div className="sidebar-brand">
          <i className="fas fa-landmark" />
          <h2>
            Gram<span>Setu</span>
          </h2>
        </div>

        <div className="sidebar-user">
          <div className="avatar">{panchayathName.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="name">{panchayathName}</div>
            <div className="role">Panchayath Admin</div>
          </div>
        </div>

        <ul className="sidebar-nav">
          <li>
            <Link to="/admin/dashboard" className="active">
              <i className="fas fa-chart-pie" /> Dashboard
            </Link>
          </li>
          <li>
            <Link to="/admin/complaints">
              <i className="fas fa-list" /> All Complaints{' '}
              <span className="badge">{stats.total || 0}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/complaints?status=Submitted">
              <i className="fas fa-clock" /> Pending{' '}
              <span className="badge">{stats.Submitted || 0}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/complaints?status=In%20Progress">
              <i className="fas fa-spinner" /> In Progress{' '}
              <span className="badge">{stats['In Progress'] || 0}</span>
            </Link>
          </li>
          <li>
            <Link to="/admin/complaints?status=Resolved">
              <i className="fas fa-check-circle" /> Resolved{' '}
              <span className="badge">{stats.Resolved || 0}</span>
            </Link>
          </li>
        </ul>

        <div className="sidebar-logout">
          <ul className="sidebar-nav">
            <li>
              <a href="#logout" onClick={handleLogout}>
                <i className="fas fa-sign-out-alt" /> Logout
              </a>
            </li>
          </ul>
        </div>
      </aside>

      <div className="main-content">
        <div className="top-bar">
          <div>
            <button
              ref={toggleRef}
              type="button"
              className="mobile-toggle"
              id="mobileToggle"
              onClick={() => setSidebarOpen((prev) => !prev)}
            >
              <i className="fas fa-bars" />
            </button>
            <h1>
              Dashboard <span>Overview</span>
            </h1>
          </div>
          <div className="top-actions">
            <span className="panchayath-info">
              <i className="fas fa-university" />
              {panchayathName}
              {villageNames.length > 0 && (
                <span style={{ color: '#4a5d7a', marginLeft: '5px' }}>
                  ({villageNames.length} villages)
                </span>
              )}
            </span>
            <span className="date">
              <i className="far fa-calendar-alt" /> {formatTodayHeader()}
            </span>
          </div>
        </div>

        {error && (
          <div className="alert-banner" style={{ borderColor: 'rgba(255, 82, 82, 0.3)', background: 'rgba(255, 82, 82, 0.1)' }}>
            <i className="fas fa-exclamation-circle" style={{ color: '#ff6b6b' }} />
            <div className="alert-text">{error}</div>
          </div>
        )}

        {urgentCount > 0 && (
          <div className="alert-banner">
            <i className="fas fa-exclamation-triangle" />
            <div className="alert-text">
              <strong>{urgentCount} pending complaints</strong> require your attention. Please review
              and take action.
            </div>
            <Link to="/admin/complaints?status=Submitted" className="alert-action">
              Review Now
            </Link>
          </div>
        )}

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#7DFF6A' }}>
              📋
            </div>
            <div className="stat-number">{loading ? '...' : stats.total}</div>
            <div className="stat-label">Total Complaints</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#f9b84a' }}>
              ⏳
            </div>
            <div className="stat-number">
              {loading ? '...' : (stats.Submitted || 0) + (stats.Verified || 0)}
            </div>
            <div className="stat-label">Pending Review</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#3498db' }}>
              🔄
            </div>
            <div className="stat-number">{loading ? '...' : stats['In Progress'] || 0}</div>
            <div className="stat-label">In Progress</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ color: '#2ecc71' }}>
              ✅
            </div>
            <div className="stat-number">{loading ? '...' : stats.Resolved || 0}</div>
            <div className="stat-label">Resolved</div>
            {villageNames.length > 0 && (
              <div className="villages-list">
                <i className="fas fa-map-marker-alt" />{' '}
                {villageNames.slice(0, 3).join(', ')}
                {villageNames.length > 3 ? ` +${villageNames.length - 3} more` : ''}
              </div>
            )}
          </div>
        </div>

        <div className="chart-section">
          <h3>
            <i className="fas fa-chart-bar" style={{ color: '#7DFF6A' }} /> Complaint Status
            Distribution
          </h3>
          <div className="chart-bars">
            {CHART_ITEMS.map((item) => {
              const count = stats[item.label] || 0;
              const height = (count / maxCount) * 180;
              return (
                <div key={item.label} className="chart-bar-container">
                  <div className="chart-bar-value">{count}</div>
                  <div
                    className="chart-bar"
                    style={{ height: `${Math.max(height, 10)}px`, background: item.color }}
                  />
                  <div className="chart-bar-label">{item.label}</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="recent-section">
          <div className="header">
            <h3>
              <i className="fas fa-clock" style={{ color: '#7DFF6A' }} /> Recent Complaints
            </h3>
            <Link to="/admin/complaints">View All →</Link>
          </div>

          {loading ? (
            <div className="empty-state">
              <i className="fas fa-spinner fa-spin" />
              <p>Loading recent complaints...</p>
            </div>
          ) : recentComplaints.length > 0 ? (
            <table className="complaint-table">
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
                {recentComplaints.map((row) => {
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
              <p>No complaints from your villages yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


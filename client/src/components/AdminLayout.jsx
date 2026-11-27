import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/admin-theme.css';

export default function AdminLayout({
  titleName,
  subtitle,
  stats = {},
  villages = [],
  urgentCount = 0,
  children,
}) {
  const { panchayath, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalMode, setModalMode] = useState('');

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, location.search]);

  const handleLogout = async (e) => {
    e.preventDefault();
    await logout();
    navigate('/admin/login', { replace: true });
  };

  const displayName = titleName || panchayath?.name || 'Panchayath';
  const displayEmail = panchayath?.email || `${panchayath?.username || 'admin'}@gramsetu`;
  const searchParams = new URLSearchParams(location.search);
  const currentStatus = searchParams.get('status') || '';

  const isDashboard = location.pathname === '/admin/dashboard';
  const isAllComplaints =
    location.pathname.startsWith('/admin/complaints') && !currentStatus;
  const isPending =
    location.pathname === '/admin/complaints' && currentStatus === 'Submitted';
  const isInProgress =
    location.pathname === '/admin/complaints' && currentStatus === 'In Progress';
  const isResolved =
    location.pathname === '/admin/complaints' && currentStatus === 'Resolved';
  const isMap = location.pathname === '/admin/map';

  return (
    <div className="admin-portal-root">
      <div className="admin-shell-frame">
        <div
          className={`admin-drawer-overlay${sidebarOpen ? ' active' : ''}`}
          onClick={() => setSidebarOpen(false)}
        />

        <aside className={`admin-sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar">
          <div className="admin-sidebar-top">
            <Link to="/admin/dashboard" className="admin-brand">
              <span className="admin-brand-mark">
                <i className="fas fa-landmark" />
              </span>
              <span className="admin-brand-text">
                Gram<span>Setu</span>
              </span>
            </Link>

            <ul className="admin-nav-list">
              <li>
                <Link
                  to="/admin/dashboard"
                  className={`admin-nav-link${isDashboard ? ' active' : ''}`}
                >
                  <i className="fas fa-th-large" />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/complaints"
                  className={`admin-nav-link${isAllComplaints ? ' active' : ''}`}
                >
                  <i className="fas fa-list-ul" />
                  <span>All Complaints</span>
                  {typeof stats.total === 'number' && (
                    <span className="admin-nav-badge">{stats.total}</span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/complaints?status=Submitted"
                  className={`admin-nav-link${isPending ? ' active' : ''}`}
                >
                  <i className="far fa-clock" />
                  <span>Pending</span>
                  {typeof stats.Submitted === 'number' && (
                    <span className="admin-nav-badge">{stats.Submitted}</span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/complaints?status=In%20Progress"
                  className={`admin-nav-link${isInProgress ? ' active' : ''}`}
                >
                  <i className="fas fa-sliders-h" />
                  <span>In Progress</span>
                  {typeof stats['In Progress'] === 'number' && (
                    <span className="admin-nav-badge">{stats['In Progress']}</span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/complaints?status=Resolved"
                  className={`admin-nav-link${isResolved ? ' active' : ''}`}
                >
                  <i className="far fa-check-circle" />
                  <span>Resolved</span>
                  {typeof stats.Resolved === 'number' && (
                    <span className="admin-nav-badge">{stats.Resolved}</span>
                  )}
                </Link>
              </li>
              <li>
                <Link
                  to="/admin/map"
                  className={`admin-nav-link${isMap ? ' active' : ''}`}
                >
                  <i className="fas fa-map-marked-alt" />
                  <span>Complaint Map</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="admin-sidebar-bottom">
            <button
              type="button"
              className="admin-nav-link"
              onClick={() => setModalMode('settings')}
            >
              <i className="fas fa-cog" />
              <span>Settings</span>
            </button>
            <button
              type="button"
              className="admin-nav-link"
              onClick={() => setModalMode('support')}
            >
              <i className="far fa-question-circle" />
              <span>Support</span>
            </button>
            <a href="#logout" className="admin-nav-link danger" onClick={handleLogout}>
              <i className="fas fa-sign-out-alt" />
              <span>Logout</span>
            </a>
          </div>
        </aside>

        <main className="admin-main">
          <header className="admin-header">
            <div className="admin-header-left">
              <button
                type="button"
                className="admin-mobile-menu-btn"
                id="mobileToggle"
                aria-label="Toggle Menu"
                onClick={() => setSidebarOpen((prev) => !prev)}
              >
                <i className="fas fa-bars" />
              </button>
              <div>
                <h1 className="admin-greeting-title">
                  Welcome, <span>{displayName}</span>
                </h1>
                <p className="admin-greeting-sub">
                  {subtitle || 'Here is your Panchayat grievance and resolution overview'}
                </p>
              </div>
            </div>

            <div className="admin-header-right">
              <Link
                to="/admin/complaints?status=Submitted"
                className="admin-icon-circle-btn"
                title={
                  urgentCount > 0
                    ? `${urgentCount} pending complaints require attention`
                    : 'View pending complaints'
                }
                aria-label="Notifications"
              >
                <i className="far fa-bell" />
                {urgentCount > 0 && <span className="admin-notif-dot" />}
              </Link>
              <button
                type="button"
                className="admin-icon-circle-btn"
                title="Panchayat Account Settings"
                aria-label="Settings"
                onClick={() => setModalMode('settings')}
              >
                <i className="fas fa-cog" />
              </button>

              <div className="admin-user-chip">
                <div className="admin-user-avatar">{displayName.charAt(0).toUpperCase()}</div>
                <div className="admin-user-meta">
                  <strong>{displayName}</strong>
                  <small>{displayEmail}</small>
                </div>
              </div>
            </div>
          </header>

          {children}
        </main>
      </div>

      {modalMode && (
        <div
          className="admin-modal-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModalMode('');
          }}
        >
          <div className="admin-modal-card">
            <div className="admin-card-head" style={{ marginBottom: '12px' }}>
              <h3 className="admin-card-title">
                {modalMode === 'settings' ? 'Panchayat Account Info' : 'Panchayat Admin Support'}
              </h3>
              <button
                type="button"
                className="admin-mini-pill"
                onClick={() => setModalMode('')}
              >
                Close
              </button>
            </div>

            {modalMode === 'settings' ? (
              <div className="admin-form-grid">
                <div className="admin-detail-box full">
                  <div className="label">Panchayat Name</div>
                  <div className="value">{displayName}</div>
                </div>
                <div className="admin-detail-box">
                  <div className="label">Username</div>
                  <div className="value">{panchayath?.username || 'N/A'}</div>
                </div>
                <div className="admin-detail-box">
                  <div className="label">Assigned Villages</div>
                  <div className="value">
                    {villages.length > 0 ? villages.map((v) => v.name).join(', ') : 'Active Jurisdiction'}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13.5px', color: 'var(--text-secondary)' }}>
                <p>
                  All complaints are scoped strictly to your authorized Panchayat villages. Updating status records an entry directly into citizen tracking history.
                </p>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link to="/admin/complaints" className="admin-pill" onClick={() => setModalMode('')}>
                    Review Complaints
                  </Link>
                  <Link to="/track" className="admin-pill">
                    Public Track View
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


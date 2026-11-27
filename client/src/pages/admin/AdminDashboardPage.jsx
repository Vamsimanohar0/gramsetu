import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { apiRequest } from '../../services/api';
import AdminLayout from '../../components/AdminLayout';
import ComplaintTrendChart from '../../components/ComplaintTrendChart';

function formatShortDate(dateValue) {
  if (!dateValue) return 'N/A';
  const d = new Date(dateValue);
  if (Number.isNaN(d.getTime())) return String(dateValue);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getCategoryIcon(category) {
  const c = (category || '').toLowerCase();
  if (c.includes('light')) return 'fa-lightbulb';
  if (c.includes('road')) return 'fa-road';
  if (c.includes('water')) return 'fa-tint';
  if (c.includes('drain') || c.includes('garbage')) return 'fa-trash-alt';
  if (c.includes('safety')) return 'fa-shield-alt';
  return 'fa-clipboard-list';
}

export default function AdminDashboardPage() {
  const { panchayath } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [statRange, setStatRange] = useState('ALL');
  const [recentFilter, setRecentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const panchayathName = data?.panchayath?.name || panchayath?.name || 'Panchayath';
  const villages = data?.villages || [];
  const villageNames = villages.map((v) => v.name);
  const stats = data?.stats || {
    total: 0,
    Submitted: 0,
    Verified: 0,
    Assigned: 0,
    'In Progress': 0,
    Resolved: 0,
    Rejected: 0,
  };
  const urgentCount = data?.urgentCount ?? (stats.Submitted || 0) + (stats.Verified || 0);
  const recentComplaints = data?.recentComplaints || [];

  const totalCount = Math.max(0, stats.total || 0);
  const safeDenom = Math.max(1, totalCount);
  const pendingTotal = (stats.Submitted || 0) + (stats.Verified || 0) + (stats.Assigned || 0);
  const inProgressTotal = stats['In Progress'] || 0;
  const resolvedTotal = stats.Resolved || 0;
  const rejectedTotal = stats.Rejected || 0;

  const recentInWindow =
    statRange === 'ALL'
      ? totalCount
      : recentComplaints.filter((c) => {
          const ts = c.created_at ? new Date(c.created_at).getTime() : 0;
          const days = statRange === '7D' ? 7 : 30;
          return ts >= Date.now() - days * 24 * 60 * 60 * 1000;
        }).length;

  const filteredRecent = recentComplaints.filter((row) => {
    if (recentFilter === 'open') {
      return row.status !== 'Resolved' && row.status !== 'Rejected';
    }
    if (recentFilter === 'closed') {
      return row.status === 'Resolved' || row.status === 'Rejected';
    }
    return true;
  });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/admin/complaints?search=${encodeURIComponent(q)}` : '/admin/complaints');
  };

  return (
    <AdminLayout
      titleName={panchayathName}
      subtitle={`Grievance overview · ${villageNames.length} villages connected`}
      stats={stats}
      villages={villages}
      urgentCount={urgentCount}
    >
      {error && (
        <div className="admin-alert error">
          <i className="fas fa-exclamation-circle" />
          <span>{error}</span>
        </div>
      )}

      {/* Pill Navigation Row + Search Bar */}
      <div className="admin-toolbar-row">
        <div className="admin-pill-tabs">
          <Link to="/admin/dashboard" className="admin-pill active">
            Overview
          </Link>
          <Link to="/admin/complaints" className="admin-pill">
            Complaints ({totalCount})
          </Link>
          <Link to="/admin/map" className="admin-pill">
            Map View
          </Link>
        </div>

        <form className="admin-search-pill" onSubmit={handleSearchSubmit}>
          <i className="fas fa-search" />
          <input
            type="text"
            placeholder="Search complaints by ID, citizen, mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-label="Search complaints"
          />
          <button type="submit">Search</button>
        </form>
      </div>

      {/* 3-Column Reference Bento Grid */}
      <div className="admin-bento-grid">
        {/* Column 1: Total Complaints Card + Urgent Action Promo Card */}
        <div className="admin-col-stack">
          <section className="admin-glass-card admin-stat-hero-card">
            <div className="admin-card-head">
              <h2 className="admin-card-title">Total Complaints</h2>
              <select
                className="admin-range-select"
                value={statRange}
                onChange={(e) => setStatRange(e.target.value)}
                aria-label="Complaints range"
              >
                <option value="ALL">All Time</option>
                <option value="30D">30D Recent</option>
                <option value="7D">7D Recent</option>
              </select>
            </div>
            <div className="admin-big-metric">{loading ? '...' : recentInWindow}</div>
            <p className="admin-metric-sub">
              {villageNames.length > 0
                ? `${villageNames.slice(0, 3).join(', ')}${villageNames.length > 3 ? ` +${villageNames.length - 3}` : ''}`
                : 'Active jurisdiction'}
            </p>
          </section>

          <section className="admin-glass-card admin-insight-card">
            <h3>
              {urgentCount > 0 ? 'Pending Panchayat Review' : 'Jurisdiction Up to Date'}
            </h3>
            <p>
              {urgentCount > 0
                ? `${urgentCount} submitted or verified complaints require Panchayat inspection and status updates.`
                : 'No urgent pending complaints right now. View all complaints or explore the village map.'}
            </p>
            <Link
              to={urgentCount > 0 ? '/admin/complaints?status=Submitted' : '/admin/map'}
              className="admin-cta-btn"
            >
              <span>{urgentCount > 0 ? 'Review Pending' : 'Open Complaint Map'}</span>
              <i className="fas fa-arrow-right" />
            </Link>
          </section>
        </div>

        {/* Column 2: Watchlist-Style Recent Complaints List */}
        <section className="admin-glass-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">Recent Complaints</h2>
            <Link to="/admin/complaints" className="admin-mini-pill">
              View All
            </Link>
          </div>

          <div className="admin-watchlist-filters">
            <button
              type="button"
              className={`admin-mini-pill${recentFilter === 'all' ? ' active' : ''}`}
              onClick={() => setRecentFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`admin-mini-pill${recentFilter === 'open' ? ' active' : ''}`}
              onClick={() => setRecentFilter('open')}
            >
              Active
            </button>
            <button
              type="button"
              className={`admin-mini-pill${recentFilter === 'closed' ? ' active' : ''}`}
              onClick={() => setRecentFilter('closed')}
            >
              Closed
            </button>
          </div>

          {loading ? (
            <p className="admin-metric-sub">Loading recent complaints...</p>
          ) : filteredRecent.length > 0 ? (
            <div className="admin-watchlist-items">
              {filteredRecent.slice(0, 5).map((row) => {
                const isRejected = row.status === 'Rejected';
                const isResolved = row.status === 'Resolved';
                const deltaClass = isRejected ? 'negative' : isResolved ? 'positive' : 'neutral';
                return (
                  <Link
                    key={row.id}
                    to={`/admin/complaints/${row.id}`}
                    className="admin-watchlist-row"
                  >
                    <div className="admin-watchlist-left">
                      <span className="admin-row-icon">
                        <i className={`fas ${getCategoryIcon(row.category)}`} />
                      </span>
                      <div className="admin-row-text">
                        <strong>{row.title || row.category || row.complaint_id}</strong>
                        <small>
                          {row.village || 'N/A'} · {formatShortDate(row.created_at)}
                        </small>
                      </div>
                    </div>
                    <div className="admin-watchlist-right">
                      <span className="row-id">{row.complaint_id}</span>
                      <span className={`admin-delta ${deltaClass}`}>{row.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="admin-metric-sub">No complaints in this filter yet.</p>
          )}
        </section>

        {/* Column 3: 2x2 Mini-Card Status Breakdown */}
        <section className="admin-glass-card">
          <div className="admin-card-head">
            <h2 className="admin-card-title">Status Breakdown</h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              <Link to="/admin/complaints" className="admin-mini-pill">
                See all
              </Link>
              <Link to="/admin/complaints" className="admin-mini-pill" aria-label="Open list">
                ↗
              </Link>
            </div>
          </div>

          <div className="admin-mini-grid">
            <Link to="/admin/complaints?status=Submitted" className="admin-mini-card">
              <div>
                <div className="admin-mini-value">{loading ? '...' : pendingTotal}</div>
                <span className="admin-delta neutral">
                  {Math.round((pendingTotal / safeDenom) * 100)}% queue
                </span>
              </div>
              <div className="admin-mini-footer">
                <div className="admin-mini-icon-label">
                  <i className="far fa-clock" />
                  <span>Pending</span>
                </div>
                <span className="admin-mini-units">Cases {pendingTotal}</span>
              </div>
            </Link>

            <Link to="/admin/complaints?status=In%20Progress" className="admin-mini-card">
              <div>
                <div className="admin-mini-value">{loading ? '...' : inProgressTotal}</div>
                <span className="admin-delta positive">
                  {Math.round((inProgressTotal / safeDenom) * 100)}% active
                </span>
              </div>
              <div className="admin-mini-footer">
                <div className="admin-mini-icon-label">
                  <i className="fas fa-tasks" />
                  <span>In Progress</span>
                </div>
                <span className="admin-mini-units">Cases {inProgressTotal}</span>
              </div>
            </Link>

            <Link to="/admin/complaints?status=Resolved" className="admin-mini-card">
              <div>
                <div className="admin-mini-value">{loading ? '...' : resolvedTotal}</div>
                <span className="admin-delta positive">
                  +{Math.round((resolvedTotal / safeDenom) * 100)}% solved
                </span>
              </div>
              <div className="admin-mini-footer">
                <div className="admin-mini-icon-label">
                  <i className="far fa-check-circle" />
                  <span>Resolved</span>
                </div>
                <span className="admin-mini-units">Cases {resolvedTotal}</span>
              </div>
            </Link>

            <Link to="/admin/complaints?status=Rejected" className="admin-mini-card">
              <div>
                <div className="admin-mini-value">{loading ? '...' : rejectedTotal}</div>
                <span className="admin-delta negative">
                  {Math.round((rejectedTotal / safeDenom) * 100)}% closed
                </span>
              </div>
              <div className="admin-mini-footer">
                <div className="admin-mini-icon-label">
                  <i className="far fa-times-circle" />
                  <span>Rejected</span>
                </div>
                <span className="admin-mini-units">Cases {rejectedTotal}</span>
              </div>
            </Link>
          </div>
        </section>
      </div>

      {/* Full-Width Interactive Area Chart */}
      <ComplaintTrendChart complaints={recentComplaints} stats={stats} />
    </AdminLayout>
  );
}

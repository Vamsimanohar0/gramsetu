import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { useAuth } from '../../context/AuthContext';
import '../../styles/admin-login.css';

export default function AdminLoginPage() {
  const { panchayath, loading, login } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    document.title = 'Panchayath Login - GramSetu';
  }, []);

  if (!loading && panchayath) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-admin-login">
      <Navbar />

      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <i className="fas fa-landmark" />
              <h1>
                Gram<span>Setu</span>
              </h1>
            </div>
            <p className="login-subtitle">Panchayath Admin Portal</p>
          </div>

          {error && (
            <div className="error-message">
              <i className="fas fa-exclamation-circle" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="username">
                <i className="fas fa-user" /> Username
              </label>
              <div className="input-group">
                <i className="fas fa-user" />
                <input
                  type="text"
                  id="username"
                  name="username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">
                <i className="fas fa-lock" /> Password
              </label>
              <div className="input-group">
                <i className="fas fa-lock" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <i
                  className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} toggle-password`}
                  id="togglePassword"
                  onClick={() => setShowPassword((prev) => !prev)}
                />
              </div>
            </div>

            <button type="submit" className="login-btn" disabled={submitting}>
              <i className={submitting ? 'fas fa-spinner fa-spin' : 'fas fa-sign-in-alt'} />
              <span>{submitting ? 'Logging in...' : 'Login to Dashboard'}</span>
            </button>
          </form>

          <div className="demo-credentials">
            <i className="fas fa-info-circle" style={{ color: '#7DFF6A' }} /> Demo Credentials:
            <div className="creds">
              <span>kondapalli / admin</span>
              <span>guntur / admin</span>
              <span>narasaraopet / admin</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


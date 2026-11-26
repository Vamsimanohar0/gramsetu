import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { panchayath, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: '#0a0f1e',
          color: '#7DFF6A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <span>
          <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }} /> Loading...
        </span>
      </div>
    );
  }

  if (!panchayath) {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}


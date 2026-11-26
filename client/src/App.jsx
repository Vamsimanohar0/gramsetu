import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';
import HomePage from './pages/HomePage';
import ComplaintPage from './pages/ComplaintPage';
import TrackPage from './pages/TrackPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminViewComplaintPage from './pages/admin/AdminViewComplaintPage';

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/complaint" element={<ComplaintPage />} />
            <Route path="/track" element={<TrackPage />} />

            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints"
              element={
                <ProtectedRoute>
                  <AdminComplaintsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/complaints/:id"
              element={
                <ProtectedRoute>
                  <AdminViewComplaintPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy PHP URL redirects */}
            <Route path="/index.php" element={<Navigate to="/" replace />} />
            <Route path="/complaint.php" element={<Navigate to="/complaint" replace />} />
            <Route path="/track.php" element={<Navigate to="/track" replace />} />
            <Route path="/admin/login.php" element={<Navigate to="/admin/login" replace />} />
            <Route path="/admin/dashboard.php" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/complaints.php" element={<Navigate to="/admin/complaints" replace />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </LanguageProvider>
  );
}


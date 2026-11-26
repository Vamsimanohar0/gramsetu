import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiRequest, getStoredToken, setStoredToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [panchayath, setPanchayath] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/me');
      setPanchayath(data.panchayath || null);
    } catch {
      setPanchayath(null);
      if (getStoredToken()) {
        setStoredToken('');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (username, password) => {
    const data = await apiRequest('/api/admin/login', {
      method: 'POST',
      body: { username, password },
    });
    if (data.token) {
      setStoredToken(data.token);
    }
    setPanchayath(data.panchayath);
    return data.panchayath;
  };

  const logout = async () => {
    try {
      await apiRequest('/api/admin/logout', { method: 'POST' });
    } catch {
      // Clear client state even if request fails.
    } finally {
      setStoredToken('');
      setPanchayath(null);
    }
  };

  return (
    <AuthContext.Provider value={{ panchayath, loading, login, logout, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}


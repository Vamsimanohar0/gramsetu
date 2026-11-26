const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');
const TOKEN_KEY = 'gramsetu_admin_token';

export function getApiBaseUrl() {
  return API_BASE_URL;
}

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}

export function resolveUploadUrl(relativePath) {
  if (!relativePath) return '';
  if (/^https?:\/\//i.test(relativePath)) return relativePath;
  const cleaned = String(relativePath).replace(/^\/+/, '');
  return `${API_BASE_URL}/${cleaned}`;
}

export async function apiRequest(path, options = {}) {
  const { method = 'GET', body = null, headers = {}, isFormData = false } = options;
  const token = getStoredToken();

  const requestHeaders = { ...headers };
  if (token && !requestHeaders.Authorization) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }
  if (!isFormData && body !== null && !requestHeaders['Content-Type']) {
    requestHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    credentials: 'include',
    body: body === null ? undefined : isFormData ? body : JSON.stringify(body),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || `Request failed with status ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}


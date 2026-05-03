/* ═══════════════════════════════════════════════════════════
   API Layer — All backend calls in one place
   ═══════════════════════════════════════════════════════════ */
const API = window.VMS_API_BASE || (
  window.location.protocol === 'file:' ? 'http://localhost:8080/api' : `${window.location.origin}/api`
);

const Auth = {
  getToken:    () => localStorage.getItem('vms_token'),
  getRole:     () => localStorage.getItem('vms_role'),
  getName:     () => localStorage.getItem('vms_name'),
  getUsername: () => localStorage.getItem('vms_username'),
  isLoggedIn:  () => !!localStorage.getItem('vms_token'),
  save(data) {
    localStorage.setItem('vms_token', data.token);
    localStorage.setItem('vms_role', data.role);
    localStorage.setItem('vms_name', data.name || data.username);
    localStorage.setItem('vms_username', data.username);
  },
  clear() {
    localStorage.removeItem('vms_token');
    localStorage.removeItem('vms_role');
    localStorage.removeItem('vms_name');
    localStorage.removeItem('vms_username');
  }
};

async function api(path, opts = {}) {
  const headers = { ...opts.headers };
  const token = Auth.getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(opts.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  console.log(`[API Request] ${opts.method || 'GET'} ${path}`, headers);

  const res = await fetch(`${API}${path}`, { ...opts, headers });

  if (res.status === 401) {
    if (path === '/auth/login' || path === '/public/verify-otp') {
      const err = new Error('Invalid credentials');
      err.status = 401;
      throw err;
    }
    Auth.clear();
    if (!window.location.pathname.endsWith('index.html') && window.location.pathname !== '/') {
      console.warn("[API] 401 received, redirecting to login");
      window.location.href = 'index.html';
    }
    return null;
  }
  if (res.status === 403) return null; // silently ignore — user doesn't have permission, no popup needed
  if (res.status === 429) throw new Error('Rate limited. Please wait a moment.');
  if (!res.ok) {
    const errorData = { status: res.status, message: 'Request failed', errors: null };
    try {
      const j = await res.json();
      if (res.status === 400 && !j.message) { // It's our clean error map
        errorData.errors = j;
        errorData.message = 'Validation failed';
      } else {
        errorData.message = j.message || 'Request failed';
        if (j.errors) errorData.errors = j.errors;
      }
    } catch {
      try { errorData.message = await res.text(); } catch {}
    }
    const err = new Error(errorData.message);
    err.status = errorData.status;
    err.errors = errorData.errors;
    throw err;
  }
  const text = await res.text();
  return text ? JSON.parse(text) : {};
}

/* Auth */
const ApiAuth = {
  login: (username, password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) })
};

/* Dashboard */
const ApiDashboard = {
  stats: () => api('/admin/dashboard')
};

/* Visitors */
const ApiVisitors = {
  list:    (params = '') => api(`/visitors${params ? '?' + params : ''}`),
  myRequests: () => api('/visitors/my-requests'),
  get:     (id) => api(`/visitors/${id}`),
  register:(formData) => api('/visitors/register', { method: 'POST', body: formData }),
  approve: (id, approve) => api(`/visitors/${id}/approve?approve=${approve}`, { method: 'PUT' }),
  checkIn: (id) => api(`/visitors/${id}/check-in`, { method: 'POST' }),
  checkOut:(id) => api(`/visitors/${id}/check-out`, { method: 'POST' }),
  photo:   (id, file) => { const fd = new FormData(); fd.append('file', file); return api(`/visitors/${id}/photo`, { method: 'POST', body: fd }); }
};

/* Visit Requests */
const ApiVisitRequests = {
  create:     (formData) => api('/public/visit-requests', { method: 'POST', body: formData }),
  status:     (requestId) => api(`/public/visit-requests/${requestId}`),
  host:       () => api('/visit-requests/host'),
  myRequests: () => api('/visit-requests/my-requests'),
  approve:    (requestId, approve) => api(`/visit-requests/${requestId}/approval?approve=${approve}`, { method: 'PUT' }),
  scanQr:     (requestId) => api('/visit-requests/scan-qr', { method: 'POST', body: JSON.stringify({ requestId }) })
};

/* Employees */
const ApiEmployees = {
  list:    () => api('/employees'),
  hosts:   (search = '') => api(`/employees/hosts?search=${encodeURIComponent(search)}`),
  create:  (data) => api('/employees', { method: 'POST', body: JSON.stringify(data) }),
  update:  (id, data) => api(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete:  (id) => api(`/employees/${id}`, { method: 'DELETE' })
};

/* Public */
const ApiPublic = {
  employees:     ()              => api('/public/employees'),
  submit:        (formData)      => api('/public/visitor-request', { method: 'POST', body: formData }),
  sendOtp:       (email)         => api('/public/send-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp:     (email, otp, requestId) => api('/public/verify-otp', { method: 'POST', body: JSON.stringify({ email, otp, requestId }) }),
  scanQr:        (requestId)     => api('/public/scan-qr', { method: 'POST', body: JSON.stringify({ requestId }) }),
  visitorStatus: (requestId)     => api(`/public/visitor-status/${requestId}`)
};

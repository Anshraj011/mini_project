/* ═══════════════════════════════════════════════════════════
   App — Main Application Logic & Page Rendering
   ═══════════════════════════════════════════════════════════ */

/* ── Globals ───────────────────────────────────────────── */
let currentPage = '';
let allVisitors = [];
let visitorPage = 1;
let allEmployees = [];
let empPage = 1;
let hostDropdown = null;
let dashboardChart = null;

/* ── Init ──────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;
  
  if (path.endsWith('index.html') || path === '/' || path.endsWith('/frontend/')) {
    initLogin();
  } else if (path.endsWith('dashboard.html')) {
    const main = document.getElementById('mainContent');
    if (main) main.innerHTML = showLoader();
    
    if (!Auth.isLoggedIn()) { 
      window.location.href = 'index.html'; 
      return; 
    }
    navigateTo(getDefaultPage());
  }
});

function getDefaultPage() {
  const role = Auth.getRole();
  if (role === 'ADMIN') return 'dashboard';
  if (role === 'SECURITY_GUARD') return 'guard-home';
  if (role === 'ROLE_VISITOR') return 'visitor-home';
  return 'employee-home';
}

/* ── Login ─────────────────────────────────────────────── */
function initLogin() {
  if (Auth.isLoggedIn()) { window.location.href = 'dashboard.html'; return; }
  document.getElementById('loginForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    const spinner = document.getElementById('loginSpinner');
    const text = document.getElementById('loginBtnText');
    const alert = document.getElementById('loginAlert');
    alert.classList.add('hidden');
    btn.disabled = true; spinner.classList.remove('hidden'); text.textContent = 'Authenticating...';

    try {
      const data = await ApiAuth.login(
        document.getElementById('username').value,
        document.getElementById('password').value
      );
      Auth.save(data);
      window.location.href = 'dashboard.html';
    } catch (err) {
      alert.innerHTML = `<i data-lucide="alert-circle" style="width:16px;height:16px;display:inline;margin-right:8px;vertical-align:middle;"></i>${err.message || 'Invalid credentials'}`;
      alert.classList.remove('hidden');
      lucide.createIcons({ root: alert });
    } finally {
      btn.disabled = false; spinner.classList.add('hidden'); text.textContent = 'Sign In';
    }
  });
}

function logout() { Auth.clear(); window.location.href = 'index.html'; }

/* ── Router ────────────────────────────────────────────── */
function navigateTo(page) {
  currentPage = page;
  const role = Auth.getRole();
  buildSidebar(role, page);
  const main = document.getElementById('mainContent');
  if (!main) return;
  main.innerHTML = showLoader();

  switch (page) {
    case 'dashboard':     renderAdminDashboard(main); break;
    case 'employee-home': renderEmployeeHome(main);   break;
    case 'guard-home':    renderGuardHome(main);      break;
    case 'guard-scan':    renderGuardScan(main);      break;
    case 'visitor-home':  renderVisitorHome(main);    break;
    case 'visitors':      renderVisitors(main);        break;
    case 'register':      renderRegister(main);        break;
    case 'employees':     renderEmployees(main);       break;
    default:              navigateTo(getDefaultPage());
  }
}

/* ═══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   ═══════════════════════════════════════════════════════════ */
async function renderAdminDashboard(el) {
  try {
    const stats = await ApiDashboard.stats();
    el.innerHTML = `
      <div class="page-header">
        <div><h2 class="page-title">Overview</h2><p class="page-subtitle">Today's visitor activity</p></div>
        <div class="flex gap-2">
          <button class="btn btn-primary btn-sm" onclick="navigateTo('register')"><i data-lucide="plus"></i> New Visitor</button>
        </div>
      </div>
      
      <div class="grid grid-4 gap-4 mb-6">
        ${statCard('Total Visitors', stats.totalVisitorsToday)}
        ${statCard('Pending Approvals', stats.pendingApprovalsCount)}
        ${statCard('Checked In', stats.checkedInVisitorsCount)}
        ${statCard('Rejected', stats.rejectedVisitorsCount)}
      </div>
      
      <div class="card">
        <div class="card-header" style="margin-bottom:0; border-bottom:none; padding-bottom:0"><span class="card-title">Recent Activity</span></div>
        <div id="recentActivityList" class="flex-col gap-2 mt-4"></div>
      </div>`;
      
    lucide.createIcons({ root: el });
    loadRecentActivity();
  } catch (err) {
    el.innerHTML = `<div class="page-header"><h2 class="page-title">Overview</h2></div>
      <div class="card text-center"><p class="text-muted">Unable to load analytics data.</p></div>`;
  }
}

function statCard(label, value) {
  return `<div class="stat-card">
    <span class="stat-title">${label}</span>
    <span class="stat-value">${value ?? 0}</span>
  </div>`;
}

async function loadRecentActivity() {
  try {
    const visitors = await ApiVisitors.list();
    const recent = visitors ? visitors.slice(0, 5) : [];
    const el = document.getElementById('recentActivityList');
    if (!el) return;
    
    if (recent.length === 0) { el.innerHTML = '<p class="text-sm text-muted">No recent activity</p>'; return; }
    
    el.innerHTML = recent.map(v => `
      <div class="flex items-center gap-3 p-2" style="border-bottom:1px solid var(--border-subtle)">
        <div class="avatar">${v.fullName.charAt(0).toUpperCase()}</div>
        <div style="flex:1;min-width:0">
          <div class="text-sm font-medium">${v.fullName}</div>
          <div class="text-xs text-muted">Host: ${v.hostName || v.registeredBy}</div>
        </div>
        <div>${statusBadge(v.status)}</div>
      </div>`).join('');
  } catch { /* ignore */ }
}

/* ═══════════════════════════════════════════════════════════
   VISITORS PAGE
   ═══════════════════════════════════════════════════════════ */
async function renderVisitors(el) {
  const role = Auth.getRole();
  const title = role === 'EMPLOYEE' ? 'My Visitors' : 'All Visitors';
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">${title}</h2><p class="page-subtitle">Manage visitor requests and passes</p></div>
      <button class="btn btn-primary" onclick="navigateTo('register')"><i data-lucide="plus"></i> New Visitor</button>
    </div>
    
    <div class="table-container">
      <div class="table-toolbar">
        <div class="header-search">
          <i data-lucide="search"></i>
          <input type="text" id="visitorSearch" placeholder="Search name or email...">
        </div>
        <div class="flex gap-2">
          <select class="form-select" id="statusFilter" style="width: 165px; padding: 0.375rem 0.75rem;">
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="PRE_APPROVED">Pre-Approved</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="CHECKED_IN">Checked In</option>
            <option value="CHECKED_OUT">Checked Out</option>
          </select>
        </div>
      </div>
      <div class="table-wrapper">
        <div id="visitorsTable">${showLoader()}</div>
      </div>
      <div id="visitorsPagination"></div>
    </div>`;
  lucide.createIcons({ root: el });
  await loadVisitors();
  document.getElementById('visitorSearch').addEventListener('input', () => { visitorPage = 1; filterAndRenderVisitors(); });
  document.getElementById('statusFilter').addEventListener('change', () => { visitorPage = 1; filterAndRenderVisitors(); });
}

async function loadVisitors() {
  try { allVisitors = await ApiVisitors.list(); } catch { allVisitors = []; toast('Failed to load visitors', 'error'); }
  filterAndRenderVisitors();
}

function filterAndRenderVisitors() {
  const search = (document.getElementById('visitorSearch')?.value || '').toLowerCase();
  const status = document.getElementById('statusFilter')?.value || '';
  let filtered = allVisitors;
  if (search) filtered = filtered.filter(v => v.fullName.toLowerCase().includes(search) || (v.email||'').toLowerCase().includes(search));
  if (status) filtered = filtered.filter(v => v.status === status);

  const { data, page, total } = paginate(filtered, visitorPage, 10);
  const role = Auth.getRole();
  const canApprove = role === 'ADMIN' || role === 'EMPLOYEE';
  const canCheckIn = role === 'ADMIN' || role === 'SECURITY_GUARD';

  const tbody = data.map(v => {
    let actions = '';
    if (v.status === 'PENDING' && canApprove) {
      actions = `<button class="btn btn-success btn-icon" onclick="approveVisitor('${v.id}',true)" title="Approve"><i data-lucide="check"></i></button>
                 <button class="btn btn-danger btn-icon" onclick="approveVisitor('${v.id}',false)" title="Reject"><i data-lucide="x"></i></button>`;
    } else if ((v.status === 'APPROVED' || v.status === 'PRE_APPROVED') && !v.checkInTime && canCheckIn) {
      actions = `<button class="btn btn-primary btn-sm" onclick="checkInVisitor('${v.id}')">Check In</button>`;
    } else if (v.checkInTime && !v.checkOutTime && canCheckIn) {
      actions = `<button class="btn btn-secondary btn-sm" onclick="checkOutVisitor('${v.id}')">Check Out</button>`;
    } else { actions = `<span class="text-dim text-sm">—</span>`; }

    let viewBtn = `<button class="btn btn-ghost btn-icon" onclick="viewBadge('${v.id}')" title="Details"><i data-lucide="more-horizontal"></i></button>`;

    return `<tr>
      <td>
        <div class="flex items-center gap-3">
          <div class="avatar">${v.fullName.charAt(0)}</div>
          <div><div class="font-medium">${v.fullName}</div><div class="text-xs text-muted">${v.email || v.company || '—'}</div></div>
        </div>
      </td>
      <td><div class="text-sm">${v.registeredBy || v.hostName || '—'}</div></td>
      <td><div class="text-sm">${v.purposeOfVisit}</div></td>
      <td>${statusBadge(v.status)}</td>
      <td><div class="text-sm text-muted">${fmtDate(v.expectedVisitTime)}</div></td>
      <td><div class="flex items-center gap-2">${actions}${viewBtn}</div></td></tr>`;
  }).join('');

  safeSetHTML('visitorsTable', data.length === 0
    ? '<p class="table-empty">No visitors match your search.</p>'
    : `<table><thead><tr><th>Visitor</th><th>Host</th><th>Purpose</th><th>Status</th><th>Expected</th><th>Actions</th></tr></thead><tbody>${tbody}</tbody></table>`);
  safeSetHTML('visitorsPagination', renderPagination(page, total, 'goVisitorPage'));
  lucide.createIcons({ root: document.getElementById('visitorsTable') });
  lucide.createIcons({ root: document.getElementById('visitorsPagination') });
}
window.goVisitorPage = p => { visitorPage = p; filterAndRenderVisitors(); };

async function approveVisitor(id, approve) {
  if (!approve) { const ok = await confirmDialog('Reject Visitor', 'Are you sure you want to reject this request?'); if (!ok) return; }
  try { await ApiVisitors.approve(id, approve); toast(`Visitor ${approve?'approved':'rejected'}`); await loadVisitors(); } catch (e) { toast(e.message, 'error'); }
}
async function checkInVisitor(id) { try { await ApiVisitors.checkIn(id); toast('Checked in successfully'); await loadVisitors(); } catch (e) { toast(e.message, 'error'); } }
async function checkOutVisitor(id) { try { await ApiVisitors.checkOut(id); toast('Checked out successfully'); await loadVisitors(); } catch (e) { toast(e.message, 'error'); } }

function renderDigitalPassCard(v) {
  const requestId = v.visitRequestId || v.id;
  const name = v.fullName || v.visitorName || 'Visitor';
  const initial = name.charAt(0).toUpperCase();
  const photo = v.photoUrl
    ? `<img src="${v.photoUrl}" class="pass-photo" alt="${name} photo">`
    : `<div class="pass-photo pass-photo-fallback">${initial}</div>`;

  return `
    <div class="digital-pass-card">
      <div class="pass-main">
        <div class="pass-person">
          ${photo}
          <div style="min-width:0">
            <div class="pass-kicker">Visitor Pass</div>
            <div class="pass-name">${name}</div>
            <div class="pass-muted">${v.company || 'Visitor'}</div>
          </div>
        </div>
        <div class="pass-detail-grid">
          <div><span>Host</span><strong>${v.hostName || v.registeredBy || '—'}</strong></div>
          <div><span>Purpose</span><strong>${v.purposeOfVisit || '—'}</strong></div>
          <div><span>Arrival</span><strong>${fmtDate(v.expectedVisitTime)}</strong></div>
          <div><span>Departure</span><strong>${fmtDate(v.visitEndTime)}</strong></div>
          <div><span>Email</span><strong>${v.email || '—'}</strong></div>
          <div><span>Phone</span><strong>${v.phone || '—'}</strong></div>
        </div>
      </div>
      <div class="pass-qr-panel">
        <img src="${v.qrCodeUrl}" class="pass-qr" alt="QR Code Pass">
        <div class="pass-request-id">Request ID<br><strong>${requestId}</strong></div>
      </div>
    </div>`;
}

async function viewBadge(id) {
  try {
    const v = await ApiVisitors.get(id);
    openModal('Visitor Details', `
      <div class="flex-col gap-6">
        <div class="flex items-center gap-4">
          ${v.photoUrl ? `<img src="${v.photoUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--border-strong)">` 
                       : `<div class="avatar" style="width:64px;height:64px;font-size:1.5rem">${v.fullName.charAt(0)}</div>`}
          <div><h3 class="font-bold text-lg" style="margin-bottom:0.25rem">${v.fullName}</h3><div class="text-sm text-muted">${v.company || 'Visitor'}</div></div>
          <div style="margin-left:auto">${statusBadge(v.status)}</div>
        </div>
        
        ${v.qrCodeUrl && (v.status === 'PRE_APPROVED' || v.status === 'APPROVED' || v.status === 'CHECKED_IN') ? renderDigitalPassCard(v) : ''}

        <div class="grid grid-2 gap-4 bg-surface-raised" style="background:var(--bg-surface-raised);padding:1.25rem;border-radius:var(--radius-md)">
          <div><div class="text-xs text-dim mb-1">HOST EMPLOYEE</div><div class="text-sm font-medium">${v.hostName || v.registeredBy || '—'}</div></div>
          <div><div class="text-xs text-dim mb-1">PURPOSE</div><div class="text-sm font-medium">${v.purposeOfVisit}</div></div>
          <div><div class="text-xs text-dim mb-1">EXPECTED ARRIVAL</div><div class="text-sm">${fmtDate(v.expectedVisitTime)}</div></div>
          <div><div class="text-xs text-dim mb-1">CONTACT</div><div class="text-sm">${v.email || '—'}<br>${v.phone || '—'}</div></div>
        </div>
      </div>
    `);
  } catch (e) { toast('Error loading details', 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   REGISTER VISITOR
   ═══════════════════════════════════════════════════════════ */
function renderRegister(el) {
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Register Visitor</h2><p class="page-subtitle">Add a new guest to the facility</p></div>
    </div>
    
    <div class="card" style="max-width:800px;">
      <form id="registerForm" class="flex-col gap-6" novalidate>
        
        <div class="grid grid-2 gap-6">
          <div class="form-group" data-field="fullName"><label>Full Name *</label><input class="form-input" name="fullName" placeholder="Jane Doe"></div>
          <div class="form-group" data-field="email"><label>Email Address *</label><input type="email" class="form-input" name="email" placeholder="jane@company.com"></div>
        </div>
        
        <div class="grid grid-2 gap-6">
          <div class="form-group" data-field="phone"><label>Phone (10 digits) *</label><input class="form-input" name="phone" placeholder="9876543210"></div>
          <div class="form-group" data-field="company"><label>Company *</label><input class="form-input" name="company" placeholder="Visitor's Company"></div>
        </div>
        
        <div class="grid grid-2 gap-6">
          <div class="form-group" data-field="purposeOfVisit"><label>Purpose of Visit *</label><input class="form-input" name="purposeOfVisit" placeholder="Meeting, Interview..."></div>
          <div class="form-group"><label>Host Employee *</label><div id="hostDropdownContainer"></div></div>
        </div>
        
        <div class="grid grid-2 gap-6">
          <div class="form-group" data-field="expectedVisitTime"><label>Expected Arrival *</label><input type="datetime-local" class="form-input" name="expectedVisitTime"></div>
          <div class="form-group" data-field="visitEndTime"><label>Expected Departure *</label><input type="datetime-local" class="form-input" name="visitEndTime"></div>
        </div>
        
        <div class="form-group">
          <label>Visitor Photo (Optional)</label>
          <input type="file" class="form-input" name="photo" accept="image/*" style="padding: 0.4rem;">
        </div>
        
        <div class="flex justify-end mt-4 pt-4" style="border-top:1px solid var(--border-subtle)">
          <button type="submit" class="btn btn-primary btn-lg" id="registerBtn">
            <span id="registerBtnText">Submit Registration</span>
            <div id="registerSpinner" class="spinner hidden" style="width:1rem;height:1rem"></div>
          </button>
        </div>
      </form>
    </div>`;

  hostDropdown = createHostDropdown('hostDropdownContainer');
  const form = document.getElementById('registerForm');
  
  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  form.expectedVisitTime.value = now.toISOString().slice(0, 16);
  form.visitEndTime.value = later.toISOString().slice(0, 16);

  const setFieldError = (name, msg) => {
    const group = form.querySelector(`[data-field="${name}"]`);
    if (!group) return;
    const input = group.querySelector('.form-input');
    let errorEl = group.querySelector('.error-message');
    if (msg) {
      input.classList.add('invalid');
      if (!errorEl) { errorEl = document.createElement('span'); errorEl.className = 'error-message'; group.appendChild(errorEl); }
      errorEl.innerHTML = `<i data-lucide="alert-circle" style="width:12px;height:12px;display:inline;margin-right:4px"></i>${msg}`;
      lucide.createIcons({ root: errorEl });
    } else {
      input.classList.remove('invalid');
      if (errorEl) errorEl.remove();
    }
  };

  form.querySelectorAll('.form-input').forEach(input => input.addEventListener('input', () => setFieldError(input.name, null)));

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let isValid = true;
    const v = { f: form.fullName.value.trim(), e: form.email.value.trim(), p: form.phone.value.trim(), pu: form.purposeOfVisit.value.trim(), c: form.company.value.trim(), st: form.expectedVisitTime.value, et: form.visitEndTime.value };
    
    if(v.f.length<2){setFieldError('fullName','Required');isValid=false;}
    if(!/^[^@]+@[^@]+\.[^@]+$/.test(v.e)){setFieldError('email','Invalid format');isValid=false;}
    if(!/^\d{10}$/.test(v.p)){setFieldError('phone','10 digits required');isValid=false;}
    if(v.pu.length<2){setFieldError('purposeOfVisit','Required');isValid=false;}
    if(!v.c){setFieldError('company','Required');isValid=false;}
    
    const host = hostDropdown.getSelected();
    if(!host){toast('Please select a host','error');isValid=false;}
    if(!isValid) return;

    const btn = document.getElementById('registerBtn'); const sp = document.getElementById('registerSpinner'); const txt = document.getElementById('registerBtnText');
    btn.disabled=true; sp.classList.remove('hidden'); txt.textContent='Processing...';

    try {
      const fd = new FormData();
      fd.append('fullName', v.f); fd.append('email', v.e); fd.append('phone', v.p); fd.append('purposeOfVisit', v.pu); fd.append('company', v.c);
      fd.append('hostUsername', host.username); fd.append('expectedVisitTime', v.st); fd.append('visitEndTime', v.et);
      fd.append('preApproval', Auth.getRole() === 'EMPLOYEE' ? 'true' : 'false');
      if (form.photo.files[0]) fd.append('file', form.photo.files[0]);

      await ApiVisitors.register(fd);
      toast('Registration successful!');
      form.reset(); hostDropdown.clear();
      form.expectedVisitTime.value = now.toISOString().slice(0, 16);
      form.visitEndTime.value = later.toISOString().slice(0, 16);
    } catch(err) {
      if(err.errors) Object.entries(err.errors).forEach(([k,m])=>setFieldError(k,m));
      toast(err.message||'Registration failed', 'error');
    } finally {
      btn.disabled=false; sp.classList.add('hidden'); txt.textContent='Submit Registration';
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   EMPLOYEES PAGE
   ═══════════════════════════════════════════════════════════ */
async function renderEmployees(el) {
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Directory</h2><p class="page-subtitle">Manage company employees and hosts</p></div>
      <button class="btn btn-primary" onclick="openAddEmployeeModal()"><i data-lucide="user-plus"></i> Add Employee</button>
    </div>
    <div class="table-container">
      <div class="table-toolbar">
        <div class="header-search"><i data-lucide="search"></i><input type="text" id="empSearch" placeholder="Search employees..."></div>
      </div>
      <div class="table-wrapper"><div id="employeesTable">${showLoader()}</div></div>
      <div id="empPagination"></div>
    </div>`;
  lucide.createIcons({ root: el });
  await loadEmployees();
  document.getElementById('empSearch').addEventListener('input', () => { empPage = 1; filterAndRenderEmployees(); });
}

async function loadEmployees() {
  try { allEmployees = await ApiEmployees.list(); } catch { allEmployees = []; }
  filterAndRenderEmployees();
}

function filterAndRenderEmployees() {
  const search = (document.getElementById('empSearch')?.value || '').toLowerCase();
  let filtered = allEmployees;
  if (search) filtered = filtered.filter(e => (e.name||'').toLowerCase().includes(search) || (e.email||'').toLowerCase().includes(search));

  const { data, page, total } = paginate(filtered, empPage, 10);
  const tbody = data.map(e => `<tr>
    <td>
      <div class="flex items-center gap-3">
        <div class="avatar">${(e.name||'E').charAt(0)}</div>
        <div><div class="font-medium">${e.name||'—'}</div><div class="text-xs text-muted">@${e.username}</div></div>
      </div>
    </td>
    <td><div class="text-sm">${e.email||'—'}</div></td>
    <td><div class="badge badge-neutral">${e.department||'General'}</div></td>
    <td><div class="flex gap-2">
      <button class="btn btn-secondary btn-icon" onclick="openEditEmployeeModal('${e.id}')" title="Edit"><i data-lucide="edit-2"></i></button>
      <button class="btn btn-ghost btn-icon" onclick="deleteEmployee('${e.id}','${e.name}')" title="Delete" style="color:var(--danger)"><i data-lucide="trash-2"></i></button>
    </div></td></tr>`).join('');

  safeSetHTML('employeesTable', data.length === 0 ? '<p class="table-empty">No employees found.</p>' : `<table><thead><tr><th>Employee</th><th>Email</th><th>Department</th><th>Actions</th></tr></thead><tbody>${tbody}</tbody></table>`);
  safeSetHTML('empPagination', renderPagination(page, total, 'goEmpPage'));
  lucide.createIcons({ root: document.getElementById('employeesTable') });
}
window.goEmpPage = p => { empPage = p; filterAndRenderEmployees(); };

function empFormHtml(emp = {}) {
  return `<form id="empForm" class="flex-col gap-4">
    <div class="form-group"><label>Full Name</label><input class="form-input" name="name" required value="${emp.name||''}"></div>
    <div class="form-group"><label>Email</label><input type="email" class="form-input" name="email" required value="${emp.email||''}"></div>
    <div class="grid grid-2 gap-4">
      <div class="form-group"><label>Username</label><input class="form-input" name="username" required value="${emp.username||''}" ${emp.id?'readonly style="opacity:0.5"':''}></div>
      <div class="form-group"><label>Department</label><input class="form-input" name="department" value="${emp.department||''}"></div>
    </div>
    <div class="form-group"><label>${emp.id?'New Password (optional)':'Password'}</label><input type="password" class="form-input" name="password" ${emp.id?'':'required'}></div>
    <div class="modal-footer" style="margin:-1.5rem;margin-top:0.5rem">
      <button type="button" class="btn btn-ghost" onclick="closeModal()">Cancel</button>
      <button type="submit" class="btn btn-primary">${emp.id?'Update':'Create'}</button>
    </div></form>`;
}
function openAddEmployeeModal() { openModal('Add Employee', empFormHtml()); document.getElementById('empForm').onsubmit = async e => { e.preventDefault(); const f=e.target; try { await ApiEmployees.create({name:f.name.value,email:f.email.value,username:f.username.value,department:f.department.value,password:f.password.value}); closeModal(); toast('Employee created'); await loadEmployees(); } catch(err) { toast(err.message,'error'); }};}
function openEditEmployeeModal(id) { const emp=allEmployees.find(e=>e.id===id); if(!emp)return; openModal('Edit Employee', empFormHtml({...emp})); document.getElementById('empForm').onsubmit = async e => { e.preventDefault(); const f=e.target; try { await ApiEmployees.update(id,{name:f.name.value,email:f.email.value,department:f.department.value,password:f.password.value||undefined}); closeModal(); toast('Updated successfully'); await loadEmployees(); } catch(err){ toast(err.message,'error'); }};}
async function deleteEmployee(id,name) { const ok = await confirmDialog('Delete Employee', `Delete ${name}? This action is permanent.`); if(!ok)return; try { await ApiEmployees.delete(id); toast('Deleted'); await loadEmployees(); } catch(e){ toast(e.message,'error'); } }

/* ═══════════════════════════════════════════════════════════
   EMPLOYEE HOME
   ═══════════════════════════════════════════════════════════ */
async function renderEmployeeHome(el) {
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">My Dashboard</h2><p class="page-subtitle">Manage your incoming visitor requests</p></div>
      <button class="btn btn-primary" onclick="navigateTo('register')"><i data-lucide="plus"></i> Pre-Approve Visitor</button>
    </div>

    <div class="card" style="margin-bottom:1.5rem;border:1px solid var(--warning);">
      <div class="card-header" style="border-bottom:1px solid var(--border-subtle)">
        <span class="card-title">Visit Requests Awaiting Approval</span>
        <span class="badge badge-warning" id="visitRequestPendingBadge">0</span>
      </div>
      <div id="visitRequestPendingList" class="flex-col gap-2" style="padding-top:0.5rem"></div>
    </div>

    <div class="card" style="margin-bottom:1.5rem;border:1px solid var(--warning);">
      <div class="card-header" style="border-bottom:1px solid var(--border-subtle)">
        <span class="card-title">Visitor Records Awaiting Approval</span>
        <span class="badge badge-warning" id="empPendingBadge">0</span>
      </div>
      <div id="empPendingList" class="flex-col gap-2" style="padding-top:0.5rem"></div>
    </div>

    <div class="card">
      <div class="card-header" style="border-bottom:1px solid var(--border-subtle)">
        <span class="card-title">Pre-Approved Visitors</span>
        <span class="text-xs text-muted">Approved &amp; expected</span>
      </div>
      <div id="empApprovedList" class="flex-col gap-2" style="padding-top:0.5rem"></div>
    </div>`;
  lucide.createIcons({ root: el });

  try {
    const visitRequests = await ApiVisitRequests.host();
    const pendingVisitRequests = visitRequests.filter(r => r.status === 'Pending');
    const visitRequestEl = document.getElementById('visitRequestPendingList');
    const visitRequestBadge = document.getElementById('visitRequestPendingBadge');
    if (visitRequestBadge) visitRequestBadge.textContent = pendingVisitRequests.length;

    if (pendingVisitRequests.length === 0) {
      visitRequestEl.innerHTML = '<p class="text-sm text-muted" style="padding:0.5rem 0 0.75rem">No public visit requests awaiting approval.</p>';
    } else {
      visitRequestEl.innerHTML = pendingVisitRequests.map(r => `
        <div class="flex items-center gap-3 p-3" style="border-bottom:1px solid var(--border-subtle);background:rgba(234,179,8,0.04);border-radius:var(--radius-md);margin-bottom:0.25rem">
          <div class="avatar" style="width:36px;height:36px;font-size:0.85rem">${r.visitorName.charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div class="font-medium">${r.visitorName}</div>
            <div class="text-xs text-muted">${r.company || 'Visitor'} &nbsp;&bull;&nbsp; ${r.phone || r.email} &nbsp;&bull;&nbsp; ${r.purpose}</div>
            <div class="text-xs text-muted">${fmtDate(r.dateTime)} to ${fmtDate(r.visitEndTime)}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-success btn-sm" onclick="empApproveVisitRequest('${r.requestId}', true)"><i data-lucide="check" style="width:13px;height:13px"></i> Approve</button>
            <button class="btn btn-danger btn-sm" onclick="empApproveVisitRequest('${r.requestId}', false)"><i data-lucide="x" style="width:13px;height:13px"></i> Reject</button>
          </div>
        </div>`).join('');
      lucide.createIcons({ root: visitRequestEl });
    }

    // The API filters by hostUsername on the server side for EMPLOYEE role
    const list = await ApiVisitors.list();

    const pending  = list.filter(v => v.status === 'PENDING');
    const approved = list.filter(v => v.status === 'PRE_APPROVED' || v.status === 'APPROVED' || v.status === 'CHECKED_IN');

    // Pending section
    const pendingEl = document.getElementById('empPendingList');
    const pendingBadge = document.getElementById('empPendingBadge');
    if (pendingBadge) pendingBadge.textContent = pending.length;

    if (pending.length === 0) {
      pendingEl.innerHTML = '<p class="text-sm text-muted" style="padding:0.5rem 0 0.75rem">No pending requests — you\'re all caught up!</p>';
    } else {
      pendingEl.innerHTML = pending.map(v => `
        <div class="flex items-center gap-3 p-3" style="border-bottom:1px solid var(--border-subtle);background:rgba(234,179,8,0.04);border-radius:var(--radius-md);margin-bottom:0.25rem">
          <div class="avatar" style="width:36px;height:36px;font-size:0.85rem">${v.fullName.charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div class="font-medium">${v.fullName}</div>
            <div class="text-xs text-muted">${v.company || 'Visitor'} &nbsp;&bull;&nbsp; ${v.purposeOfVisit} &nbsp;&bull;&nbsp; ${fmtDate(v.expectedVisitTime)}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-ghost btn-icon" onclick="viewBadge('${v.id}')" title="Details"><i data-lucide="info" style="width:14px;height:14px"></i></button>
            <button class="btn btn-success btn-sm" onclick="empApprove('${v.id}', true)"><i data-lucide="check" style="width:13px;height:13px"></i> Approve</button>
            <button class="btn btn-danger btn-sm" onclick="empApprove('${v.id}', false)"><i data-lucide="x" style="width:13px;height:13px"></i> Reject</button>
          </div>
        </div>`).join('');
      lucide.createIcons({ root: pendingEl });
    }

    // Approved section
    const approvedEl = document.getElementById('empApprovedList');
    if (approved.length === 0) {
      approvedEl.innerHTML = '<p class="text-sm text-muted" style="padding:0.5rem 0 0.75rem">No pre-approved visitors at the moment.</p>';
    } else {
      approvedEl.innerHTML = approved.map(v => `
        <div class="flex items-center gap-3 p-2" style="border-bottom:1px solid var(--border-subtle)">
          <div class="avatar" style="width:32px;height:32px;font-size:0.75rem">${v.fullName.charAt(0).toUpperCase()}</div>
          <div style="flex:1;min-width:0">
            <div class="text-sm font-medium">${v.fullName}</div>
            <div class="text-xs text-muted">${v.company || 'Visitor'} &nbsp;&bull;&nbsp; ${fmtDate(v.expectedVisitTime)}</div>
          </div>
          <div class="flex items-center gap-2">
            ${statusBadge(v.status)}
            <button class="btn btn-ghost btn-icon" onclick="viewBadge('${v.id}')" title="Details"><i data-lucide="more-horizontal" style="width:14px;height:14px"></i></button>
          </div>
        </div>`).join('');
      lucide.createIcons({ root: approvedEl });
    }
  } catch (e) {
    document.getElementById('empPendingList').innerHTML = '<p class="text-danger text-sm">Failed to load requests.</p>';
  }
}

async function empApprove(id, approve) {
  if (!approve) {
    const ok = await confirmDialog('Reject Request', 'Reject this visitor request? They will be notified by email.');
    if (!ok) return;
  }
  try {
    await ApiVisitors.approve(id, approve);
    toast(approve ? 'Visitor approved — QR sent to visitor!' : 'Request rejected');
    await renderEmployeeHome(document.getElementById('mainContent'));
  } catch (e) {
    toast(e.message || 'Action failed', 'error');
  }
}

async function empApproveVisitRequest(requestId, approve) {
  if (!approve) {
    const ok = await confirmDialog('Reject Visit Request', 'Reject this visit request? The visitor will be notified by email.');
    if (!ok) return;
  }
  try {
    await ApiVisitRequests.approve(requestId, approve);
    toast(approve ? 'Visit request approved - QR sent to visitor!' : 'Visit request rejected');
    await renderEmployeeHome(document.getElementById('mainContent'));
  } catch (e) {
    toast(e.message || 'Action failed', 'error');
  }
}

/* ═══════════════════════════════════════════════════════════
   SECURITY GUARD HOME
   ═══════════════════════════════════════════════════════════ */
async function renderGuardHome(el) {
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">Security Portal</h2><p class="page-subtitle">Gate Check-in &amp; Check-out Management</p></div>
      <div class="flex gap-2">
        <button class="btn btn-secondary" onclick="navigateTo('guard-scan')"><i data-lucide="scan-qr-code"></i> Scan QR</button>
        <button class="btn btn-primary" onclick="navigateTo('register')"><i data-lucide="user-plus"></i> Walk-in</button>
      </div>
    </div>

    <div class="grid gap-4" style="grid-template-columns:repeat(3,1fr);margin-bottom:1.5rem" id="guardStats"></div>

    <div class="card" style="margin-bottom:1.5rem">
      <div class="card-header"><span class="card-title">Manual Visitor Search</span><span class="text-muted text-xs">Find visitor by name or email</span></div>
      <div class="flex gap-3" style="padding:0 0 1rem">
        <div class="header-search" style="flex:1">
          <i data-lucide="search"></i>
          <input type="text" id="guardSearch" placeholder="Search by name, email..." autocomplete="off">
        </div>
        <button class="btn btn-secondary" id="guardSearchBtn" onclick="guardDoSearch()">Search</button>
      </div>
      <div id="guardSearchResults"></div>
    </div>

    <div class="grid grid-2 gap-6">
      <div class="card">
        <div class="card-header"><span class="card-title">Expected Arrivals</span><span class="badge badge-warning" id="expectedCount">0</span></div>
        <div id="guardExpected" class="flex-col gap-2"></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">Currently On Premises</span><span class="badge badge-info" id="checkedInCount">0</span></div>
        <div id="guardCheckedIn" class="flex-col gap-2"></div>
      </div>
    </div>`;

  lucide.createIcons({ root: el });

  // Allow Enter key in search
  document.getElementById('guardSearch')?.addEventListener('keydown', e => { if (e.key === 'Enter') guardDoSearch(); });

  try {
    const list = await ApiVisitors.list();
    const expected  = list.filter(v => v.status === 'APPROVED' || v.status === 'PRE_APPROVED');
    const checkedIn = list.filter(v => v.status === 'CHECKED_IN');

    const expectedContainer = document.getElementById('guardExpected');
    const checkedInContainer = document.getElementById('guardCheckedIn');

    if (expected.length === 0) {
      expectedContainer.innerHTML = '<p class="text-sm text-muted" style="padding:0.5rem 0">No pending arrivals.</p>';
    } else {
      expectedContainer.innerHTML = expected.map(v => guardVisitorRow(v, 'expected')).join('');
    }

    if (checkedIn.length === 0) {
      checkedInContainer.innerHTML = '<p class="text-sm text-muted" style="padding:0.5rem 0">No visitors currently on premises.</p>';
    } else {
      checkedInContainer.innerHTML = checkedIn.map(v => guardVisitorRow(v, 'checkedIn')).join('');
    }

    // Stats
    const pending = list.filter(v => v.status === 'PENDING');
    safeSetHTML('guardStats', `
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(99,102,241,0.12);color:#6366f1"><i data-lucide="calendar-check" style="width:18px;height:18px"></i></div>
        <div class="stat-value">${expected.length}</div>
        <div class="stat-label">Expected Today</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(34,197,94,0.12);color:#22c55e"><i data-lucide="user-check" style="width:18px;height:18px"></i></div>
        <div class="stat-value">${checkedIn.length}</div>
        <div class="stat-label">On Premises</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background:rgba(234,179,8,0.12);color:#eab308"><i data-lucide="clock" style="width:18px;height:18px"></i></div>
        <div class="stat-value">${pending.length}</div>
        <div class="stat-label">Pending Approval</div>
      </div>`);

    document.getElementById('expectedCount').textContent = expected.length;
    document.getElementById('checkedInCount').textContent = checkedIn.length;

    lucide.createIcons({ root: expectedContainer });
    lucide.createIcons({ root: checkedInContainer });
    lucide.createIcons({ root: document.getElementById('guardStats') });

    window._guardAllVisitors = list;
  } catch (e) {
    document.getElementById('guardExpected').innerHTML = '<p class="text-danger text-sm">Error loading data.</p>';
    document.getElementById('guardCheckedIn').innerHTML = '<p class="text-danger text-sm">Error loading data.</p>';
  }
}

function guardVisitorRow(v, mode) {
  const actionBtn = mode === 'expected'
    ? `<button class="btn btn-primary btn-sm" onclick="guardCheckIn('${v.id}')">Check In</button>`
    : `<button class="btn btn-secondary btn-sm" onclick="guardCheckOut('${v.id}')">Check Out</button>`;
  return `
    <div class="flex items-center gap-3 p-2" style="border-bottom:1px solid var(--border-subtle)">
      <div class="avatar" style="width:32px;height:32px;font-size:0.75rem">${v.fullName.charAt(0).toUpperCase()}</div>
      <div style="flex:1;min-width:0">
        <div class="text-sm font-medium">${v.fullName}</div>
        <div class="text-xs text-muted">Host: ${v.hostName || v.registeredBy || '—'} · ${v.purposeOfVisit}</div>
      </div>
      <div class="flex gap-2">
        <button class="btn btn-ghost btn-icon" onclick="viewBadge('${v.id}')" title="Details"><i data-lucide="info" style="width:14px;height:14px"></i></button>
        ${actionBtn}
      </div>
    </div>`;
}

async function guardDoSearch() {
  const q = (document.getElementById('guardSearch')?.value || '').trim().toLowerCase();
  const container = document.getElementById('guardSearchResults');
  if (!q) { if (container) container.innerHTML = ''; return; }

  const list = window._guardAllVisitors || [];
  const results = list.filter(v =>
    v.fullName.toLowerCase().includes(q) ||
    (v.email || '').toLowerCase().includes(q) ||
    (v.phone || '').includes(q)
  );

  if (!container) return;
  if (results.length === 0) {
    container.innerHTML = '<p class="text-sm text-muted">No visitors found.</p>';
    return;
  }

  container.innerHTML = `<div class="table-wrapper"><table>
    <thead><tr><th>Visitor</th><th>Host</th><th>Purpose</th><th>Status</th><th>Actions</th></tr></thead>
    <tbody>${results.map(v => {
      let action = '';
      if (v.status === 'APPROVED' || v.status === 'PRE_APPROVED') action = `<button class="btn btn-primary btn-sm" onclick="guardCheckIn('${v.id}')">Check In</button>`;
      else if (v.status === 'CHECKED_IN') action = `<button class="btn btn-secondary btn-sm" onclick="guardCheckOut('${v.id}')">Check Out</button>`;
      return `<tr>
        <td><div class="font-medium">${v.fullName}</div><div class="text-xs text-muted">${v.email||''}</div></td>
        <td class="text-sm">${v.hostName || v.registeredBy || '—'}</td>
        <td class="text-sm">${v.purposeOfVisit}</td>
        <td>${statusBadge(v.status)}</td>
        <td><div class="flex gap-2">
          <button class="btn btn-ghost btn-icon" onclick="viewBadge('${v.id}')" title="Details"><i data-lucide="info" style="width:14px;height:14px"></i></button>
          ${action}
        </div></td></tr>`;
    }).join('')}</tbody>
  </table></div>`;
  lucide.createIcons({ root: container });
}

async function guardCheckIn(id) {
  try { await ApiVisitors.checkIn(id); toast('Visitor checked in!'); await renderGuardHome(document.getElementById('mainContent')); }
  catch (e) { toast(e.message || 'Check-in failed', 'error'); }
}
async function guardCheckOut(id) {
  try { await ApiVisitors.checkOut(id); toast('Visitor checked out!'); await renderGuardHome(document.getElementById('mainContent')); }
  catch (e) { toast(e.message || 'Check-out failed', 'error'); }
}

/* ═══════════════════════════════════════════════════════════
   GUARD QR SCANNER PAGE
   ═══════════════════════════════════════════════════════════ */
function renderGuardScan(el) {
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">QR Code Scanner</h2><p class="page-subtitle">Scan visitor QR code to validate and check in</p></div>
      <button class="btn btn-secondary" onclick="stopQrCamera();navigateTo('guard-home')"><i data-lucide="arrow-left"></i> Back</button>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;max-width:900px">
      <div class="card">
        <div class="card-header"><span class="card-title">Camera Scanner</span></div>
        <div style="position:relative;width:100%;background:#0a0a12;border-radius:var(--radius-md);overflow:hidden;aspect-ratio:1">
          <video id="qrVideo" style="width:100%;height:100%;object-fit:cover" autoplay playsinline muted></video>
          <canvas id="qrCanvas" style="display:none"></canvas>
          <div style="position:absolute;inset:0;border:2px solid #6366f1;opacity:0.4;border-radius:var(--radius-md);pointer-events:none"></div>
          <div id="scanOverlay" style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0.75rem;background:rgba(0,0,0,0.7)">
            <i data-lucide="camera" style="width:36px;height:36px;color:#6366f1"></i>
            <p class="text-sm" style="color:white;margin:0">Click to start camera</p>
            <button class="btn btn-primary btn-sm" onclick="startQrCamera()">Start Camera</button>
          </div>
        </div>
        <p class="text-xs text-muted" style="margin-top:0.75rem;text-align:center">Point camera at visitor QR code — auto-detects</p>
      </div>

      <div class="card">
        <div class="card-header"><span class="card-title">Manual Entry</span></div>
        <div class="flex-col gap-4">
          <p class="text-sm text-muted">If camera unavailable, paste the Request ID from visitor's pass below</p>
          <div class="form-group">
            <label>Request ID</label>
            <input class="form-input" id="manualQrInput" placeholder="e.g. 68156ca73f..." autocomplete="off">
          </div>
          <button class="btn btn-primary" onclick="processManualQr()"><i data-lucide="search"></i> Validate Pass</button>
        </div>
        <hr style="border-color:var(--border-subtle);margin:1.5rem 0">
        <div id="qrResult"></div>
      </div>
    </div>`;

  lucide.createIcons({ root: el });
  document.getElementById('manualQrInput')?.addEventListener('keydown', e => { if (e.key === 'Enter') processManualQr(); });
}

let qrStream = null;
let qrScanInterval = null;

async function startQrCamera() {
  const overlay = document.getElementById('scanOverlay');
  const video = document.getElementById('qrVideo');
  if (!video) return;
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
    video.srcObject = qrStream;
    await video.play();
    if (overlay) overlay.style.display = 'none';
    const canvas = document.getElementById('qrCanvas');
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx && window.jsQR) {
      qrScanInterval = setInterval(() => {
        if (video.readyState < video.HAVE_ENOUGH_DATA) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = window.jsQR(img.data, img.width, img.height);
        if (code && code.data) {
          clearInterval(qrScanInterval);
          const requestMatch = code.data.match(/VMS-REQUEST-ID:([^|]+)/);
          const visitorMatch = code.data.match(/VMS-ID:([^|]+)/);
          const match = requestMatch || visitorMatch;
          const requestId = match ? match[1] : code.data;
          stopQrCamera();
          processQrScan(requestId);
        }
      }, 300);
    } else if (!window.jsQR) {
      toast('jsQR not loaded — use Manual Entry', 'error');
    }
  } catch (e) {
    toast('Camera access denied. Use manual entry.', 'error');
    if (overlay) overlay.style.display = 'flex';
  }
}

function stopQrCamera() {
  if (qrStream) { qrStream.getTracks().forEach(t => t.stop()); qrStream = null; }
  if (qrScanInterval) { clearInterval(qrScanInterval); qrScanInterval = null; }
}

async function processManualQr() {
  const requestId = document.getElementById('manualQrInput')?.value.trim();
  if (!requestId) { toast('Please enter a Request ID', 'error'); return; }
  await processQrScan(requestId);
}

async function processQrScan(requestId) {
  const resultDiv = document.getElementById('qrResult');
  if (!resultDiv) return;
  resultDiv.innerHTML = showLoader();
  try {
    let v;
    try {
      v = await ApiVisitRequests.scanQr(requestId);
    } catch (approvalErr) {
      if (!String(approvalErr.message || '').toLowerCase().includes('not found')) throw approvalErr;
      v = await ApiPublic.scanQr(requestId);
    }
    const canCheckIn  = v.status === 'APPROVED' || v.status === 'PRE_APPROVED';
    const canCheckOut = v.status === 'CHECKED_IN';
    resultDiv.innerHTML = `
      <div class="flex-col gap-4">
        <div class="flex items-center gap-3">
          ${v.photoUrl ? `<img src="${v.photoUrl}" style="width:52px;height:52px;border-radius:50%;object-fit:cover">` : `<div class="avatar" style="width:52px;height:52px;font-size:1.1rem">${v.fullName.charAt(0)}</div>`}
          <div style="flex:1">
            <div class="font-medium">${v.fullName}</div>
            <div class="text-xs text-muted">${v.company || 'Visitor'}</div>
          </div>
          ${statusBadge(v.status)}
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;font-size:0.8rem;background:var(--bg-surface-raised);padding:0.75rem;border-radius:var(--radius-md)">
          <div><div class="text-dim text-xs">HOST</div><div>${v.hostName || v.registeredBy || '—'}</div></div>
          <div><div class="text-dim text-xs">PURPOSE</div><div>${v.purposeOfVisit}</div></div>
          <div><div class="text-dim text-xs">EXPECTED</div><div>${fmtDate(v.expectedVisitTime)}</div></div>
          <div><div class="text-dim text-xs">EMAIL</div><div>${v.email || '—'}</div></div>
        </div>
        ${canCheckIn  ? `<button class="btn btn-primary" onclick="guardCheckIn('${v.id}')"><i data-lucide="log-in"></i> Confirm Check-In</button>` : ''}
        ${canCheckOut ? `<button class="btn btn-secondary" onclick="guardCheckOut('${v.id}')"><i data-lucide="log-out"></i> Confirm Check-Out</button>` : ''}
        ${!canCheckIn && !canCheckOut ? `<p class="text-sm text-muted">No actions available for current status (${v.status}).</p>` : ''}
      </div>`;
    lucide.createIcons({ root: resultDiv });
  } catch (e) {
    resultDiv.innerHTML = `
      <div style="color:var(--danger);text-align:center;padding:1rem">
        <i data-lucide="alert-triangle" style="width:28px;height:28px"></i>
        <p class="text-sm" style="margin-top:0.5rem">${e.message || 'Invalid QR code or Request ID'}</p>
      </div>`;
    lucide.createIcons({ root: resultDiv });
  }
}

/* ═══════════════════════════════════════════════════════════
   VISITOR SELF-SERVICE HOME
   ═══════════════════════════════════════════════════════════ */
async function renderVisitorHome(el) {
  el.innerHTML = `
    <div class="page-header">
      <div><h2 class="page-title">My Visit Requests</h2><p class="page-subtitle">Check the status of your visit requests and access your digital pass</p></div>
    </div>
    <div id="visitorStatusContent">${showLoader()}</div>`;

  try {
    const visitorRecords = await ApiVisitors.myRequests();
    let visitRequests = [];
    try {
      visitRequests = await ApiVisitRequests.myRequests();
    } catch {
      visitRequests = [];
    }
    const visitorIds = new Set((visitorRecords || []).map(v => v.id));
    const requestOnlyRecords = (visitRequests || [])
      .filter(r => !r.preApprovedVisitorId || !visitorIds.has(r.preApprovedVisitorId))
      .map(r => ({
        id: r.requestId,
        fullName: r.visitorName,
        email: r.email,
        phone: r.phone,
        purposeOfVisit: r.purpose,
        hostName: r.hostEmployeeName,
        hostUsername: r.hostEmployeeId,
        status: (r.status || 'Pending').toUpperCase(),
        expectedVisitTime: r.dateTime,
        visitEndTime: r.visitEndTime,
        photoUrl: r.photoUrl,
        qrCodeUrl: r.qrCodeUrl,
        company: r.company || 'Visit Request',
        isVisitRequestOnly: true
      }));
    const list = [...(visitorRecords || []), ...requestOnlyRecords];

    const container = document.getElementById('visitorStatusContent');
    if (!container) return;

    if (!list || list.length === 0) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:3rem">
          <i data-lucide="clipboard-list" style="width:48px;height:48px;color:var(--text-tertiary);margin:0 auto 1rem"></i>
          <h3 style="margin-bottom:0.5rem">No Visit Requests</h3>
          <p class="text-muted text-sm">You haven't submitted any visit requests yet.</p>
        </div>`;
      lucide.createIcons({ root: container });
      return;
    }

    container.innerHTML = list.map(v => {
      const isPending     = v.status === 'PENDING';
      const isApproved    = v.status === 'PRE_APPROVED' || v.status === 'APPROVED';
      const isCheckedIn   = v.status === 'CHECKED_IN';
      const isRejected    = v.status === 'REJECTED';
      const hasPass       = isApproved || isCheckedIn;

      const borderColor = isPending ? 'var(--warning)' : isRejected ? 'var(--danger)' : isApproved ? '#6366f1' : 'var(--success)';

      return `
        <div class="card" style="margin-bottom:1.25rem;border-left:4px solid ${borderColor}">
          <div class="flex items-center gap-4" style="margin-bottom:1rem">
            ${v.photoUrl ? `<img src="${v.photoUrl}" style="width:52px;height:52px;border-radius:50%;object-fit:cover">` : `<div class="avatar" style="width:52px;height:52px;font-size:1.2rem">${v.fullName.charAt(0)}</div>`}
            <div style="flex:1">
              <h3 style="font-size:1.1rem;font-weight:600;margin-bottom:0.25rem">${v.fullName}</h3>
              <div class="text-sm text-muted">Request ID: <span style="font-family:monospace;font-size:0.75rem">${v.visitRequestId || v.id}</span></div>
            </div>
            ${statusBadge(v.status)}
          </div>

          <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:0.75rem;background:var(--bg-surface-raised);padding:1rem;border-radius:var(--radius-md);margin-bottom:1rem;font-size:0.85rem">
            <div><div class="text-dim text-xs" style="margin-bottom:0.2rem">HOST EMPLOYEE</div><div class="font-medium">${v.hostName || v.registeredBy || '—'}</div></div>
            <div><div class="text-dim text-xs" style="margin-bottom:0.2rem">PURPOSE</div><div>${v.purposeOfVisit}</div></div>
            <div><div class="text-dim text-xs" style="margin-bottom:0.2rem">VISIT TIME</div><div>${fmtDate(v.expectedVisitTime)}</div></div>
            <div><div class="text-dim text-xs" style="margin-bottom:0.2rem">COMPANY</div><div>${v.company || '—'}</div></div>
            <div><div class="text-dim text-xs" style="margin-bottom:0.2rem">PHONE</div><div>${v.phone || '—'}</div></div>
            <div><div class="text-dim text-xs" style="margin-bottom:0.2rem">DEPARTURE</div><div>${fmtDate(v.visitEndTime)}</div></div>
          </div>

          ${hasPass && v.qrCodeUrl ? renderDigitalPassCard(v) : ''}

          ${isPending ? `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:rgba(234,179,8,0.08);border-radius:var(--radius-md);border:1px solid rgba(234,179,8,0.2)">
              <i data-lucide="clock" style="width:18px;height:18px;color:var(--warning)"></i>
              <span class="text-sm" style="color:var(--warning)">Awaiting approval from your host. You\'ll receive an email once the decision is made.</span>
            </div>` : ''}

          ${isRejected ? `
            <div style="display:flex;align-items:center;gap:0.75rem;padding:0.75rem 1rem;background:rgba(248,81,73,0.08);border-radius:var(--radius-md);border:1px solid rgba(248,81,73,0.2)">
              <i data-lucide="x-circle" style="width:18px;height:18px;color:var(--danger)"></i>
              <span class="text-sm" style="color:var(--danger)">This request was rejected. Please contact the host employee to discuss.</span>
            </div>` : ''}
        </div>`;
    }).join('');

    lucide.createIcons({ root: container });
  } catch (e) {
    document.getElementById('visitorStatusContent').innerHTML = '<p class="text-danger text-sm">Failed to load your requests.</p>';
  }
}

/* ═══════════════════════════════════════════════════════════
   UI Components — Reusable UI helpers
   ═══════════════════════════════════════════════════════════ */

/* ── Safe DOM helper ─── */
function safeSetHTML(id, content) {
  const el = document.getElementById(id);
  if (el) { el.innerHTML = content; lucide.createIcons(); }
}

/* ── Toast ─────────────────────────────────────────────── */
function toast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icon = type === 'success' ? 'check-circle' : 'alert-circle';
  el.innerHTML = `<i data-lucide="${icon}"></i><span>${message}</span>`;
  container.appendChild(el);
  lucide.createIcons({ root: el });
  setTimeout(() => { el.classList.add('removing'); setTimeout(() => el.remove(), 300); }, 3500);
}

/* ── Confirm Dialog ────────────────────────────────────── */
function confirmDialog(title, message) {
  return new Promise(resolve => {
    openModal(title, `
      <div class="flex-col gap-4">
        <p class="text-secondary">${message}</p>
        <div class="flex justify-between" style="justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-secondary" id="confirmNo">Cancel</button>
          <button class="btn btn-danger" id="confirmYes">Confirm</button>
        </div>
      </div>
    `);
    document.getElementById('confirmNo').onclick = () => { closeModal(); resolve(false); };
    document.getElementById('confirmYes').onclick = () => { closeModal(); resolve(true); };
  });
}

/* ── Prompt Dialog ─────────────────────────────────────── */
function promptDialog(title, message, defaultVal = '') {
  return new Promise(resolve => {
    openModal(title, `
      <div class="flex-col gap-4">
        <p class="text-secondary">${message}</p>
        <input type="text" id="promptInput" class="form-input" value="${defaultVal}">
        <div class="flex justify-between" style="justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-secondary" id="promptCancel">Cancel</button>
          <button class="btn btn-primary" id="promptOk">OK</button>
        </div>
      </div>
    `);
    const input = document.getElementById('promptInput');
    input.focus();
    document.getElementById('promptCancel').onclick = () => { closeModal(); resolve(null); };
    document.getElementById('promptOk').onclick = () => { closeModal(); resolve(input.value.trim()); };
  });
}

/* ── Modal ─────────────────────────────────────────────── */
function openModal(title, bodyHtml) {
  const overlay = document.getElementById('modalOverlay');
  const titleEl = document.getElementById('modalTitle');
  const bodyEl = document.getElementById('modalBody');
  if (!overlay || !titleEl || !bodyEl) return;
  
  titleEl.textContent = title;
  bodyEl.innerHTML = bodyHtml;
  lucide.createIcons({ root: bodyEl });
  overlay.classList.add('open');
}
function closeModal() {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.classList.remove('open');
}
document.addEventListener('DOMContentLoaded', () => {
  const overlay = document.getElementById('modalOverlay');
  if (overlay) overlay.addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
});

/* ── Status Badge ──────────────────────────────────────── */
function getStatusClass(status) {
  switch (status) {
    case 'APPROVED':
    case 'PRE_APPROVED': return 'success';
    case 'PENDING':      return 'warning';
    case 'REJECTED':     return 'danger';
    case 'CHECKED_IN':   return 'info';
    case 'CHECKED_OUT':  return 'neutral';
    default:             return 'neutral';
  }
}
function statusBadge(status) {
  const s = (status || 'PENDING');
  const display = s.replace('_', ' ');
  return `<span class="badge badge-${getStatusClass(s)}"><span class="badge-dot"></span>${display}</span>`;
}

/* ── Format Date ───────────────────────────────────────── */
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
}

/* ── Sidebar Builder ───────────────────────────────────── */
function buildSidebar(role, activePage) {
  const links = { ADMIN: [
    { id: 'dashboard', icon: 'layout-dashboard', label: 'Dashboard' },
    { id: 'visitors', icon: 'users', label: 'Visitors' },
    { id: 'employees', icon: 'building-2', label: 'Employees' },
    { id: 'register', icon: 'user-plus', label: 'Register Visitor' }
  ], EMPLOYEE: [
    { id: 'employee-home', icon: 'layout-dashboard', label: 'Home' },
    { id: 'visitors', icon: 'users', label: 'My Visitors' },
    { id: 'register', icon: 'user-plus', label: 'Register Visitor' }
  ], SECURITY_GUARD: [
    { id: 'guard-home', icon: 'shield-check', label: 'Security Terminal' },
    { id: 'guard-scan', icon: 'scan-line',    label: 'Scan QR Code' },
    { id: 'register',   icon: 'user-plus',    label: 'Register Walk-in' }
  ], ROLE_VISITOR: [
    { id: 'visitor-home', icon: 'ticket', label: 'My Requests' }
  ]};

  const navItems = (links[role] || links.EMPLOYEE).map(l =>
    `<a href="#" data-page="${l.id}" class="${activePage === l.id ? 'active' : ''}" onclick="navigateTo('${l.id}')">
      <i data-lucide="${l.icon}"></i><span>${l.label}</span></a>`
  ).join('');

  const initials = (Auth.getName() || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const roleLabel = (role || '').replace('ROLE_', '').replace('_', ' ').toLowerCase();

  const sidebarEl = document.getElementById('sidebar');
  if (sidebarEl) {
    sidebarEl.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-brand-icon"><i data-lucide="shield-check" style="width:14px;height:14px"></i></div>
        <div class="sidebar-brand">VMS</div>
      </div>
      <nav class="sidebar-nav">${navItems}</nav>
      <div class="sidebar-footer">
        <div class="user-profile-btn" onclick="logout()" title="Sign Out">
          <div class="avatar">${initials}</div>
          <div class="user-info">
            <div class="user-name">${Auth.getName()}</div>
            <div class="user-role">${roleLabel}</div>
          </div>
          <i data-lucide="log-out" style="margin-left:auto;width:14px;color:var(--text-tertiary)"></i>
        </div>
      </div>`;
  }
    
  const mobileNavEl = document.getElementById('mobileNav');
  if (mobileNavEl) {
    mobileNavEl.innerHTML = navItems;
  }
    
  const headerAvatar = document.getElementById('headerAvatar');
  if (headerAvatar) headerAvatar.textContent = initials;
  
  lucide.createIcons();
}

/* ── Loader ────────────────────────────────────────────── */
function showLoader() { return '<div class="page-loader"><div class="spinner"></div></div>'; }

/* ── Searchable Host Dropdown ──────────────────────────── */
function createHostDropdown(containerId) {
  const container = document.getElementById(containerId);
  let selectedHost = null;
  let debounceTimer = null;

  if (!container) return { getSelected: () => null, clear: () => {} };
  
  container.innerHTML = `
    <div class="search-dropdown">
      <input type="text" class="form-input" id="hostSearchInput" placeholder="Search host by name or email..." autocomplete="off">
      <div class="search-dropdown-results hidden" id="hostResults"></div>
      <div id="selectedHostDisplay" class="hidden"></div>
      <input type="hidden" id="hostUsername" name="hostUsername">
    </div>`;

  const input = document.getElementById('hostSearchInput');
  const results = document.getElementById('hostResults');
  const display = document.getElementById('selectedHostDisplay');
  const hidden = document.getElementById('hostUsername');

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      const q = input.value.trim();
      if (q.length < 1) { results.classList.add('hidden'); return; }
      try {
        const hosts = await ApiEmployees.hosts(q);
        if (hosts.length === 0) { results.innerHTML = '<div class="sdr-empty">No employees found</div>'; }
        else { results.innerHTML = hosts.map(h => `<div class="sdr-item" data-username="${h.username}" data-name="${h.name}">
          <span class="sdr-name">${h.name}</span><span class="sdr-detail">${h.department || 'Employee'} · ${h.email || ''}</span></div>`).join(''); }
        results.classList.remove('hidden');
      } catch { results.innerHTML = '<div class="sdr-empty">Error searching</div>'; results.classList.remove('hidden'); }
    }, 250);
  });

  results.addEventListener('click', e => {
    const item = e.target.closest('.sdr-item');
    if (!item) return;
    selectedHost = { username: item.dataset.username, name: item.dataset.name };
    hidden.value = selectedHost.username;
    input.classList.add('hidden');
    display.innerHTML = `<div class="selected-host"><span><i data-lucide="user-check" style="display:inline;width:14px;height:14px;margin-right:6px;vertical-align:middle"></i>${selectedHost.name}</span><button type="button" class="remove-host" id="removeHost"><i data-lucide="x" style="width:16px;height:16px"></i></button></div>`;
    display.classList.remove('hidden');
    results.classList.add('hidden');
    lucide.createIcons({ root: display });
    document.getElementById('removeHost').onclick = () => { clearHostSelection(); };
  });

  document.addEventListener('click', e => { if (!container.contains(e.target)) results.classList.add('hidden'); });

  function clearHostSelection() {
    selectedHost = null; hidden.value = '';
    input.value = ''; input.classList.remove('hidden');
    display.classList.add('hidden'); display.innerHTML = '';
  }

  return { getSelected: () => selectedHost, clear: clearHostSelection };
}

/* ── Pagination Helper ─────────────────────────────────── */
function paginate(items, page, perPage = 10) {
  const total = Math.ceil(items.length / perPage);
  const start = (page - 1) * perPage;
  return { data: items.slice(start, start + perPage), page, total, perPage };
}
function renderPagination(current, total, onPage) {
  if (total <= 1) return '';
  let html = '<div class="pagination">';
  html += `<button ${current <= 1 ? 'disabled' : ''} onclick="${onPage}(${current - 1})"><i data-lucide="chevron-left" style="width:16px;height:16px"></i></button>`;
  for (let i = 1; i <= total; i++) {
    html += `<button class="${i === current ? 'active' : ''}" onclick="${onPage}(${i})">${i}</button>`;
  }
  html += `<button ${current >= total ? 'disabled' : ''} onclick="${onPage}(${current + 1})"><i data-lucide="chevron-right" style="width:16px;height:16px"></i></button></div>`;
  return html;
}

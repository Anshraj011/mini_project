/**
 * Public Portal Logic — Unauthenticated Visitor Flows
 */

// ── Auth / Login ──────────────────────────────────────────
function openVisitorLogin() { document.getElementById('visitorLoginOverlay').classList.add('open'); showOtpSend(); }
function closeVisitorLogin() { document.getElementById('visitorLoginOverlay').classList.remove('open'); }

let currentOtpRequestId = null;

function showOtpSend() {
  document.getElementById('otpSendForm').classList.remove('hidden');
  document.getElementById('otpVerifyForm').classList.add('hidden');
  document.getElementById('vLoginAlert').classList.add('hidden');
}

function showOtpVerify() {
  document.getElementById('otpSendForm').classList.add('hidden');
  document.getElementById('otpVerifyForm').classList.remove('hidden');
}

document.getElementById('otpSendForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('sendOtpBtn');
  const email = document.getElementById('vEmail').value;
  btn.disabled = true; btn.textContent = 'Sending...';
  try {
    const res = await ApiPublic.sendOtp(email);
    currentOtpRequestId = res.requestId; // Store requestId for verification
    toast('OTP sent to your email');
    showOtpVerify();
  } catch (err) {
    const alert = document.getElementById('vLoginAlert');
    alert.innerHTML = `<i data-lucide="alert-circle" style="width:14px;height:14px;display:inline;margin-right:8px;vertical-align:middle"></i>${err.message || 'Failed to send OTP'}`;
    alert.classList.remove('hidden');
    lucide.createIcons({ root: alert });
  } finally {
    btn.disabled = false; btn.textContent = 'Send OTP';
  }
});

document.getElementById('otpVerifyForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const btn = document.getElementById('verifyOtpBtn');
  const email = document.getElementById('vEmail').value;
  const otp = document.getElementById('vOtp').value;
  btn.disabled = true; btn.textContent = 'Verifying...';
  try {
    if (!currentOtpRequestId) throw new Error("Missing requestId. Please request OTP again.");
    const res = await ApiPublic.verifyOtp(email, otp, currentOtpRequestId);
    Auth.save(res);
    window.location.href = 'dashboard.html';
  } catch (err) {
    const alert = document.getElementById('vLoginAlert');
    alert.innerHTML = `<i data-lucide="alert-circle" style="width:14px;height:14px;display:inline;margin-right:8px;vertical-align:middle"></i>${err.message || 'Invalid OTP'}`;
    alert.classList.remove('hidden');
    lucide.createIcons({ root: alert });
  } finally {
    btn.disabled = false; btn.textContent = 'Verify & Access Pass';
  }
});

// ── Public Request Flow (MODAL BASED) ──────────────────────
let publicEmployees = [];
let selectedPublicHost = null;

async function openRequestVisitModal() {
  openModal('Request a Visit', `
    <div id="requestFlowContainer" class="flex-col gap-6">
      <div id="step1">
        <div class="form-group" style="margin-bottom:0">
          <label>Search Host Employee *</label>
          <div class="header-search" style="width:100%; margin-top:0.5rem">
            <i data-lucide="search"></i>
            <input type="text" id="hostSearch" placeholder="Type name or department..." autocomplete="off">
          </div>
          <div id="hostResults" class="search-dropdown-results hidden" style="position:static; max-height:250px; margin-top:0.5rem"></div>
          <p class="text-xs text-muted mt-2">You must select an employee from the list to proceed.</p>
        </div>
      </div>

      <form id="publicRequestForm" class="hidden flex-col gap-4">
        <div id="selectedHostDisplay"></div>
        
        <div class="grid grid-2 gap-4">
          <div class="form-group" data-field="visitorName"><label>Full Name *</label><input class="form-input" name="visitorName" placeholder="Jane Doe"></div>
          <div class="form-group" data-field="email"><label>Email Address *</label><input type="email" class="form-input" name="email" placeholder="jane@company.com"></div>
        </div>
        
        <div class="grid grid-2 gap-4">
          <div class="form-group" data-field="phone"><label>Phone (10 digits) *</label><input class="form-input" name="phone" placeholder="9876543210" maxlength="10"></div>
          <div class="form-group" data-field="company"><label>Company *</label><input class="form-input" name="company" placeholder="Visitor's Company"></div>
        </div>

        <div class="form-group" data-field="purpose"><label>Purpose of Visit *</label><input class="form-input" name="purpose" placeholder="Meeting, Interview..."></div>

        <div class="grid grid-2 gap-4">
          <div class="form-group" data-field="dateTime"><label>Expected Arrival *</label><input type="datetime-local" class="form-input" name="dateTime"></div>
          <div class="form-group" data-field="visitEndTime"><label>Expected Departure *</label><input type="datetime-local" class="form-input" name="visitEndTime"></div>
        </div>

        <div class="form-group"><label>Visitor Photo (Optional)</label><input type="file" class="form-input" name="photo" accept="image/*" style="padding:0.4rem"></div>

        <div class="flex gap-3 mt-4 pt-4" style="border-top:1px solid var(--border-subtle)">
          <button type="button" class="btn btn-secondary flex-1" onclick="resetPublicFlow()">← Change Host</button>
          <button type="submit" class="btn btn-primary flex-1" id="submitBtn">Submit Request</button>
        </div>
      </form>
    </div>
  `);

  try {
    publicEmployees = await ApiPublic.employees();
    initHostSearch();
  } catch (e) {
    toast('Unable to load employee list', 'error');
  }
}

function initHostSearch() {
  const input = document.getElementById('hostSearch');
  const results = document.getElementById('hostResults');
  if (!input) return;

  input.addEventListener('input', () => {
    const val = input.value.toLowerCase().trim();
    if (!val) { results.innerHTML = ''; results.classList.add('hidden'); return; }

    const filtered = publicEmployees.filter(e => 
      e.name.toLowerCase().includes(val) || (e.department || '').toLowerCase().includes(val)
    );

    if (filtered.length === 0) {
      results.innerHTML = '<div class="sdr-empty">No employees found</div>';
    } else {
      results.innerHTML = filtered.map(e => `
        <div class="sdr-item" onclick="selectPublicHost('${e.username}')">
          <div class="font-medium text-primary">${e.name}</div>
          <div class="text-xs text-muted">${e.department || 'Employee'}</div>
        </div>
      `).join('');
    }
    results.classList.remove('hidden');
  });
}

function selectPublicHost(username) {
  selectedPublicHost = publicEmployees.find(e => e.username === username);
  const step1 = document.getElementById('step1');
  const form = document.getElementById('publicRequestForm');
  if (!step1 || !form) return;

  step1.classList.add('hidden');
  form.classList.remove('hidden');
  
  document.getElementById('selectedHostDisplay').innerHTML = `
    <div class="flex items-center gap-3 bg-surface-raised" style="padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-strong)">
      <div class="avatar" style="width:40px; height:40px">${selectedPublicHost.name.charAt(0)}</div>
      <div>
        <div class="font-medium text-sm">Visiting: <span class="text-primary">${selectedPublicHost.name}</span></div>
        <div class="text-xs text-muted">${selectedPublicHost.department || 'Employee'}</div>
      </div>
    </div>
  `;

  const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const later = new Date(now.getTime() + 60 * 60 * 1000);
  form.dateTime.value = now.toISOString().slice(0, 16);
  form.visitEndTime.value = later.toISOString().slice(0, 16);

  initPublicValidation(form);
}

function resetPublicFlow() {
  selectedPublicHost = null;
  const step1 = document.getElementById('step1');
  const form = document.getElementById('publicRequestForm');
  if (step1) step1.classList.remove('hidden');
  if (form) form.classList.add('hidden');
  const input = document.getElementById('hostSearch');
  if (input) { input.value = ''; input.focus(); }
}

function initPublicValidation(form) {
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

  form.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('input', () => setFieldError(input.name, null));
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    
    let isValid = true;
    if (form.visitorName.value.trim().length < 2) { setFieldError('visitorName', 'Required'); isValid = false; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.value)) { setFieldError('email', 'Invalid format'); isValid = false; }
    if (!/^[0-9]{10}$/.test(form.phone.value)) { setFieldError('phone', '10 digits required'); isValid = false; }
    if (!form.company.value.trim()) { setFieldError('company', 'Required'); isValid = false; }
    if (form.purpose.value.trim().length < 3) { setFieldError('purpose', 'Required'); isValid = false; }
    if (!form.dateTime.value) { setFieldError('dateTime', 'Required'); isValid = false; }
    if (!form.visitEndTime.value) { setFieldError('visitEndTime', 'Required'); isValid = false; }
    if (form.dateTime.value && form.visitEndTime.value && form.visitEndTime.value < form.dateTime.value) {
      setFieldError('visitEndTime', 'Must be after arrival');
      isValid = false;
    }

    if (!isValid) return;

    const btn = document.getElementById('submitBtn');
    btn.disabled = true; btn.textContent = 'Submitting...';

    try {
      const fd = new FormData();
      fd.append('visitorName', form.visitorName.value.trim());
      fd.append('email', form.email.value.trim());
      fd.append('phone', form.phone.value.trim());
      fd.append('company', form.company.value.trim());
      fd.append('hostEmployeeId', selectedPublicHost.username);
      fd.append('purpose', form.purpose.value.trim());
      fd.append('dateTime', form.dateTime.value);
      fd.append('visitEndTime', form.visitEndTime.value);
      if (form.photo.files[0]) fd.append('file', form.photo.files[0]);

      const response = await ApiVisitRequests.create(fd);
      
      document.getElementById('requestFlowContainer').innerHTML = `
        <div class="flex-col items-center text-center gap-4" style="padding:1rem">
          <div style="color:var(--warning); margin-bottom:0.5rem"><i data-lucide="clock" style="width:48px;height:48px"></i></div>
          <h2 class="page-title" style="margin:0; font-size:1.25rem;">Request Submitted</h2>
          <p class="text-muted text-sm">Your visit request for <span class="text-primary font-medium">${selectedPublicHost.name}</span> is pending approval. A QR code will be generated only after the host approves it.</p>
          <div class="text-xs text-muted" style="font-family:monospace;background:var(--bg-surface-raised);padding:0.5rem 0.75rem;border-radius:var(--radius-md)">Request ID: ${response.requestId}</div>
          <button class="btn btn-secondary mt-2" onclick="closeModal()">Close</button>
        </div>
      `;
      lucide.createIcons({ root: document.getElementById('requestFlowContainer') });
      toast('Request submitted successfully');
    } catch (err) {
      toast(err.message || 'Submission failed', 'error');
      btn.disabled = false; btn.textContent = 'Submit Request';
    }
  });
}

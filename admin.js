/* =========================================================
   CerdasPlus — Admin Panel JS
   ========================================================= */

// ── State ──────────────────────────────────────────────────
const adminState = {
  admin:          null,
  view:           'login',
  dashTab:        'payments',
  filter:         'all',
  search:         '',
  payments:       [],
  stats:          { total:0, pending:0, verified:0, rejected:0 },
  loading:        false,
  sidebarOpen:    false,
  drawerOpen:     false,
  drawerUser:     null,
  modalAction:    null,
  addStudentOpen: false,
};

// ── Format ─────────────────────────────────────────────────
const fmt = n => n ? 'Rp ' + Number(n).toLocaleString('id-ID') : '—';

const PKG_LABELS = { monthly: 'Bulanan', annual: 'Tahunan' };
const LEVEL_LABEL = { SD:'SD', SMP:'SMP', SMA:'SMA' };

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str);
  return d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' });
}

// ── Toast (sama dengan app.js agar bisa standalone) ────────
function toast(msg, type = 'info', dur = 3500) {
  const icons = { success:'✓', error:'✕', info:'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 300);
  }, dur);
}

// ── Avatar helpers ─────────────────────────────────────────
const COLORS = ['#2F6FED','#C930F0','#00D4B4','#FF8C00','#E040FB','#4CAF50','#F06292','#26C6DA'];
function avatarColor(str) { return COLORS[(str?.charCodeAt(0) || 0) % COLORS.length]; }
function initials(name)   { return (name || 'U').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase(); }

// ── Supabase: load semua payments ──────────────────────────
async function loadPayments() {
  adminState.loading = true;
  renderDashContent();

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    toast('Gagal memuat data: ' + error.message, 'error');
    adminState.loading = false;
    renderDashContent();
    return;
  }

  adminState.payments = data || [];
  calcStats();
  adminState.loading = false;
  renderDashContent();
}

function calcStats() {
  const p = adminState.payments;
  adminState.stats = {
    total:    p.length,
    pending:  p.filter(x => x.payment_status === 'pending').length,
    verified: p.filter(x => x.payment_status === 'verified').length,
    rejected: p.filter(x => x.payment_status === 'rejected').length,
  };
}

// ── Supabase: update payment status ───────────────────────
async function updateStatus(userId, status) {
  const { error } = await supabaseClient
    .from('profiles')
    .update({ payment_status: status })
    .eq('id', userId);

  if (error) throw new Error(error.message);

  // Update local state
  const idx = adminState.payments.findIndex(p => p.id === userId);
  if (idx !== -1) adminState.payments[idx].payment_status = status;
  calcStats();
}

// ── Auth ───────────────────────────────────────────────────
async function adminLogin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Cek apakah user ada di tabel admins
  const { data: adminRow, error: aErr } = await supabaseClient
    .from('admins')
    .select('id')
    .eq('id', data.user.id)
    .maybeSingle();

  if (aErr || !adminRow) {
    await supabaseClient.auth.signOut();
    throw new Error('Akun ini tidak memiliki akses admin.');
  }

  adminState.admin = data.user;
}

async function adminLogout() {
  await supabaseClient.auth.signOut();
  adminState.admin = null;
  adminState.view  = 'login';
  render();
}

// ── Modal ──────────────────────────────────────────────────
function openModal({ icon, title, body, confirmLabel, confirmClass, onConfirm }) {
  document.getElementById('modalIcon').textContent        = icon;
  document.getElementById('modalTitle').textContent       = title;
  document.getElementById('modalBody').textContent        = body;
  const btn = document.getElementById('modalConfirmBtn');
  btn.textContent = confirmLabel;
  btn.className   = `btn ${confirmClass}`;
  adminState.modalAction = onConfirm;
  document.getElementById('confirmModal').style.display = 'flex';
}
function closeModal() {
  document.getElementById('confirmModal').style.display = 'none';
  adminState.modalAction = null;
}
async function runModalAction() {
  if (adminState.modalAction) await adminState.modalAction();
  closeModal();
}

// ── Drawer ─────────────────────────────────────────────────
function openDrawer(user) {
  adminState.drawerUser = user;
  adminState.drawerOpen = true;
  renderDrawer();
  document.getElementById('drawerBackdrop').classList.add('open');
  document.getElementById('detailDrawer').classList.add('open');
}
function closeDrawer() {
  adminState.drawerOpen = false;
  adminState.drawerUser = null;
  document.getElementById('drawerBackdrop').classList.remove('open');
  document.getElementById('detailDrawer').classList.remove('open');
}

// ── Render dispatcher ──────────────────────────────────────
function render() {
  const app = document.getElementById('adminApp');
  if (adminState.view === 'login') {
    renderLogin(app);
  } else {
    renderDashboard(app);
  }
}

// ─────────────────────────────────────────────────────────
//  LOGIN VIEW
// ─────────────────────────────────────────────────────────
function renderLogin(container) {
  container.innerHTML = `
    <div class="admin-login-page">
      <div class="admin-login-card fade-in">
        <div style="text-align:center;margin-bottom:28px">
          <div class="admin-login-badge">🔐 ADMIN ACCESS</div>
          <div style="font-family:var(--ff-display);font-size:1.6rem;font-weight:900;margin-bottom:6px">
            Cerdas<span style="color:var(--blue-light)">Plus</span>
            <span class="admin-logo-badge" style="font-size:.65rem">ADMIN</span>
          </div>
          <div style="color:var(--txt-1);font-size:.9rem">Masuk ke panel manajemen pembayaran</div>
        </div>

        <form style="display:flex;flex-direction:column;gap:16px" onsubmit="handleAdminLogin(event)">
          <div class="form-group">
            <label class="form-label">Email Admin</label>
            <input class="form-input" type="email" id="adminEmail" placeholder="admin@cerdasplus.id" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" id="adminPwd" placeholder="Password admin" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-pink btn-full btn-lg" id="loginBtn">Masuk ke Admin Panel</button>
        </form>

        <div style="text-align:center;margin-top:20px;font-size:.8rem;color:var(--txt-2)">
          Akses terbatas — hanya untuk admin yang terdaftar
        </div>
      </div>
    </div>
  `;
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  btn.disabled = true; btn.textContent = 'Memverifikasi...';
  try {
    await adminLogin(
      document.getElementById('adminEmail').value.trim(),
      document.getElementById('adminPwd').value,
    );
    adminState.view = 'dashboard';
    render();
    await loadPayments();
    toast('Selamat datang, Admin!', 'success');
  } catch (err) {
    toast(err.message || 'Login gagal.', 'error');
    btn.disabled = false; btn.textContent = 'Masuk ke Admin Panel';
  }
}

// ─────────────────────────────────────────────────────────
//  DASHBOARD VIEW
// ─────────────────────────────────────────────────────────
function renderDashboard(container) {
  const email = adminState.admin?.email || 'admin';
  const init  = email[0].toUpperCase();

  container.innerHTML = `
    <!-- Overlay mobile -->
    <div class="admin-overlay ${adminState.sidebarOpen ? 'show' : ''}"
         id="adminOverlay" onclick="toggleAdminSidebar()"></div>

    <!-- Sidebar -->
    <aside class="admin-sidebar ${adminState.sidebarOpen ? '' : 'closed'}" id="adminSidebar">
      <div class="admin-sidebar-header">
        <div class="admin-logo">
          <div style="width:26px;height:26px;border-radius:7px;background:linear-gradient(135deg,var(--pink),#6A00AA);display:flex;align-items:center;justify-content:center;font-size:.8rem">✦</div>
          <span>Cerdas<span style="color:var(--blue-light)">Plus</span></span>
          <span class="admin-logo-badge">ADMIN</span>
        </div>
        <button class="admin-sidebar-close" onclick="toggleAdminSidebar()">✕</button>
      </div>

      <nav class="admin-nav">
        <div class="admin-nav-label">Manajemen</div>
        <button class="admin-nav-link active" onclick="switchAdminTab('payments')">
          <span class="a-icon">💳</span>
          <span>Pembayaran</span>
          ${adminState.stats.pending > 0
            ? `<span class="a-count">${adminState.stats.pending}</span>`
            : ''}
        </button>
        <button class="admin-nav-link" onclick="switchAdminTab('users')">
          <span class="a-icon">👥</span>
          <span>Semua Siswa</span>
          <span class="a-count blue">${adminState.stats.total}</span>
        </button>
        <button class="admin-nav-link" onclick="openAddStudent()">
          <span class="a-icon">➕</span>
          <span>Daftar Siswa</span>
        </button>

        <div class="admin-nav-label" style="margin-top:12px">Akun</div>
        <button class="admin-nav-link" onclick="adminLogout()">
          <span class="a-icon">⏻</span>
          <span>Keluar</span>
        </button>
      </nav>

      <div class="admin-sidebar-footer">
        <div class="admin-user-row">
          <div class="admin-avatar">${init}</div>
          <div class="admin-user-info">
            <div class="admin-user-email">${email}</div>
            <div class="admin-user-role">● ADMIN</div>
          </div>
          <button class="admin-logout-btn" onclick="adminLogout()" title="Keluar">⏻</button>
        </div>
      </div>
    </aside>

    <!-- Main -->
    <div class="admin-main">
      <!-- Topbar -->
      <div class="admin-topbar">
        <div style="display:flex;align-items:center;gap:10px">
          <button class="topbar-ham" onclick="toggleAdminSidebar()">
            <span></span><span></span><span></span>
          </button>
          <div class="admin-topbar-title">
            💳 Manajemen Pembayaran
            ${adminState.stats.pending > 0
              ? `<span class="status-pill pending" style="font-size:.72rem">${adminState.stats.pending} menunggu</span>`
              : ''}
          </div>
        </div>
        <div class="topbar-right">
          <button class="btn btn-pink btn-sm" onclick="openAddStudent()">+ Daftar Siswa</button>
          <button class="btn btn-outline-blue btn-sm" onclick="loadPayments()">↻ Refresh</button>
        </div>
      </div>

      <!-- Content -->
      <div class="admin-view fade-in" id="adminContent">
        ${renderPaymentsView()}
      </div>
    </div>

    <!-- Detail Drawer -->
    <div class="drawer-backdrop" id="drawerBackdrop" onclick="closeDrawer()"></div>
    <div class="detail-drawer" id="detailDrawer">
      <div id="drawerInner"></div>
    </div>

    <!-- Add Student Modal -->
    <div class="modal-backdrop" id="addStudentModal" style="display:none">
      <div class="modal-box" style="max-width:500px;text-align:left">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:22px">
          <div>
            <div style="font-family:var(--ff-display);font-size:1.15rem;font-weight:800;margin-bottom:3px">➕ Daftar Siswa Manual</div>
            <div style="font-size:.825rem;color:var(--txt-2)">Admin mendaftarkan siswa — langsung terverifikasi</div>
          </div>
          <button class="drawer-close" onclick="closeAddStudent()">✕</button>
        </div>
        <form id="addStudentForm" onsubmit="handleAddStudent(event)" style="display:flex;flex-direction:column;gap:14px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Nama Lengkap Siswa</label>
              <input class="form-input" id="as_name" type="text" placeholder="Nama lengkap" required />
            </div>
            <div class="form-group" style="grid-column:1/-1">
              <label class="form-label">Email</label>
              <input class="form-input" id="as_email" type="email" placeholder="email@contoh.com" required />
            </div>
            <div class="form-group">
              <label class="form-label">No. WhatsApp</label>
              <input class="form-input" id="as_phone" type="tel" placeholder="08xxxxxxxxxx" />
            </div>
            <div class="form-group">
              <label class="form-label">Password Sementara</label>
              <div style="position:relative">
                <input class="form-input" id="as_pwd" type="text" placeholder="Min. 8 karakter" required minlength="8"
                  style="padding-right:80px" value="${generateTempPwd()}" />
                <button type="button" onclick="document.getElementById('as_pwd').value=generateTempPwd()"
                  style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px 8px;background:var(--bg-4);border:1px solid var(--border-1);border-radius:6px;font-size:.7rem;font-weight:700;color:var(--txt-1);cursor:pointer;font-family:var(--ff-display)">
                  ↺ Acak
                </button>
              </div>
              <div class="form-hint">Password ini dibagikan ke siswa untuk login pertama kali</div>
            </div>
            <div class="form-group">
              <label class="form-label">Jenjang</label>
              <select class="form-select" id="as_level" required onchange="updateAddGrade()">
                <option value="">Pilih</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kelas</label>
              <select class="form-select" id="as_grade" required>
                <option value="">Pilih kelas</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Paket</label>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div class="pkg-option selected-blue" id="asPkgMonthly" onclick="selectAddPkg('monthly')">
                <div class="opt-name">📚 Bulanan</div>
                <div class="opt-price">Rp 1.100.000/bln</div>
              </div>
              <div class="pkg-option" id="asPkgAnnual" onclick="selectAddPkg('annual')">
                <div class="opt-name">⭐ Tahunan</div>
                <div class="opt-price">Rp 17.000.000/thn</div>
              </div>
            </div>
            <input type="hidden" id="as_pkg" value="monthly" />
          </div>

          <div class="form-group">
            <label class="form-label">Nominal Pembayaran (Rp)</label>
            <input class="form-input" id="as_amount" type="number" value="1100000" required
              style="font-family:var(--ff-display);font-weight:700" />
            <div class="form-hint">Otomatis terisi sesuai paket — ubah jika ada diskon/custom</div>
          </div>

          <div style="padding:12px 14px;background:rgba(0,212,180,.07);border:1px solid rgba(0,212,180,.2);border-radius:var(--r-md);font-size:.8125rem;color:var(--teal)">
            ✓ Status pembayaran akan langsung disetel <strong>Terverifikasi</strong> — siswa langsung bisa akses dashboard
          </div>

          <div style="display:flex;gap:10px;margin-top:4px">
            <button type="submit" class="btn btn-blue" id="addStudentBtn" style="flex:1">
              ✓ Daftarkan Siswa
            </button>
            <button type="button" class="btn btn-ghost" onclick="closeAddStudent()">Batal</button>
          </div>
        </form>

        <!-- Success state (muncul setelah berhasil) -->
        <div id="addStudentSuccess" style="display:none;text-align:center;padding:16px 0">
          <div style="font-size:2.5rem;margin-bottom:14px">🎉</div>
          <div style="font-family:var(--ff-display);font-size:1.1rem;font-weight:800;margin-bottom:8px">Siswa Berhasil Didaftarkan!</div>
          <div style="color:var(--txt-1);font-size:.9rem;margin-bottom:20px">Bagikan info login ini ke siswa:</div>
          <div id="studentCredentials" style="background:var(--bg-3);border:1px solid var(--border-0);border-radius:var(--r-lg);padding:18px;text-align:left;margin-bottom:20px"></div>
          <button class="btn btn-blue btn-full" onclick="closeAddStudent();loadPayments()">Selesai</button>
        </div>
      </div>
    </div>
  `;
}

function renderDashContent() {
  const el = document.getElementById('adminContent');
  if (el) el.innerHTML = renderPaymentsView();
  // Update sidebar badge
  const sidebarEl = document.getElementById('adminSidebar');
  if (sidebarEl) {
    const badge = sidebarEl.querySelector('.a-count:not(.blue)');
    if (badge) badge.textContent = adminState.stats.pending;
  }
}

function switchAdminTab(tab) {
  adminState.dashTab    = tab;
  adminState.sidebarOpen = false;
  render();
  loadPayments();
}

function toggleAdminSidebar() {
  adminState.sidebarOpen = !adminState.sidebarOpen;
  document.getElementById('adminSidebar')?.classList.toggle('closed', !adminState.sidebarOpen);
  document.getElementById('adminOverlay')?.classList.toggle('show', adminState.sidebarOpen);
}

// ─────────────────────────────────────────────────────────
//  PAYMENTS VIEW
// ─────────────────────────────────────────────────────────
function renderPaymentsView() {
  const s = adminState.stats;

  // Filter & search
  let rows = adminState.payments;
  if (adminState.filter !== 'all') {
    rows = rows.filter(r => r.payment_status === adminState.filter);
  }
  if (adminState.search.trim()) {
    const q = adminState.search.toLowerCase();
    rows = rows.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.grade?.toLowerCase().includes(q) ||
      r.school_level?.toLowerCase().includes(q)
    );
  }

  return `
    <div class="admin-view-title">Manajemen Pembayaran</div>
    <div class="admin-view-sub">Verifikasi dan kelola status pembayaran siswa</div>

    <!-- Stats -->
    <div class="admin-stats">
      <div class="astat-card total">
        <div class="astat-icon">👥</div>
        <div class="astat-label">Total Pendaftar</div>
        <div class="astat-value blue">${s.total}</div>
        <div class="astat-sub">siswa terdaftar</div>
      </div>
      <div class="astat-card pending">
        <div class="astat-icon">⏳</div>
        <div class="astat-label">Menunggu</div>
        <div class="astat-value gold">${s.pending}</div>
        <div class="astat-sub">perlu diverifikasi</div>
      </div>
      <div class="astat-card verified">
        <div class="astat-icon">✅</div>
        <div class="astat-label">Terverifikasi</div>
        <div class="astat-value teal">${s.verified}</div>
        <div class="astat-sub">pembayaran sah</div>
      </div>
      <div class="astat-card rejected">
        <div class="astat-icon">❌</div>
        <div class="astat-label">Ditolak</div>
        <div class="astat-value red">${s.rejected}</div>
        <div class="astat-sub">pembayaran invalid</div>
      </div>
    </div>

    <!-- Toolbar -->
    <div class="admin-toolbar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="text" placeholder="Cari nama, kelas, jenjang..."
          value="${adminState.search}"
          oninput="handleSearch(this.value)"
          id="searchInput" />
      </div>
      <div class="filter-tabs">
        ${['all','pending','verified','rejected'].map(f => `
          <button class="filter-tab ${adminState.filter === f ? 'active ' + f : ''}"
            onclick="setFilter('${f}')">
            ${f === 'all' ? 'Semua' : f === 'pending' ? '⏳ Menunggu' : f === 'verified' ? '✅ Verified' : '❌ Ditolak'}
          </button>
        `).join('')}
      </div>
      <button class="refresh-btn" onclick="loadPayments()" id="refreshBtn">
        <span class="ref-icon">↻</span> Refresh
      </button>
    </div>

    <!-- Table -->
    <div class="table-wrap">
      ${adminState.loading
        ? `<div class="table-loading">
            <div class="loader-ring"></div>
            <span style="color:var(--txt-2);font-size:.875rem">Memuat data...</span>
           </div>`
        : rows.length === 0
          ? `<div class="table-empty">
              <div class="empty-icon">${adminState.filter === 'all' ? '📭' : '🔍'}</div>
              <div class="empty-title">${adminState.filter === 'pending' ? 'Tidak ada pembayaran menunggu' : 'Tidak ada data'}</div>
              <div class="empty-sub">${adminState.search ? 'Coba ubah kata kunci pencarian' : 'Data akan muncul saat siswa mendaftar'}</div>
             </div>`
          : `<table class="admin-table">
              <thead>
                <tr>
                  <th>Siswa</th>
                  <th>Jenjang</th>
                  <th>Paket</th>
                  <th>Nominal</th>
                  <th>Daftar</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                ${rows.map(r => renderPaymentRow(r)).join('')}
              </tbody>
            </table>`
      }
    </div>
  `;
}

function renderPaymentRow(r) {
  const color = avatarColor(r.full_name);
  const init  = initials(r.full_name);
  const isPending  = r.payment_status === 'pending';
  const isVerified = r.payment_status === 'verified';
  const isRejected = r.payment_status === 'rejected';

  return `
    <tr>
      <td data-label="Siswa">
        <div style="display:flex;align-items:center;gap:10px">
          <div class="row-avatar" style="background:${color}22;color:${color}">${init}</div>
          <div>
            <div class="row-name">${r.full_name || '—'}</div>
          </div>
        </div>
      </td>
      <td data-label="Jenjang">
        <span style="font-family:var(--ff-display);font-weight:700;font-size:.875rem">
          ${r.school_level || '—'} ${r.grade ? '· ' + r.grade : ''}
        </span>
      </td>
      <td data-label="Paket">
        <span class="pkg-badge ${r.package_type || 'monthly'}">
          ${r.package_type === 'annual' ? '⭐' : '📚'}
          ${PKG_LABELS[r.package_type] || '—'}
        </span>
      </td>
      <td data-label="Nominal" class="amount-cell">${fmt(r.payment_amount)}</td>
      <td data-label="Tanggal" style="color:var(--txt-2);font-size:.8125rem">${fmtDate(r.created_at)}</td>
      <td data-label="Status">
        <span class="status-pill ${r.payment_status || 'pending'}">
          ${isVerified ? '✓ Terverifikasi' : isPending ? '⏳ Menunggu' : '✕ Ditolak'}
        </span>
      </td>
      <td data-label="Aksi">
        <div class="action-cell">
          <!-- Detail -->
          <button class="act-btn reset" onclick="openDrawer(${JSON.stringify(r).replace(/"/g,'&quot;')})">
            👁 Detail
          </button>
          <!-- Verify -->
          ${!isVerified
            ? `<button class="act-btn verify" onclick="confirmVerify('${r.id}','${r.full_name}')">
                ✓ Verifikasi
               </button>`
            : ''
          }
          <!-- Reject -->
          ${!isRejected
            ? `<button class="act-btn reject" onclick="confirmReject('${r.id}','${r.full_name}')">
                ✕ Tolak
               </button>`
            : ''
          }
        </div>
      </td>
    </tr>
  `;
}

// ─────────────────────────────────────────────────────────
//  CONFIRM ACTIONS
// ─────────────────────────────────────────────────────────
function confirmVerify(userId, name) {
  openModal({
    icon:         '✅',
    title:        'Verifikasi Pembayaran',
    body:         `Verifikasi pembayaran untuk ${name}? Siswa akan langsung mendapat akses dashboard.`,
    confirmLabel: 'Ya, Verifikasi',
    confirmClass: 'btn-blue',
    onConfirm:    () => doUpdateStatus(userId, 'verified', name),
  });
}

function confirmReject(userId, name) {
  openModal({
    icon:         '❌',
    title:        'Tolak Pembayaran',
    body:         `Tolak pembayaran ${name}? Siswa tidak akan mendapat akses. Aksi ini dapat dibatalkan nanti.`,
    confirmLabel: 'Ya, Tolak',
    confirmClass: 'btn btn-ghost" style="border-color:rgba(255,96,96,.4);color:#FF6060',
    onConfirm:    () => doUpdateStatus(userId, 'rejected', name),
  });
}

async function doUpdateStatus(userId, status, name) {
  try {
    await updateStatus(userId, status);
    const label = status === 'verified' ? 'diverifikasi ✓' : 'ditolak';
    toast(`Pembayaran ${name} berhasil ${label}`, status === 'verified' ? 'success' : 'info');
    renderDashContent();
    // Jika drawer sedang terbuka untuk user ini, refresh drawer
    if (adminState.drawerUser?.id === userId) {
      adminState.drawerUser.payment_status = status;
      renderDrawer();
    }
  } catch (err) {
    toast('Gagal update status: ' + err.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────
//  DETAIL DRAWER
// ─────────────────────────────────────────────────────────
function renderDrawer() {
  const r = adminState.drawerUser;
  if (!r) return;
  const color = avatarColor(r.full_name);
  const init  = initials(r.full_name);
  const isVerified = r.payment_status === 'verified';
  const isRejected = r.payment_status === 'rejected';
  const isPending  = r.payment_status === 'pending';

  document.getElementById('drawerInner').innerHTML = `
    <div class="drawer-header">
      <div class="drawer-title">Detail Pendaftar</div>
      <button class="drawer-close" onclick="closeDrawer()">✕</button>
    </div>

    <div class="drawer-body">
      <!-- Avatar row -->
      <div class="drawer-avatar-row">
        <div class="drawer-avatar" style="background:${color}22;color:${color}">${init}</div>
        <div>
          <div class="d-name">${r.full_name || '—'}</div>
          <div style="margin-top:6px">
            <span class="status-pill ${r.payment_status || 'pending'}">
              ${isVerified ? '✓ Terverifikasi' : isPending ? '⏳ Menunggu' : '✕ Ditolak'}
            </span>
          </div>
        </div>
      </div>

      <!-- Info pribadi -->
      <div class="drawer-section">
        <div class="drawer-section-title">Data Diri</div>
        ${[
          { k:'Jenjang', v: `${r.school_level || '—'} — ${r.grade || ''}` },
          { k:'No. WhatsApp', v: r.phone || '—' },
          { k:'Bergabung', v: fmtDate(r.created_at) },
        ].map(row => `
          <div class="drawer-row">
            <span class="dk">${row.k}</span>
            <span class="dv">${row.v}</span>
          </div>
        `).join('')}
      </div>

      <!-- Info pembayaran -->
      <div class="drawer-section">
        <div class="drawer-section-title">Info Pembayaran</div>
        ${[
          { k:'Paket', v: PKG_LABELS[r.package_type] || '—' },
          { k:'Nominal Transfer', v: fmt(r.payment_amount) },
          { k:'Nominal Seharusnya', v: r.package_type === 'annual' ? 'Rp 17.000.000' : 'Rp 1.100.000' },
          { k:'Status', v: isVerified ? '✓ Terverifikasi' : isPending ? '⏳ Menunggu' : '✕ Ditolak' },
        ].map(row => `
          <div class="drawer-row">
            <span class="dk">${row.k}</span>
            <span class="dv">${row.v}</span>
          </div>
        `).join('')}
      </div>

      <!-- Cek selisih nominal -->
      ${(() => {
        const expected = r.package_type === 'annual' ? 17000000 : 1100000;
        const diff = (r.payment_amount || 0) - expected;
        if (!r.payment_amount) return '';
        if (diff === 0) return `
          <div style="padding:12px 14px;background:rgba(0,212,180,.07);border:1px solid rgba(0,212,180,.2);border-radius:var(--r-md);font-size:.8125rem;color:var(--teal)">
            ✓ Nominal transfer sesuai dengan harga paket
          </div>`;
        return `
          <div style="padding:12px 14px;background:rgba(255,184,48,.07);border:1px solid rgba(255,184,48,.2);border-radius:var(--r-md);font-size:.8125rem;color:var(--gold)">
            ⚠️ Selisih nominal: ${diff > 0 ? '+' : ''}${fmt(diff)} dari harga paket
          </div>`;
      })()}
    </div>

    <!-- Action buttons -->
    <div class="drawer-actions">
      ${!isVerified
        ? `<button class="btn btn-blue" onclick="confirmVerify('${r.id}','${r.full_name}')">
            ✓ Verifikasi Pembayaran
           </button>`
        : `<div style="text-align:center;color:var(--teal);font-family:var(--ff-display);font-weight:700;font-size:.875rem;padding:4px">
             ✓ Sudah Terverifikasi
           </div>`
      }
      ${!isRejected
        ? `<button class="btn btn-ghost" style="border-color:rgba(255,96,96,.3);color:#FF6060"
            onclick="confirmReject('${r.id}','${r.full_name}')">
            ✕ Tolak Pembayaran
           </button>`
        : `<button class="btn btn-ghost" onclick="confirmVerify('${r.id}','${r.full_name}')">
            ↺ Kembalikan ke Verified
           </button>`
      }
      <button class="btn btn-ghost" onclick="closeDrawer()">Tutup</button>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────
//  FILTER & SEARCH
// ─────────────────────────────────────────────────────────
function setFilter(f) {
  adminState.filter = f;
  renderDashContent();
}

let searchTimer;
function handleSearch(val) {
  adminState.search = val;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderDashContent, 180);
}

// ---------------------------------------------------------
//  ADD STUDENT (Daftar Siswa Manual oleh Admin)
// ---------------------------------------------------------

function generateTempPwd() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#';
  return Array.from({length: 10}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function openAddStudent() {
  adminState.addStudentOpen = true;
  adminState.sidebarOpen    = false;
  const modal = document.getElementById('addStudentModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('addStudentForm').style.display    = '';
    document.getElementById('addStudentSuccess').style.display = 'none';
    document.getElementById('addStudentForm').reset();
    document.getElementById('as_pwd').value    = generateTempPwd();
    document.getElementById('as_pkg').value    = 'monthly';
    document.getElementById('as_amount').value = '1100000';
    document.getElementById('asPkgMonthly').className = 'pkg-option selected-blue';
    document.getElementById('asPkgAnnual').className  = 'pkg-option';
    const overlay = document.getElementById('adminOverlay');
    if (overlay) overlay.classList.remove('show');
    const sidebar = document.getElementById('adminSidebar');
    if (sidebar) sidebar.classList.add('closed');
  } else {
    render();
    setTimeout(openAddStudent, 100);
  }
}

function closeAddStudent() {
  const modal = document.getElementById('addStudentModal');
  if (modal) modal.style.display = 'none';
  adminState.addStudentOpen = false;
}

function selectAddPkg(pkg) {
  document.getElementById('as_pkg').value = pkg;
  document.getElementById('asPkgMonthly').className = 'pkg-option' + (pkg === 'monthly' ? ' selected-blue' : '');
  document.getElementById('asPkgAnnual').className  = 'pkg-option' + (pkg === 'annual'  ? ' selected-pink' : '');
  document.getElementById('as_amount').value = pkg === 'annual' ? '17000000' : '1100000';
}

function updateAddGrade() {
  const level = document.getElementById('as_level').value;
  const el    = document.getElementById('as_grade');
  const maps  = {
    SD:  ['Kelas 1','Kelas 2','Kelas 3','Kelas 4','Kelas 5','Kelas 6'],
    SMP: ['Kelas 7','Kelas 8','Kelas 9'],
    SMA: ['Kelas 10','Kelas 11','Kelas 12'],
  };
  el.innerHTML = '<option value="">Pilih kelas</option>';
  (maps[level] || []).forEach(g => {
    const o = document.createElement('option');
    o.value = g; o.textContent = g;
    el.appendChild(o);
  });
}

async function handleAddStudent(e) {
  e.preventDefault();
  const btn      = document.getElementById('addStudentBtn');
  btn.disabled   = true; btn.textContent = 'Mendaftarkan...';

  const email    = document.getElementById('as_email').value.trim().toLowerCase();
  const password = document.getElementById('as_pwd').value.trim();
  const name     = document.getElementById('as_name').value.trim();
  const phone    = document.getElementById('as_phone').value.trim();
  const level    = document.getElementById('as_level').value;
  const grade    = document.getElementById('as_grade').value;
  const pkg      = document.getElementById('as_pkg').value;
  const amount   = parseInt(document.getElementById('as_amount').value, 10);

  try {
    // Step 1: Buat auth user via supabaseStudentClient (session terpisah)
    const { data: signUpData, error: signUpErr } = await supabaseStudentClient.auth.signUp({ email, password });

    if (signUpErr) {
      const msg = signUpErr.message.toLowerCase();

      // Rate limit — terlalu banyak percobaan email yang sama
      if (msg.includes('rate limit') || msg.includes('over_email_send_rate_limit') || msg.includes('too many')) {
        showRateLimitWarning(email);
        btn.disabled = false; btn.textContent = '&#10003; Daftarkan Siswa';
        return;
      }
      // Email sudah terdaftar
      if (msg.includes('already registered') || msg.includes('already in use')) {
        throw new Error('Email \u201c' + email + '\u201d sudah terdaftar. Gunakan email lain atau cari siswa ini di tabel.');
      }
      throw signUpErr;
    }

    // signUp berhasil tapi user null = email confirmation masih aktif di Supabase
    if (!signUpData.user) {
      showEmailConfirmWarning(email);
      btn.disabled = false; btn.textContent = '&#10003; Daftarkan Siswa';
      return;
    }

    const studentId = signUpData.user.id;

    // Step 2: Sign out client kedua segera
    await supabaseStudentClient.auth.signOut();

    // Step 3: Insert profile via session admin
    const { error: insertErr } = await supabaseClient.from('profiles').insert({
      id:             studentId,
      full_name:      name,
      phone:          phone,
      school_level:   level,
      grade:          grade,
      package_type:   pkg,
      payment_amount: amount,
      payment_status: 'verified',
      registered_by:  'admin',
    });
    if (insertErr) throw insertErr;

    // Step 4: Tampilkan info login ke admin
    document.getElementById('addStudentForm').style.display    = 'none';
    document.getElementById('addStudentSuccess').style.display = 'block';
    const credHtml = [
      { k: 'Nama',     v: name },
      { k: 'Email',    v: email },
      { k: 'Password', v: `<code style="background:var(--bg-4);padding:2px 8px;border-radius:6px;color:var(--blue-light)">${password}</code>` },
      { k: 'Paket',    v: pkg === 'annual' ? '&#9733; Tahunan' : '&#128218; Bulanan' },
      { k: 'Status',   v: '<span style="color:var(--teal);font-weight:700">&#10003; Terverifikasi</span>' },
    ].map(r => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-0)">
        <span style="color:var(--txt-2)">${r.k}</span>
        <span style="font-family:var(--ff-display);font-weight:700">${r.v}</span>
      </div>
    `).join('');
    document.getElementById('studentCredentials').innerHTML = `
      <div style="display:flex;flex-direction:column;gap:0">${credHtml}</div>
      <button onclick="copyCredentials('Email: ${email}\\nPassword: ${password}\\nPaket: ${pkg === 'annual' ? 'Tahunan' : 'Bulanan'}')"
        class="btn btn-outline-blue btn-sm btn-full" style="margin-top:14px">
        &#128203; Salin Info Login
      </button>
    `;
    toast(`Siswa ${name} berhasil didaftarkan!`, 'success');

  } catch (err) {
    toast(err.message || 'Gagal mendaftarkan siswa.', 'error');
    btn.disabled = false; btn.textContent = '&#10003; Daftarkan Siswa';
  }
}
function copyCredentials(text) {
  navigator.clipboard.writeText(text)
    .then(() => toast('Info login disalin!', 'success'))
    .catch(() => toast('Gagal menyalin.', 'error'));
}
// ── Warning helpers untuk error pendaftaran ───────────────

function showRateLimitWarning(email) {
  const form = document.getElementById('addStudentForm');
  // Hapus banner lama kalau ada
  document.getElementById('rateLimitBanner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'rateLimitBanner';
  banner.style.cssText = `
    background: rgba(255,184,48,.08);
    border: 1px solid rgba(255,184,48,.35);
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 16px;
    font-size: .875rem;
    line-height: 1.65;
    color: var(--gold);
  `;
  banner.innerHTML = `
    <div style="font-family:var(--ff-display);font-weight:800;font-size:.95rem;margin-bottom:8px">
      ⚠️ Email Rate Limit Supabase
    </div>
    <div style="color:var(--txt-1);margin-bottom:12px">
      Terlalu banyak percobaan pendaftaran untuk email <strong>${email}</strong>.
      Supabase memblokir pengiriman email sementara (~1 jam).
    </div>
    <div style="font-family:var(--ff-display);font-weight:700;color:var(--teal);margin-bottom:6px">
      ✓ Solusi Permanen (1 menit):
    </div>
    <ol style="margin-left:18px;color:var(--txt-1);display:flex;flex-direction:column;gap:4px">
      <li>Buka <strong>Supabase Dashboard</strong></li>
      <li>Klik <strong>Authentication → Providers → Email</strong></li>
      <li>Toggle <strong>OFF</strong> opsi <em>"Confirm email"</em></li>
      <li>Klik <strong>Save</strong></li>
      <li>Kembali ke sini dan coba lagi dengan email baru</li>
    </ol>
    <div style="margin-top:10px;padding:10px 12px;background:rgba(255,255,255,.04);border-radius:8px;font-size:.8rem;color:var(--txt-2)">
      💡 Setelah dimatikan, pendaftaran tidak akan kirim email sama sekali — tidak ada lagi rate limit.
    </div>
  `;
  form.insertBefore(banner, form.firstChild);
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Toast juga
  toast('Rate limit! Matikan "Confirm email" di Supabase Auth Settings.', 'error', 6000);
}

function showEmailConfirmWarning(email) {
  const form = document.getElementById('addStudentForm');
  document.getElementById('rateLimitBanner')?.remove();

  const banner = document.createElement('div');
  banner.id = 'rateLimitBanner';
  banner.style.cssText = `
    background: rgba(47,111,237,.08);
    border: 1px solid rgba(47,111,237,.3);
    border-radius: 12px;
    padding: 16px 18px;
    margin-bottom: 16px;
    font-size: .875rem;
    line-height: 1.65;
  `;
  banner.innerHTML = `
    <div style="font-family:var(--ff-display);font-weight:800;font-size:.95rem;margin-bottom:8px;color:var(--blue-light)">
      📧 Email Confirmation Masih Aktif
    </div>
    <div style="color:var(--txt-1);margin-bottom:12px">
      Akun untuk <strong>${email}</strong> sudah dibuat di Supabase Auth,
      tapi menunggu konfirmasi email. Siswa tidak bisa login sampai link diklik.
    </div>
    <div style="font-family:var(--ff-display);font-weight:700;color:var(--teal);margin-bottom:6px">
      ✓ Cara Fix:
    </div>
    <ol style="margin-left:18px;color:var(--txt-1);display:flex;flex-direction:column;gap:4px">
      <li>Buka <strong>Supabase → Authentication → Providers → Email</strong></li>
      <li>Toggle <strong>OFF</strong> opsi <em>"Confirm email"</em> → Save</li>
      <li>Hapus user <strong>${email}</strong> di <strong>Authentication → Users</strong></li>
      <li>Kembali ke sini dan daftarkan ulang</li>
    </ol>
  `;
  form.insertBefore(banner, form.firstChild);
  banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  toast('Aktifkan dulu: matikan Confirm Email di Supabase.', 'info', 6000);
}


// ─────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────
async function adminInit() {
  const loader = document.getElementById('globalLoader');
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      // Cek apakah admin
      const { data: adminRow } = await supabaseClient
        .from('admins')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (adminRow) {
        adminState.admin = session.user;
        adminState.view  = 'dashboard';
        render();
        await loadPayments();
      } else {
        await supabaseClient.auth.signOut();
        render();
      }
    } else {
      render();
    }
  } catch (err) {
    console.error('Admin init error:', err);
    render();
  } finally {
    loader?.classList.add('hidden');
  }
}

adminInit();

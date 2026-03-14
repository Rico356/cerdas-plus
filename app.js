/* =========================================================
   CerdasPlus – Main Application (SPA)
   ========================================================= */

// ── State ─────────────────────────────────────────────────
const state = {
  user:    null,
  profile: null,
  view:    'landing',       // landing | login | register | payment | waiting | dashboard
  dashTab: 'overview',      // overview | jadwal | materi | pembayaran | profil
  pkgTab:  'monthly',       // monthly | annual
  selectedPkg: null,        // 'monthly' | 'annual'
  mobileMenuOpen: false,
  sidebarOpen:    false,
};

// ── Packages config ────────────────────────────────────────
const PACKAGES = {
  monthly: {
    id:       'monthly',
    name:     'Fokus Bulanan',
    tier:     'STANDAR',
    price:    1100000,
    period:   '/bulan',
    estimate: 'Estimasi Rp 91.667 /pertemuan',
    icon:     '📚',
    color:    'blue',
    features: [
      { text: '12x Sesi Belajar per bulan',   ok: true },
      { text: 'Modul & Video Premium',          ok: true },
      { text: 'Support Chat (Jam Kerja)',        ok: true },
      { text: 'Akses Semua Mata Pelajaran',      ok: true },
      { text: 'Try Out Bulanan',                 ok: true },
      { text: 'Sesi 1-on-1 Eksklusif',          ok: false },
    ],
  },
  annual: {
    id:       'annual',
    name:     'Fokus Tahunan',
    tier:     'EKSKLUSIF',
    price:    17000000,
    period:   '/tahun',
    estimate: 'Estimasi Rp 1.416.667 /bulan — Hemat 2 Bulan!',
    icon:     '⭐',
    color:    'pink',
    popular:  true,
    features: [
      { text: 'Unlimited Sesi Belajar',              ok: true },
      { text: 'Modul & Video Premium',               ok: true },
      { text: 'Priority Support 24/7',               ok: true },
      { text: 'Akses Semua Mata Pelajaran',           ok: true },
      { text: 'Sesi 1-on-1 Eksklusif (4x/bulan)',   ok: true },
      { text: 'Sertifikat & Try Out Intensif',       ok: true },
    ],
  },
};

// ── Format helpers ─────────────────────────────────────────
const fmt = n => 'Rp ' + n.toLocaleString('id-ID');

// ── Toast ──────────────────────────────────────────────────
function toast(msg, type = 'info', dur = 3500) {
  const icons = { success: '✓', error: '✕', info: 'ℹ' };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.classList.add('fade-out');
    setTimeout(() => el.remove(), 300);
  }, dur);
}

// ── Router ─────────────────────────────────────────────────
function navigate(view, opts = {}) {
  state.view = view;
  if (opts.pkg) state.selectedPkg = opts.pkg;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Auth ───────────────────────────────────────────────────
async function doLogin(email, password) {
  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  state.user = data.user;
  await loadProfile();
}

async function doRegister(formData) {
  const { data, error } = await supabaseClient.auth.signUp({
    email: formData.email,
    password: formData.password,
  });
  if (error) throw error;
  state.user = data.user;

  // Insert profile
  const { error: pErr } = await supabaseClient.from('profiles').insert({
    id:           data.user.id,
    full_name:    formData.full_name,
    phone:        formData.phone,
    school_level: formData.school_level,
    grade:        formData.grade,
    package_type: formData.package_type,
    payment_status: 'pending',
  });
  if (pErr) throw pErr;
  await loadProfile();
}

async function doLogout() {
  await supabaseClient.auth.signOut();
  state.user    = null;
  state.profile = null;
  navigate('landing');
}

async function loadProfile() {
  if (!state.user) return;
  const { data } = await supabaseClient.from('profiles').select('*').eq('id', state.user.id).single();
  state.profile = data;
}

async function submitPayment(amount) {
  const { error } = await supabaseClient.from('profiles').update({
    payment_amount: amount,
    payment_status: 'pending',
  }).eq('id', state.user.id);
  if (error) throw error;
  state.profile.payment_amount = amount;
  state.profile.payment_status = 'pending';
}

async function updateProfile(fields) {
  const { error } = await supabaseClient.from('profiles').update(fields).eq('id', state.user.id);
  if (error) throw error;
  Object.assign(state.profile, fields);
}

// ── Routing decision after auth ────────────────────────────
function routeAfterAuth() {
  if (!state.user) { navigate('landing'); return; }
  const p = state.profile;
  if (!p) { navigate('payment'); return; }
  if (!p.payment_amount) { navigate('payment'); return; }
  if (p.payment_status === 'verified') { navigate('dashboard'); return; }
  navigate('waiting');
}

// ── Render dispatcher ──────────────────────────────────────
function render() {
  const app = document.getElementById('app');
  const views = {
    landing:  renderLanding,
    login:    renderLogin,
    register: renderRegister,
    payment:  renderPayment,
    waiting:  renderWaiting,
    dashboard: renderDashboard,
  };
  app.innerHTML = '';
  const fn = views[state.view];
  if (fn) fn(app);
}

// ─────────────────────────────────────────────────────────
//  LANDING PAGE
// ─────────────────────────────────────────────────────────
function renderLanding(container) {
  container.innerHTML = `
    <div class="noise-overlay"></div>
    ${renderNavbar(false)}
    <div class="mobile-menu" id="mobileMenu">
      <button class="nav-link" onclick="smoothScroll('packages')">Paket</button>
      <button class="nav-link" onclick="smoothScroll('schools')">Jenjang</button>
      <button class="nav-link" onclick="smoothScroll('testimonials')">Testimoni</button>
      <button class="nav-link" onclick="navigate('login')" style="color:var(--blue-light)">Masuk</button>
    </div>
    <main class="landing-page">
      <!-- Hero -->
      <section class="hero">
        <div class="hero-bg"></div>
        <div class="hero-grid"></div>
        <div class="hero-orb-1"></div>
        <div class="hero-orb-2"></div>
        <div class="hero-content fade-in">
          <div class="hero-badge"><span class="dot"></span> Dipercaya 10.000+ Siswa Indonesia</div>
          <h1>Belajar Lebih<br><span class="grad-mixed">Cerdas</span> &amp;<br>Menyenangkan</h1>
          <p class="hero-sub">Platform bimbingan belajar terpercaya untuk siswa SD, SMP, dan SMA. Dengan tutor berpengalaman dan metode belajar inovatif.</p>
          <div class="hero-cta">
            <button class="btn btn-blue btn-lg" onclick="smoothScroll('packages')">Lihat Paket Belajar</button>
            <button class="btn btn-ghost btn-lg" onclick="navigate('register')">Daftar Gratis &rarr;</button>
          </div>
          <div class="hero-stats">
            <div class="stat-item"><div class="stat-num grad-blue">10K+</div><div class="stat-label">Siswa Aktif</div></div>
            <div class="stat-item"><div class="stat-num grad-blue">500+</div><div class="stat-label">Tutor Berpengalaman</div></div>
            <div class="stat-item"><div class="stat-num grad-blue">98%</div><div class="stat-label">Tingkat Kepuasan</div></div>
            <div class="stat-item"><div class="stat-num grad-blue">3</div><div class="stat-label">Jenjang Pendidikan</div></div>
          </div>
        </div>
      </section>

      <!-- Packages -->
      <section class="packages-section" id="packages">
        <div class="section-header fade-in">
          <div class="section-eyebrow">✦ Pilih Paket Belajar</div>
          <h2>Investasi Terbaik<br>untuk <span class="grad-pink">Masa Depanmu</span></h2>
          <p>Dapatkan bimbingan intensif sesuai kebutuhan belajarmu di CerdasPlus</p>
        </div>

        <div class="pkg-tabs fade-in">
          <button class="pkg-tab ${state.pkgTab === 'monthly' ? 'active' : ''}" onclick="setPkgTab('monthly')">Paket Bulanan</button>
          <button class="pkg-tab ${state.pkgTab === 'annual' ? 'active' : ''}" onclick="setPkgTab('annual')">Paket Tahunan <span class="save-badge">HEMAT</span></button>
        </div>

        <div class="pkg-grid fade-in">
          ${renderPkgCard(PACKAGES.monthly, state.pkgTab)}
          ${renderPkgCard(PACKAGES.annual, state.pkgTab)}
        </div>
      </section>

      <!-- Jenjang -->
      <section class="schools-section" id="schools">
        <div class="section-header fade-in">
          <div class="section-eyebrow">✦ Jenjang Pendidikan</div>
          <h2>Semua Jenjang<br><span class="grad-blue">Kami Layani</span></h2>
        </div>
        <div class="schools-grid">
          <div class="school-card fade-in">
            <div class="school-emoji">🎒</div>
            <div class="school-name">SD</div>
            <div class="school-desc">Kelas 1–6. Fondasi kuat untuk masa depan cerah.</div>
          </div>
          <div class="school-card fade-in">
            <div class="school-emoji">📐</div>
            <div class="school-name">SMP</div>
            <div class="school-desc">Kelas 7–9. Persiapan matang menuju SMA unggulan.</div>
          </div>
          <div class="school-card fade-in">
            <div class="school-emoji">🎓</div>
            <div class="school-name">SMA/SMK</div>
            <div class="school-desc">Kelas 10–12. Raih PTN impian dengan bimbingan intensif.</div>
          </div>
        </div>
      </section>

      <!-- Testimonials -->
      <section class="testimonials-section" id="testimonials">
        <div class="section-header fade-in">
          <div class="section-eyebrow">✦ Testimoni Siswa</div>
          <h2>Cerita <span class="grad-mixed">Sukses</span> Mereka</h2>
        </div>
        <div class="testi-grid">
          ${[
            { name:'Rafi A.',  school:'SMA 3 Jakarta',    avatar:'RA', color:'#2F6FED', stars:5, q:'Nilainya naik drastis dari 60 ke 92 setelah 2 bulan di CerdasPlus. Tutor-nya sabar banget ngajarin.' },
            { name:'Sari D.',  school:'SMP 7 Bandung',    avatar:'SD', color:'#C930F0', stars:5, q:'Materinya mudah dipahami, jadwal fleksibel. Aku jadi lebih semangat belajar dan nilai UN naik!' },
            { name:'Kevin T.', school:'SD 5 Surabaya',    avatar:'KT', color:'#00D4B4', stars:5, q:'Anakku jadi lebih percaya diri di sekolah. Tutor CerdasPlus bisa jelasin dengan cara yang seru.' },
            { name:'Mila F.',  school:'SMA 1 Yogyakarta', avatar:'MF', color:'#FF8C00', stars:5, q:'Lolos SNBP berkat try-out dan konsultasi intensif. Recommend banget buat yang mau masuk PTN!' },
            { name:'Dion P.',  school:'SMP 12 Medan',     avatar:'DP', color:'#E040FB', stars:4, q:'Pelayanan cepat, materi lengkap, dan harga terjangkau. Paket tahunan worth it banget!' },
            { name:'Nina R.',  school:'SMA 2 Makassar',   avatar:'NR', color:'#4CAF50', stars:5, q:'Sesi 1-on-1 eksklusifnya beda banget, lebih fokus ke kelemahan kita. Sangat membantu!' },
          ].map(t => `
            <div class="testi-card fade-in">
              <div class="testi-stars">${'★'.repeat(t.stars)}</div>
              <p class="testi-quote">"${t.q}"</p>
              <div class="testi-author">
                <div class="testi-avatar" style="background:${t.color}22;color:${t.color}">${t.avatar}</div>
                <div class="testi-info">
                  <div class="name">${t.name}</div>
                  <div class="school">${t.school}</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <!-- Footer -->
      <footer class="footer">
        <div class="footer-logo"><span class="grad-mixed">Cerdas</span><span>Plus</span></div>
        <div class="footer-text">© 2025 CerdasPlus. Hak Cipta Dilindungi.<br>Dipercaya oleh lebih dari 10.000+ Siswa di Indonesia</div>
      </footer>
    </main>
  `;
  initNavbarEvents();
}

function renderPkgCard(pkg, activeTab) {
  const show = (activeTab === 'monthly' && pkg.id === 'monthly') ||
               (activeTab === 'annual'  && pkg.id === 'annual');
  const cls = pkg.color === 'pink' ? 'featured' : 'standard';
  const tierCls = pkg.color;
  const checkCls = pkg.color === 'pink' ? 'check-pink' : 'check';

  return `
    <div class="pkg-card ${cls} fade-in" style="${!show && activeTab !== 'both' ? '' : ''}">
      ${pkg.popular ? '<div class="popular-badge">★ POPULER</div>' : ''}
      <div class="pkg-icon ${pkg.color}">${pkg.icon}</div>
      <div class="pkg-tier ${tierCls}">${pkg.tier}</div>
      <div class="pkg-name">${pkg.name}</div>
      <div class="pkg-price-block">
        <span class="pkg-price ${pkg.color === 'pink' ? 'grad-pink' : 'grad-blue'}">${fmt(pkg.price)}</span>
        <span class="pkg-period">${pkg.period}</span>
      </div>
      <div class="pkg-estimate">${pkg.estimate}</div>
      <hr class="pkg-divider" />
      <ul class="pkg-features">
        ${pkg.features.map(f => `
          <li class="pkg-feature ${f.ok ? '' : 'disabled'}">
            <span class="feat-icon ${f.ok ? checkCls : 'cross'}">${f.ok ? '✓' : '✕'}</span>
            <span>${f.ok ? f.text : '<s>' + f.text + '</s>'}</span>
          </li>
        `).join('')}
      </ul>
      <div class="pkg-cta">
        <button class="btn btn-full btn-lg ${pkg.color === 'pink' ? 'btn-pink' : 'btn-blue'}"
          onclick="selectPackage('${pkg.id}')">
          Pilih Paket Ini
        </button>
      </div>
    </div>
  `;
}

function setPkgTab(tab) {
  state.pkgTab = tab;
  render();
  // smooth scroll packages into view
  setTimeout(() => smoothScroll('packages'), 50);
}

function selectPackage(pkgId) {
  state.selectedPkg = pkgId;
  if (state.user) {
    navigate('payment');
  } else {
    navigate('register');
  }
}

// ─────────────────────────────────────────────────────────
//  NAVBAR
// ─────────────────────────────────────────────────────────
function renderNavbar(isDashboard = false) {
  return `
    <nav class="navbar" id="navbar">
      <a class="navbar-logo" href="#" onclick="navigate('landing');return false;">
        <div class="logo-icon">✦</div>
        <span>Cerdas<span class="logo-plus">Plus</span></span>
      </a>
      ${!isDashboard ? `
        <div class="navbar-nav">
          <button class="nav-link" onclick="smoothScroll('packages')">Paket</button>
          <button class="nav-link" onclick="smoothScroll('schools')">Jenjang</button>
          <button class="nav-link" onclick="smoothScroll('testimonials')">Testimoni</button>
        </div>
      ` : ''}
      <div class="navbar-actions">
        ${state.user
          ? `<button class="btn btn-ghost btn-sm" onclick="doLogout()">Keluar</button>`
          : `<button class="btn btn-ghost btn-sm" onclick="navigate('login')">Masuk</button>
             <button class="btn btn-blue btn-sm" onclick="navigate('register')">Daftar</button>`
        }
        ${!isDashboard ? `
          <button class="hamburger" id="hamburger" onclick="toggleMobileMenu()">
            <span></span><span></span><span></span>
          </button>
        ` : ''}
      </div>
    </nav>
  `;
}

function initNavbarEvents() {
  // Navbar scroll effect
  const navbar = document.getElementById('navbar');
  if (navbar) {
    window.onscroll = () => {
      navbar.style.background = window.scrollY > 60
        ? 'rgba(7,10,24,.98)'
        : 'rgba(7,10,24,.85)';
    };
  }
}

function toggleMobileMenu() {
  state.mobileMenuOpen = !state.mobileMenuOpen;
  document.getElementById('mobileMenu')?.classList.toggle('open', state.mobileMenuOpen);
}

function smoothScroll(id) {
  state.mobileMenuOpen = false;
  document.getElementById('mobileMenu')?.classList.remove('open');
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─────────────────────────────────────────────────────────
//  LOGIN PAGE
// ─────────────────────────────────────────────────────────
function renderLogin(container) {
  container.innerHTML = `
    <div class="auth-bg"></div>
    ${renderNavbar(false)}
    <div class="auth-page">
      <div class="auth-card fade-in">
        <div class="auth-header">
          <a class="auth-logo-link" href="#" onclick="navigate('landing');return false;">
            <div class="logo-icon" style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--pink));display:flex;align-items:center;justify-content:center">✦</div>
            <span>Cerdas<span style="color:var(--blue-light)">Plus</span></span>
          </a>
          <h2>Selamat Datang<br>Kembali 👋</h2>
          <p>Masuk ke akun CerdasPlus kamu</p>
        </div>
        <form class="auth-form" id="loginForm" onsubmit="handleLogin(event)">
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="loginEmail" placeholder="contoh@email.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" id="loginPwd" placeholder="Masukkan password" required autocomplete="current-password" />
          </div>
          <button type="submit" class="btn btn-blue btn-full btn-lg" id="loginBtn">Masuk</button>
        </form>
        <div class="auth-footer">
          Belum punya akun?
          <button class="auth-link" onclick="navigate('register')">Daftar Sekarang</button>
        </div>
      </div>
    </div>
  `;
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById('loginBtn');
  const email = document.getElementById('loginEmail').value.trim();
  const pwd   = document.getElementById('loginPwd').value;
  btn.disabled = true; btn.textContent = 'Memproses...';
  try {
    await doLogin(email, pwd);
    toast('Berhasil masuk!', 'success');
    routeAfterAuth();
  } catch (err) {
    toast(err.message || 'Login gagal. Cek kembali email & password.', 'error');
    btn.disabled = false; btn.textContent = 'Masuk';
  }
}

// ─────────────────────────────────────────────────────────
//  REGISTER PAGE
// ─────────────────────────────────────────────────────────
function renderRegister(container) {
  const selPkg = state.selectedPkg || 'monthly';
  container.innerHTML = `
    <div class="auth-bg"></div>
    ${renderNavbar(false)}
    <div class="auth-page">
      <div class="auth-card fade-in" style="max-width:520px">
        <div class="auth-header">
          <a class="auth-logo-link" href="#" onclick="navigate('landing');return false;">
            <div class="logo-icon" style="width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--pink));display:flex;align-items:center;justify-content:center">✦</div>
            <span>Cerdas<span style="color:var(--blue-light)">Plus</span></span>
          </a>
          <h2>Mulai Perjalanan<br><span class="grad-mixed">Belajarmu</span> 🚀</h2>
          <p>Buat akun CerdasPlus gratis sekarang</p>
        </div>
        <form class="auth-form" id="regForm" onsubmit="handleRegister(event)">
          <div class="form-group">
            <label class="form-label">Nama Lengkap</label>
            <input class="form-input" type="text" id="regName" placeholder="Nama lengkap siswa" required />
          </div>
          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-input" type="email" id="regEmail" placeholder="contoh@email.com" required autocomplete="email" />
          </div>
          <div class="form-group">
            <label class="form-label">Nomor WhatsApp</label>
            <input class="form-input" type="tel" id="regPhone" placeholder="08xxxxxxxxxx" required />
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
            <div class="form-group">
              <label class="form-label">Jenjang</label>
              <select class="form-select" id="regLevel" required onchange="updateGradeOptions()">
                <option value="">Pilih</option>
                <option value="SD">SD</option>
                <option value="SMP">SMP</option>
                <option value="SMA">SMA</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kelas</label>
              <select class="form-select" id="regGrade" required>
                <option value="">Pilih kelas</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Pilih Paket</label>
            <div class="pkg-select-grid">
              <div class="pkg-option ${selPkg === 'monthly' ? 'selected-blue' : ''}" id="optMonthly" onclick="selectRegPkg('monthly')">
                <div class="opt-name">📚 Bulanan</div>
                <div class="opt-price">${fmt(PACKAGES.monthly.price)}/bln</div>
              </div>
              <div class="pkg-option ${selPkg === 'annual' ? 'selected-pink' : ''}" id="optAnnual" onclick="selectRegPkg('annual')">
                <div class="opt-name">⭐ Tahunan</div>
                <div class="opt-price">${fmt(PACKAGES.annual.price)}/thn</div>
              </div>
            </div>
            <input type="hidden" id="regPkg" value="${selPkg}" />
          </div>
          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-input" type="password" id="regPwd" placeholder="Minimal 8 karakter" required minlength="8" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label class="form-label">Konfirmasi Password</label>
            <input class="form-input" type="password" id="regPwd2" placeholder="Ulangi password" required autocomplete="new-password" />
          </div>
          <button type="submit" class="btn btn-blue btn-full btn-lg" id="regBtn">Daftar Sekarang</button>
        </form>
        <div class="auth-footer">
          Sudah punya akun?
          <button class="auth-link" onclick="navigate('login')">Masuk</button>
        </div>
      </div>
    </div>
  `;
}

function updateGradeOptions() {
  const level = document.getElementById('regLevel').value;
  const gradeEl = document.getElementById('regGrade');
  const maps = {
    SD:  ['Kelas 1','Kelas 2','Kelas 3','Kelas 4','Kelas 5','Kelas 6'],
    SMP: ['Kelas 7','Kelas 8','Kelas 9'],
    SMA: ['Kelas 10','Kelas 11','Kelas 12'],
  };
  gradeEl.innerHTML = '<option value="">Pilih kelas</option>';
  (maps[level] || []).forEach(g => {
    const o = document.createElement('option'); o.value = g; o.textContent = g;
    gradeEl.appendChild(o);
  });
}

function selectRegPkg(pkg) {
  state.selectedPkg = pkg;
  document.getElementById('regPkg').value = pkg;
  document.getElementById('optMonthly').className = 'pkg-option' + (pkg === 'monthly' ? ' selected-blue' : '');
  document.getElementById('optAnnual').className  = 'pkg-option' + (pkg === 'annual'  ? ' selected-pink' : '');
}

async function handleRegister(e) {
  e.preventDefault();
  const btn  = document.getElementById('regBtn');
  const pwd  = document.getElementById('regPwd').value;
  const pwd2 = document.getElementById('regPwd2').value;
  if (pwd !== pwd2) { toast('Password tidak cocok!', 'error'); return; }

  const pkg = document.getElementById('regPkg').value;
  if (!pkg) { toast('Pilih paket terlebih dahulu!', 'error'); return; }

  const level = document.getElementById('regLevel').value;
  const grade = document.getElementById('regGrade').value;
  if (!level || !grade) { toast('Pilih jenjang dan kelas!', 'error'); return; }

  btn.disabled = true; btn.textContent = 'Mendaftarkan...';
  try {
    await doRegister({
      full_name:    document.getElementById('regName').value.trim(),
      email:        document.getElementById('regEmail').value.trim(),
      phone:        document.getElementById('regPhone').value.trim(),
      school_level: level,
      grade,
      package_type: pkg,
      password:     pwd,
    });
    toast('Pendaftaran berhasil! Silakan lanjut ke pembayaran.', 'success');
    navigate('payment');
  } catch (err) {
    toast(err.message || 'Pendaftaran gagal. Coba lagi.', 'error');
    btn.disabled = false; btn.textContent = 'Daftar Sekarang';
  }
}

// ─────────────────────────────────────────────────────────
//  PAYMENT PAGE
// ─────────────────────────────────────────────────────────
function renderPayment(container) {
  const pkgId  = state.profile?.package_type || state.selectedPkg || 'monthly';
  const pkg    = PACKAGES[pkgId];
  const name   = state.profile?.full_name || 'Pengguna';

  container.innerHTML = `
    <div class="auth-bg"></div>
    ${renderNavbar(false)}
    <div class="payment-page">
      <div class="payment-card fade-in">
        <div style="text-align:center;margin-bottom:28px">
          <div style="font-family:var(--ff-display);font-size:1.5rem;font-weight:800;margin-bottom:6px">Konfirmasi Pembayaran 💳</div>
          <div style="color:var(--txt-1);font-size:.9375rem">Halo <strong>${name}</strong>! Transfer sesuai nominal paket yang dipilih.</div>
        </div>

        <!-- Package summary -->
        <div class="payment-pkg-summary">
          <div class="payment-pkg-icon" style="background:${pkg.color === 'pink' ? 'var(--pink-dim)' : 'var(--blue-dim)'}">${pkg.icon}</div>
          <div>
            <div class="payment-pkg-name">${pkg.name}</div>
            <div class="payment-pkg-price">${fmt(pkg.price)}${pkg.period}</div>
          </div>
          <div style="margin-left:auto">
            <span class="status-pill ${pkg.color === 'pink' ? '' : 'verified'}" style="${pkg.color === 'pink' ? 'background:var(--pink-dim);color:var(--pink-light);border-color:rgba(201,48,240,.3)' : ''}">
              ${pkg.tier}
            </span>
          </div>
        </div>

        <!-- Bank transfer info -->
        <div style="font-family:var(--ff-display);font-size:.8rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--txt-2);margin-bottom:12px">
          Rekening Tujuan Transfer
        </div>
        <div class="bank-info">
          <div class="bank-row">
            <span class="bkey">Bank</span>
            <span class="bval">BCA</span>
          </div>
          <div class="bank-row">
            <span class="bkey">No. Rekening</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="bval" id="accNum">1234567890</span>
              <button class="copy-btn" onclick="copyText('1234567890')">Salin</button>
            </div>
          </div>
          <div class="bank-row">
            <span class="bkey">Atas Nama</span>
            <span class="bval">PT CerdasPlus Indonesia</span>
          </div>
          <div class="bank-row">
            <span class="bkey">Nominal</span>
            <div style="display:flex;align-items:center;gap:8px">
              <span class="bval grad-${pkg.color === 'pink' ? 'pink' : 'blue'}" id="payAmount">${fmt(pkg.price)}</span>
              <button class="copy-btn" onclick="copyText('${pkg.price}')">Salin</button>
            </div>
          </div>
        </div>

        <div class="payment-note">
          ℹ️ Transfer tepat sesuai nominal di atas. Pembayaran akan diverifikasi oleh tim kami dalam <strong>1×24 jam</strong> hari kerja. Kamu akan mendapat notifikasi WhatsApp setelah terverifikasi.
        </div>

        <!-- Input nominal -->
        <form style="margin-top:24px;display:flex;flex-direction:column;gap:14px" onsubmit="handlePaymentSubmit(event)">
          <div class="form-group">
            <label class="form-label">Masukkan Nominal yang Ditransfer (Rp)</label>
            <input class="form-input" type="number" id="payInput"
              placeholder="${pkg.price}"
              value="${pkg.price}"
              min="1000" required
              style="font-size:1.1rem;font-weight:700;font-family:var(--ff-display)" />
            <div class="form-hint">Masukkan angka sesuai nominal paket: <strong>${fmt(pkg.price)}</strong></div>
          </div>
          <button type="submit" class="btn btn-blue btn-full btn-lg" id="payBtn">
            Konfirmasi Sudah Transfer ✓
          </button>
          <button type="button" class="btn btn-ghost btn-full" onclick="navigate('landing')">
            Kembali ke Beranda
          </button>
        </form>
      </div>
    </div>
  `;
}

function copyText(val) {
  navigator.clipboard.writeText(String(val))
    .then(() => toast('Disalin ke clipboard!', 'success'))
    .catch(() => toast('Gagal menyalin.', 'error'));
}

async function handlePaymentSubmit(e) {
  e.preventDefault();
  const amount = parseInt(document.getElementById('payInput').value, 10);
  if (!amount || amount < 1000) { toast('Masukkan nominal yang valid!', 'error'); return; }
  const btn = document.getElementById('payBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    await submitPayment(amount);
    toast('Konfirmasi pembayaran berhasil dikirim!', 'success');
    navigate('waiting');
  } catch (err) {
    toast(err.message || 'Gagal menyimpan. Coba lagi.', 'error');
    btn.disabled = false; btn.textContent = 'Konfirmasi Sudah Transfer ✓';
  }
}

// ─────────────────────────────────────────────────────────
//  WAITING PAGE
// ─────────────────────────────────────────────────────────
function renderWaiting(container) {
  const pkgId = state.profile?.package_type || 'monthly';
  const pkg   = PACKAGES[pkgId];
  const amt   = state.profile?.payment_amount;

  container.innerHTML = `
    <div class="auth-bg"></div>
    ${renderNavbar(false)}
    <div class="waiting-page">
      <div class="waiting-card fade-in">
        <div class="waiting-icon">⏳</div>
        <h2>Menunggu Verifikasi</h2>
        <p style="margin-bottom:20px">
          Pembayaran kamu sebesar <strong>${amt ? fmt(amt) : '—'}</strong> untuk paket
          <strong>${pkg.name}</strong> sedang dalam proses verifikasi.
        </p>
        <div style="background:var(--bg-3);border:1px solid var(--border-0);border-radius:var(--r-lg);padding:18px;margin-bottom:24px;text-align:left">
          <div style="font-family:var(--ff-display);font-size:.78rem;font-weight:700;letter-spacing:.08em;color:var(--txt-2);text-transform:uppercase;margin-bottom:10px">Status</div>
          <div style="display:flex;align-items:center;gap:10px">
            <span class="status-pill pending">⏳ Menunggu Verifikasi</span>
          </div>
          <div style="font-size:.8125rem;color:var(--txt-2);margin-top:10px">
            Tim kami akan memverifikasi pembayaranmu dalam <strong style="color:var(--txt-1)">1×24 jam</strong> hari kerja.
            Kamu akan mendapat notifikasi WhatsApp setelah terverifikasi.
          </div>
        </div>
        <button class="btn btn-ghost btn-full" onclick="navigate('landing')">← Kembali ke Beranda</button>
      </div>
    </div>
  `;
}

// ─────────────────────────────────────────────────────────
//  DASHBOARD
// ─────────────────────────────────────────────────────────
function renderDashboard(container) {
  const p     = state.profile || {};
  const pkg   = PACKAGES[p.package_type || 'monthly'];
  const init  = (p.full_name || 'U').charAt(0).toUpperCase();
  const tab   = state.dashTab;

  container.innerHTML = `
    <!-- Sidebar overlay (mobile) -->
    <div class="sidebar-overlay ${state.sidebarOpen ? 'show' : ''}" id="sidebarOverlay" onclick="toggleSidebar()"></div>

    <!-- Sidebar -->
    <aside class="sidebar ${state.sidebarOpen ? '' : 'closed'}" id="sidebar">
      <div class="sidebar-header">
        <div class="sidebar-logo">
          <div style="width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--blue),var(--pink));display:flex;align-items:center;justify-content:center;font-size:.85rem">✦</div>
          <span>Cerdas<span style="color:var(--blue-light)">Plus</span></span>
        </div>
        <button class="sidebar-close" onclick="toggleSidebar()">✕</button>
      </div>

      <nav class="sidebar-nav">
        <div class="sidebar-section-label">Menu Utama</div>
        ${[
          { id:'overview',    icon:'🏠', label:'Beranda',       badge:'' },
          { id:'jadwal',      icon:'📅', label:'Jadwal Belajar', badge:'' },
          { id:'materi',      icon:'📖', label:'Materi & Modul', badge:'Baru' },
          { id:'pembayaran',  icon:'💳', label:'Pembayaran',    badge:'' },
        ].map(item => `
          <button class="sidebar-link ${tab === item.id ? 'active' : ''}"
            onclick="switchDashTab('${item.id}')">
            <span class="s-icon">${item.icon}</span>
            <span>${item.label}</span>
            ${item.badge ? `<span class="s-badge">${item.badge}</span>` : ''}
          </button>
        `).join('')}

        <div class="sidebar-section-label">Akun</div>
        <button class="sidebar-link ${tab === 'profil' ? 'active' : ''}" onclick="switchDashTab('profil')">
          <span class="s-icon">👤</span>
          <span>Profil Saya</span>
        </button>
      </nav>

      <!-- User card -->
      <div class="sidebar-user">
        <div class="sidebar-user-avatar">${init}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${p.full_name || 'Pengguna'}</div>
          <div class="sidebar-user-pkg">${pkg.name}</div>
        </div>
        <button class="sidebar-logout-btn" title="Keluar" onclick="doLogout()">⏻</button>
      </div>
    </aside>

    <!-- Main -->
    <div class="dashboard-main">
      <!-- Topbar -->
      <div class="dashboard-topbar">
        <div class="topbar-left">
          <button class="topbar-hamburger" onclick="toggleSidebar()">
            <span></span><span></span><span></span>
          </button>
          <div class="topbar-title">${getDashTabTitle(tab)}</div>
        </div>
        <div class="topbar-right">
          <span class="status-pill verified">✓ Terverifikasi</span>
          <div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,var(--blue),var(--pink));display:flex;align-items:center;justify-content:center;font-family:var(--ff-display);font-weight:800;font-size:.85rem;color:#fff">${init}</div>
        </div>
      </div>

      <!-- Views -->
      <div id="dashContent">
        ${renderDashView(tab, p, pkg)}
      </div>
    </div>
  `;
}

function getDashTabTitle(tab) {
  return {
    overview:   'Beranda',
    jadwal:     'Jadwal Belajar',
    materi:     'Materi & Modul',
    pembayaran: 'Riwayat Pembayaran',
    profil:     'Profil Saya',
  }[tab] || 'Dashboard';
}

function switchDashTab(tab) {
  state.dashTab    = tab;
  state.sidebarOpen = false;
  render();
}

function toggleSidebar() {
  state.sidebarOpen = !state.sidebarOpen;
  document.getElementById('sidebar')?.classList.toggle('closed', !state.sidebarOpen);
  document.getElementById('sidebarOverlay')?.classList.toggle('show', state.sidebarOpen);
}

function renderDashView(tab, p, pkg) {
  switch (tab) {
    case 'overview':   return renderOverview(p, pkg);
    case 'jadwal':     return renderJadwal(p, pkg);
    case 'materi':     return renderMateri(pkg);
    case 'pembayaran': return renderPembayaran(p, pkg);
    case 'profil':     return renderProfil(p);
    default:           return renderOverview(p, pkg);
  }
}

// ── Overview ───────────────────────────────────────────────
function renderOverview(p, pkg) {
  const now = new Date();
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `
    <div class="dash-view active fade-in">
      <div class="dash-view-title">Selamat datang, ${p.full_name?.split(' ')[0] || 'Siswa'}! 👋</div>
      <div class="dash-view-subtitle">Semangat belajar hari ini! Kamu sudah selangkah lebih maju.</div>

      <div class="stats-row">
        <div class="stat-card">
          <div class="s-icon">📚</div>
          <div class="s-label">Paket Aktif</div>
          <div class="s-value" style="font-size:1rem">${pkg.name}</div>
          <div class="s-sub">${pkg.price.toLocaleString('id-ID')}</div>
        </div>
        <div class="stat-card">
          <div class="s-icon">✅</div>
          <div class="s-label">Sesi Selesai</div>
          <div class="s-value grad-blue">8</div>
          <div class="s-sub">bulan ini</div>
        </div>
        <div class="stat-card">
          <div class="s-icon">⏰</div>
          <div class="s-label">Sesi Tersisa</div>
          <div class="s-value grad-pink">${pkg.id === 'annual' ? '∞' : '4'}</div>
          <div class="s-sub">${pkg.id === 'annual' ? 'Unlimited' : 'bulan ini'}</div>
        </div>
        <div class="stat-card">
          <div class="s-icon">🎯</div>
          <div class="s-label">Jenjang</div>
          <div class="s-value" style="font-size:1.1rem">${p.school_level || '—'}</div>
          <div class="s-sub">${p.grade || ''}</div>
        </div>
      </div>

      <!-- Active package banner -->
      <div style="background:linear-gradient(135deg,${pkg.color==='pink'?'#200830,#0F0A20':'#0A1A3F,#070F25'});border:1px solid ${pkg.color==='pink'?'rgba(201,48,240,.3)':'rgba(47,111,237,.3)'};border-radius:var(--r-xl);padding:28px;margin-bottom:28px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:16px">
        <div>
          <div style="font-family:var(--ff-display);font-size:.78rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${pkg.color==='pink'?'var(--pink-light)':'var(--blue-light)'};margin-bottom:8px">${pkg.tier} — AKTIF</div>
          <div style="font-family:var(--ff-display);font-size:1.3rem;font-weight:800;margin-bottom:4px">${pkg.name}</div>
          <div style="color:var(--txt-1);font-size:.875rem">${fmt(pkg.price)}${pkg.period} · Aktif sejak ${months[now.getMonth()]} ${now.getFullYear()}</div>
        </div>
        <span class="status-pill verified" style="font-size:.9rem;padding:8px 18px">✓ Terverifikasi</span>
      </div>

      <!-- Upcoming schedule preview -->
      <div style="font-family:var(--ff-display);font-size:1rem;font-weight:800;margin-bottom:16px">
        Sesi Mendatang 📅
        <button class="btn btn-outline-blue btn-sm" style="margin-left:12px" onclick="switchDashTab('jadwal')">Lihat Semua</button>
      </div>
      ${getScheduleItems().slice(0,3).map(s => renderScheduleItem(s)).join('')}
    </div>
  `;
}

// ── Jadwal ─────────────────────────────────────────────────
function getScheduleItems() {
  const d = new Date();
  return [
    { day: d.getDate()+1, dayName:'Sn', subject:'Matematika', time:'14.00–15.30', tutor:'Bu Rina', status:'upcoming' },
    { day: d.getDate()+2, dayName:'Sl', subject:'Bahasa Inggris', time:'09.00–10.30', tutor:'Pak Budi', status:'upcoming' },
    { day: d.getDate()+3, dayName:'Rb', subject:'IPA / Fisika', time:'15.00–16.30', tutor:'Bu Santi', status:'upcoming' },
    { day: d.getDate()+4, dayName:'Km', subject:'Bahasa Indonesia', time:'10.00–11.30', tutor:'Pak Hendra', status:'upcoming' },
    { day: d.getDate()-1, dayName:'Mg', subject:'Kimia', time:'13.00–14.30', tutor:'Bu Dewi', status:'done' },
    { day: d.getDate()-2, dayName:'Sb', subject:'Matematika', time:'09.00–10.30', tutor:'Bu Rina', status:'done' },
  ];
}

function renderScheduleItem(s) {
  return `
    <div class="schedule-item">
      <div class="sch-day">
        <div class="day-num">${s.day}</div>
        <div class="day-name">${s.dayName}</div>
      </div>
      <div class="sch-info">
        <div class="sch-subject">${s.subject}</div>
        <div class="sch-meta">🕐 ${s.time} · 👩‍🏫 ${s.tutor}</div>
      </div>
      <div class="sch-status ${s.status}">${s.status === 'done' ? '✓ Selesai' : '→ Mendatang'}</div>
    </div>
  `;
}

function renderJadwal(p, pkg) {
  return `
    <div class="dash-view active fade-in">
      <div class="dash-view-title">Jadwal Belajar</div>
      <div class="dash-view-subtitle">Semua sesi belajarmu bulan ini</div>
      <div class="schedule-grid">
        ${getScheduleItems().map(s => renderScheduleItem(s)).join('')}
      </div>
    </div>
  `;
}

// ── Materi ─────────────────────────────────────────────────
function renderMateri(pkg) {
  const modules = [
    { icon:'🔢', name:'Matematika',        count:'48 Modul', progress:72 },
    { icon:'🔬', name:'IPA / Sains',        count:'36 Modul', progress:45 },
    { icon:'📝', name:'Bahasa Indonesia',   count:'30 Modul', progress:88 },
    { icon:'🌍', name:'Bahasa Inggris',     count:'42 Modul', progress:55 },
    { icon:'🧪', name:'Kimia',              count:'28 Modul', progress:30 },
    { icon:'⚡', name:'Fisika',             count:'32 Modul', progress:60 },
    { icon:'🌱', name:'Biologi',            count:'26 Modul', progress:40 },
    { icon:'🏛️', name:'Sejarah',            count:'24 Modul', progress:20 },
  ];
  return `
    <div class="dash-view active fade-in">
      <div class="dash-view-title">Materi & Modul</div>
      <div class="dash-view-subtitle">Akses semua materi pelajaran premium</div>
      <div class="modules-grid">
        ${modules.map(m => `
          <div class="module-card" onclick="toast('Membuka modul ${m.name}...','info')">
            <div class="module-icon">${m.icon}</div>
            <div class="module-name">${m.name}</div>
            <div class="module-count">${m.count}</div>
            <div class="module-progress">
              <div class="module-progress-bar" style="width:${m.progress}%"></div>
            </div>
            <div style="font-size:.72rem;color:var(--txt-2);margin-top:4px;font-weight:700">${m.progress}% selesai</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ── Pembayaran ─────────────────────────────────────────────
function renderPembayaran(p, pkg) {
  const now = new Date();
  const ds  = `${now.getDate()} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][now.getMonth()]} ${now.getFullYear()}`;
  return `
    <div class="dash-view active fade-in">
      <div class="dash-view-title">Riwayat Pembayaran</div>
      <div class="dash-view-subtitle">Detail transaksi dan status pembayaranmu</div>

      <!-- Active package card -->
      <div class="card" style="margin-bottom:24px">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;gap:16px;margin-bottom:20px">
          <div>
            <div style="font-family:var(--ff-display);font-size:.8rem;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--txt-2);margin-bottom:8px">Paket Aktif</div>
            <div style="font-family:var(--ff-display);font-size:1.2rem;font-weight:800">${pkg.name}</div>
            <div style="color:var(--txt-1);font-size:.875rem;margin-top:4px">${fmt(pkg.price)}${pkg.period}</div>
          </div>
          <span class="status-pill verified">✓ Terverifikasi</span>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px">
          ${[
            { label:'Nominal Transfer', value: p.payment_amount ? fmt(p.payment_amount) : '—' },
            { label:'Tanggal',          value: ds },
            { label:'Metode',           value: 'Transfer Bank (BCA)' },
            { label:'Jenjang',          value: `${p.school_level || '—'} · ${p.grade || ''}` },
          ].map(r => `
            <div style="background:var(--bg-3);border:1px solid var(--border-0);border-radius:var(--r-md);padding:14px">
              <div style="font-size:.72rem;color:var(--txt-2);font-weight:700;font-family:var(--ff-display);letter-spacing:.06em;text-transform:uppercase;margin-bottom:6px">${r.label}</div>
              <div style="font-family:var(--ff-display);font-size:.9rem;font-weight:700">${r.value}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Invoice-like table -->
      <div class="card">
        <div style="font-family:var(--ff-display);font-size:1rem;font-weight:800;margin-bottom:16px">Rincian Invoice</div>
        <div style="display:flex;flex-direction:column;gap:0">
          ${[
            { desc: pkg.name,       amount: fmt(pkg.price) },
            { desc: 'Biaya Admin',  amount: 'Rp 0' },
            { desc: 'Diskon',       amount: 'Rp 0' },
          ].map(r => `
            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-0);font-size:.9375rem">
              <span style="color:var(--txt-1)">${r.desc}</span>
              <span style="font-family:var(--ff-display);font-weight:700">${r.amount}</span>
            </div>
          `).join('')}
          <div style="display:flex;justify-content:space-between;padding:16px 0;font-family:var(--ff-display);font-weight:800;font-size:1.05rem">
            <span>Total</span>
            <span class="grad-blue">${fmt(pkg.price)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// ── Profil ─────────────────────────────────────────────────
function renderProfil(p) {
  const init = (p.full_name || 'U').charAt(0).toUpperCase();
  return `
    <div class="dash-view active fade-in">
      <div class="dash-view-title">Profil Saya</div>
      <div class="dash-view-subtitle">Informasi akun dan data diri kamu</div>

      <div class="profile-avatar-block">
        <div class="profile-avatar-big">${init}</div>
        <div>
          <div class="profile-name-big">${p.full_name || '—'}</div>
          <div class="profile-email">${state.user?.email || '—'}</div>
          <div style="margin-top:6px"><span class="status-pill verified">✓ Akun Terverifikasi</span></div>
        </div>
      </div>

      <form onsubmit="handleProfileSave(event)" style="display:flex;flex-direction:column;gap:16px">
        <div style="display:grid;grid-template-columns:1fr;gap:16px">
          <div class="profile-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label class="form-label">Nama Lengkap</label>
              <input class="form-input" id="profName" type="text" value="${p.full_name || ''}" required />
            </div>
            <div class="form-group">
              <label class="form-label">No. WhatsApp</label>
              <input class="form-input" id="profPhone" type="tel" value="${p.phone || ''}" />
            </div>
          </div>
          <div class="profile-form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
            <div class="form-group">
              <label class="form-label">Jenjang</label>
              <select class="form-select" id="profLevel">
                <option value="SD"  ${p.school_level==='SD'  ?'selected':''}>SD</option>
                <option value="SMP" ${p.school_level==='SMP' ?'selected':''}>SMP</option>
                <option value="SMA" ${p.school_level==='SMA' ?'selected':''}>SMA</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Kelas</label>
              <input class="form-input" id="profGrade" type="text" value="${p.grade || ''}" />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email (tidak dapat diubah)</label>
            <input class="form-input" type="email" value="${state.user?.email || ''}" disabled style="opacity:.5;cursor:not-allowed" />
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap">
          <button type="submit" class="btn btn-blue" id="profSaveBtn">Simpan Perubahan</button>
          <button type="button" class="btn btn-ghost" onclick="doLogout()">⏻ Keluar</button>
        </div>
      </form>
    </div>
  `;
}

async function handleProfileSave(e) {
  e.preventDefault();
  const btn = document.getElementById('profSaveBtn');
  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    await updateProfile({
      full_name:    document.getElementById('profName').value.trim(),
      phone:        document.getElementById('profPhone').value.trim(),
      school_level: document.getElementById('profLevel').value,
      grade:        document.getElementById('profGrade').value.trim(),
    });
    toast('Profil berhasil diperbarui!', 'success');
  } catch (err) {
    toast(err.message || 'Gagal memperbarui profil.', 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Perubahan';
  }
}

// ─────────────────────────────────────────────────────────
//  INIT
// ─────────────────────────────────────────────────────────
async function init() {
  const loader = document.getElementById('globalLoader');

  try {
    // Check existing session
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session?.user) {
      state.user = session.user;
      await loadProfile();
      routeAfterAuth();
    } else {
      render(); // show landing
    }
  } catch (err) {
    console.error('Init error:', err);
    render(); // fallback to landing
  } finally {
    loader?.classList.add('hidden');
  }

  // Listen for auth changes
  supabaseClient.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_OUT') {
      state.user    = null;
      state.profile = null;
      navigate('landing');
    } else if (event === 'SIGNED_IN' && session?.user) {
      state.user = session.user;
      await loadProfile();
    }
  });
}

// Start app
init();

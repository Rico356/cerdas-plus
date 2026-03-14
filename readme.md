 ============================================================
  SQL SETUP — jalankan di Supabase → SQL Editor
 ============================================================

  ── 1. Tabel profiles (data siswa) ──────────────────────
  create table public.profiles (
    id             uuid references auth.users on delete cascade primary key,
    full_name      text not null,
    phone          text,
    school_level   text check (school_level in ('SD','SMP','SMA')),
    grade          text,
    package_type   text check (package_type in ('monthly','annual')),
    payment_amount bigint,
    payment_status text default 'pending'
                   check (payment_status in ('pending','verified','rejected')),
    created_at     timestamptz default now()
  );

  ── 2. Tabel admins (daftar user yang boleh akses admin) ─
  create table public.admins (
    id         uuid references auth.users on delete cascade primary key,
    created_at timestamptz default now()
  );

  ── 3. Row Level Security ────────────────────────────────
  alter table public.profiles enable row level security;
  alter table public.admins   enable row level security;

  -- Siswa hanya bisa akses data sendiri
  create policy "own profile select"
    on public.profiles for select using (auth.uid() = id);
  create policy "own profile insert"
    on public.profiles for insert with check (auth.uid() = id);
  create policy "own profile update"
    on public.profiles for update using (auth.uid() = id);

  -- Admin bisa baca & update SEMUA profiles
  create policy "admin select all profiles"
    on public.profiles for select
    using (exists (select 1 from public.admins where id = auth.uid()));

  create policy "admin update all profiles"
    on public.profiles for update
    using (exists (select 1 from public.admins where id = auth.uid()));

  -- Admin bisa baca tabel admins (untuk verifikasi diri sendiri)
  create policy "admin can read admins"
    on public.admins for select using (auth.uid() = id);

  ── 4. Daftarkan akun admin ──────────────────────────────
  Setelah membuat akun via https://[project].supabase.co/auth
  atau via Supabase Dashboard → Authentication → Users,
 salin UUID user-nya lalu jalankan:
//  insert into public.admins (id) values ('<UUID-ADMIN-DI-SINI>');
//
// ============================================================

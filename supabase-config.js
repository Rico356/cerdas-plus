// ============================================================
//  SUPABASE CONFIG — ganti dengan credentials project Anda
//  1. Buka https://supabase.com → Project Settings → API
//  2. Salin Project URL dan anon public key ke sini
// ============================================================
const SUPABASE_URL      = 'https://ywqpbrmsdzaciymewjkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cXBicm1zZHphY2l5bWV3amtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzgwNjcsImV4cCI6MjA4OTA1NDA2N30.6qH5Kc_EmfC8iVzeINJ04f2MkaMIsdKgwKJuLo75xuI';

// ============================================================
//  SQL SETUP LENGKAP — jalankan sekali di Supabase → SQL Editor
// ============================================================
//
//  -- 1. Tabel profiles (data siswa)
//  create table public.profiles (
//    id             uuid references auth.users on delete cascade primary key,
//    full_name      text not null,
//    phone          text,
//    school_level   text check (school_level in ('SD','SMP','SMA')),
//    grade          text,
//    package_type   text check (package_type in ('monthly','annual')),
//    payment_amount bigint,
//    payment_status text default 'pending'
//                   check (payment_status in ('pending','verified','rejected')),
//    registered_by  text default 'self',
//    created_at     timestamptz default now()
//  );
//
//  -- 2. Tabel admins
//  create table public.admins (
//    id         uuid references auth.users on delete cascade primary key,
//    created_at timestamptz default now()
//  );
//
//  -- 3. Row Level Security
//  alter table public.profiles enable row level security;
//  alter table public.admins   enable row level security;
//
//  -- Siswa akses data sendiri
//  create policy "own profile select"
//    on public.profiles for select using (auth.uid() = id);
//  create policy "own profile insert"
//    on public.profiles for insert with check (auth.uid() = id);
//  create policy "own profile update"
//    on public.profiles for update using (auth.uid() = id);
//
//  -- Admin SELECT semua profiles
//  create policy "admin select all profiles"
//    on public.profiles for select
//    using (exists (select 1 from public.admins where id = auth.uid()));
//
//  -- Admin UPDATE semua profiles (verifikasi, tolak, dsb)
//  create policy "admin update all profiles"
//    on public.profiles for update
//    using (exists (select 1 from public.admins where id = auth.uid()));
//
//  -- Admin INSERT profile untuk siswa yang didaftarkan manual
//  create policy "admin insert any profile"
//    on public.profiles for insert
//    with check (exists (select 1 from public.admins where id = auth.uid()));
//
//  -- Admin baca tabel admins
//  create policy "admin can read admins"
//    on public.admins for select using (auth.uid() = id);
//
//  -- 4. Daftarkan akun admin
//  Buat user di Supabase -> Authentication -> Users (Add User),
//  salin UUID-nya, lalu jalankan:
//  insert into public.admins (id) values ('UUID-ADMIN-DISINI');
//
// ============================================================

// Client utama — untuk siswa & admin (operasi normal)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Client kedua — khusus untuk admin mendaftarkan siswa baru.
// persistSession: false + storageKey berbeda supaya proses signUp
// siswa tidak menimpa session login admin yang sedang aktif.
const supabaseStudentClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { storageKey: 'cp_student_signup_session', persistSession: false },
});

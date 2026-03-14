// ============================================================
//  SUPABASE CONFIG — ganti dengan credentials project Anda
//  1. Buka https://supabase.com → Project Settings → API
//  2. Salin Project URL dan anon public key ke sini
// ============================================================
const SUPABASE_URL = 'https://ywqpbrmsdzaciymewjkb.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl3cXBicm1zZHphY2l5bWV3amtiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzgwNjcsImV4cCI6MjA4OTA1NDA2N30.6qH5Kc_EmfC8iVzeINJ04f2MkaMIsdKgwKJuLo75xuI';

// ============================================================
//  SQL untuk setup tabel di Supabase SQL Editor:
// ------------------------------------------------------------
//  create table public.profiles (
//    id           uuid references auth.users on delete cascade primary key,
//    full_name    text not null,
//    phone        text,
//    school_level text check (school_level in ('SD','SMP','SMA')),
//    grade        text,
//    package_type text check (package_type in ('monthly','annual')),
//    payment_amount bigint,
//    payment_status text default 'pending'
//               check (payment_status in ('pending','verified','rejected')),
//    created_at   timestamptz default now()
//  );
//
//  alter table public.profiles enable row level security;
//
//  create policy "own profile select"
//    on public.profiles for select using (auth.uid() = id);
//  create policy "own profile insert"
//    on public.profiles for insert with check (auth.uid() = id);
//  create policy "own profile update"
//    on public.profiles for update using (auth.uid() = id);
// ============================================================

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

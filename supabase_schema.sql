-- 1. Create Profiles Table (linked to Supabase Auth users)
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  student_id text not null,
  gender text not null check (gender in ('남', '여')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on profiles
alter table public.profiles enable row level security;

-- Profiles Policies
create policy "Allow public read access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- 2. Create Rooms Table
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references public.profiles(id) on delete cascade not null,
  departure text not null,
  destination text not null,
  departure_time timestamp with time zone not null,
  capacity integer not null default 4 check (capacity >= 2 and capacity <= 4),
  gender_filter text not null check (gender_filter in ('anyone', 'same_gender')),
  status text not null default 'recruiting' check (status in ('recruiting', 'closed', 'riding', 'settlement')),
  total_fare integer not null default 0,
  bank_account text not null,
  kakaopay_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on rooms
alter table public.rooms enable row level security;

-- Rooms Policies
create policy "Allow read access to rooms for authenticated users" on public.rooms
  for select using (auth.role() = 'authenticated');

create policy "Allow insert rooms for authenticated users" on public.rooms
  for insert with check (auth.role() = 'authenticated' and auth.uid() = created_by);

create policy "Allow update rooms for host" on public.rooms
  for update using (auth.role() = 'authenticated' and auth.uid() = created_by);

create policy "Allow delete rooms for host" on public.rooms
  for delete using (auth.role() = 'authenticated' and auth.uid() = created_by);

-- 3. Create Applicants Table
create table public.applicants (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  is_midway_boarding boolean default false not null,
  midway_location text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (room_id, user_id)
);

-- Enable RLS on applicants
alter table public.applicants enable row level security;

-- Applicants Policies
create policy "Allow read access to applicants for authenticated users" on public.applicants
  for select using (auth.role() = 'authenticated');

create policy "Allow insert applicants for authenticated users" on public.applicants
  for insert with check (auth.role() = 'authenticated' and auth.uid() = user_id);

create policy "Allow update applicants for host or applicant self" on public.applicants
  for update using (
    auth.role() = 'authenticated' and (
      auth.uid() = user_id or 
      auth.uid() = (select created_by from public.rooms where id = room_id)
    )
  );

create policy "Allow delete applicants for user self" on public.applicants
  for delete using (auth.role() = 'authenticated' and auth.uid() = user_id);

-- 4. Create Chats Table
create table public.chats (
  id uuid default gen_random_uuid() primary key,
  room_id uuid references public.rooms(id) on delete cascade not null,
  sender_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS on chats
alter table public.chats enable row level security;

-- Chats Policies
-- Allow all authenticated users to read and write messages in a room
create policy "Allow read chats for authenticated users" on public.chats
  for select using (
    auth.role() = 'authenticated'
  );

create policy "Allow insert chats for authenticated users" on public.chats
  for insert with check (
    auth.role() = 'authenticated' and 
    auth.uid() = sender_id
  );

-- 5. Trigger for copying auth.users info into public.profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, student_id, gender)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'student_id', ''),
    coalesce(new.raw_user_meta_data->>'gender', '남')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Enable Realtime for Rooms, Applicants, and Chats
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.applicants;
alter publication supabase_realtime add table public.chats;

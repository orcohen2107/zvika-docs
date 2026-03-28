-- Profiles table
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  is_approved boolean default false,
  role text default 'user' check (role in ('user', 'admin')),
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can read own profile"
  on profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

create policy "Admins can update all profiles"
  on profiles for update
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- Documents table
create table if not exists documents (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  document_number text not null,
  document_number_short text not null,
  client_name text not null,
  created_at timestamptz default now()
);

alter table documents enable row level security;

create policy "Users can read own documents"
  on documents for select
  using (auth.uid() = user_id);

create policy "Users can insert own documents"
  on documents for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own documents"
  on documents for delete
  using (auth.uid() = user_id);

create index if not exists idx_documents_short on documents(document_number_short);
create index if not exists idx_documents_user on documents(user_id);

-- Comparisons table
create table if not exists comparisons (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  pdf_filename text not null,
  total_user_entries int not null,
  total_pdf_entries int not null,
  matched_count int not null,
  missing_from_pdf_count int not null,
  extra_in_pdf_count int not null,
  results jsonb not null,
  created_at timestamptz default now()
);

alter table comparisons enable row level security;

create policy "Users can read own comparisons"
  on comparisons for select
  using (auth.uid() = user_id);

create policy "Users can insert own comparisons"
  on comparisons for insert
  with check (auth.uid() = user_id);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Unknown'));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

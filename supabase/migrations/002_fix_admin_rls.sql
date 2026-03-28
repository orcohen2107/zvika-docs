-- Helper function: check if the calling user is an admin
-- SECURITY DEFINER: runs as the function owner, bypassing RLS on profiles
create or replace function is_admin()
returns boolean as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer stable;

-- Drop old recursive policies
drop policy if exists "Admins can read all profiles" on profiles;
drop policy if exists "Admins can update all profiles" on profiles;

-- Recreate without recursion
create policy "Admins can read all profiles"
  on profiles for select
  using (is_admin());

create policy "Admins can update all profiles"
  on profiles for update
  using (is_admin());

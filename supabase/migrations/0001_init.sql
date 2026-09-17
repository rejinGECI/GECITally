-- GECI Tally — schema, RLS, triggers, RPCs
-- Run this in the Supabase SQL editor or via the CLI.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.user_role as enum ('admin', 'staff', 'supervisor');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.election_state as enum ('setup', 'counting', 'finalised');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.round_status as enum ('pending_verification', 'verified', 'rejected');
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.user_role not null default 'staff',
  created_at timestamptz not null default now()
);

create table if not exists public.elections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null,
  total_votes_polled integer not null default 0 check (total_votes_polled >= 0),
  count_limit integer not null default 10 check (count_limit >= 1),
  state public.election_state not null default 'setup',
  created_at timestamptz not null default now()
);

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references public.elections (id) on delete cascade,
  name text not null,
  seats integer not null default 1 check (seats >= 1),
  display_order integer not null default 0
);

create table if not exists public.candidates (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  name text not null,
  photo_url text,
  panel_name text,
  display_order integer not null default 0
);

create table if not exists public.staff_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles (id) on delete cascade,
  post_id uuid not null references public.posts (id) on delete cascade,
  unique (staff_id, post_id)
);

create table if not exists public.count_rounds (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts (id) on delete cascade,
  staff_id uuid not null references public.profiles (id) on delete restrict,
  round_number integer not null check (round_number >= 1),
  status public.round_status not null default 'pending_verification',
  submitted_at timestamptz not null default now(),
  verified_by uuid references public.profiles (id) on delete set null,
  verified_at timestamptz,
  remarks text,
  is_finalised boolean not null default false,
  unique (post_id, staff_id, round_number)
);

create table if not exists public.count_entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.count_rounds (id) on delete cascade,
  candidate_id uuid not null references public.candidates (id) on delete restrict,
  votes integer not null check (votes >= 0),
  unique (round_id, candidate_id)
);

create index if not exists idx_posts_election on public.posts (election_id, display_order);
create index if not exists idx_candidates_post on public.candidates (post_id, display_order);
create index if not exists idx_staff_assignments_staff on public.staff_assignments (staff_id);
create index if not exists idx_staff_assignments_post on public.staff_assignments (post_id);
create index if not exists idx_count_rounds_post_status on public.count_rounds (post_id, status);
create index if not exists idx_count_rounds_status on public.count_rounds (status);
create index if not exists idx_count_entries_round on public.count_entries (round_id);
create index if not exists idx_count_entries_candidate on public.count_entries (candidate_id);

-- ---------------------------------------------------------------------------
-- Role helpers (security definer to avoid RLS recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.is_supervisor()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'supervisor', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'staff', false);
$$;

create or replace function public.is_assigned_to_post(p_post_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_assignments sa
    where sa.staff_id = auth.uid()
      and sa.post_id = p_post_id
  );
$$;

-- ---------------------------------------------------------------------------
-- Auth profile bootstrap
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'role')::public.user_role, 'staff')
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        role = excluded.role;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Integrity: lock finalised rounds / entries
-- ---------------------------------------------------------------------------
create or replace function public.prevent_finalised_round_mutation()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    if old.is_finalised then
      raise exception 'Finalised rounds cannot be modified or deleted';
    end if;
    return old;
  end if;

  if old.is_finalised then
    -- Allow no-op updates that only reaffirm finalisation
    if new.is_finalised is distinct from old.is_finalised
       or new.status is distinct from old.status
       or new.round_number is distinct from old.round_number
       or new.post_id is distinct from old.post_id
       or new.staff_id is distinct from old.staff_id then
      raise exception 'Finalised rounds cannot be modified or deleted';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_finalised_rounds on public.count_rounds;
create trigger trg_lock_finalised_rounds
  before update or delete on public.count_rounds
  for each row execute function public.prevent_finalised_round_mutation();

create or replace function public.prevent_finalised_entry_mutation()
returns trigger
language plpgsql
as $$
declare
  v_finalised boolean;
begin
  select cr.is_finalised
    into v_finalised
  from public.count_rounds cr
  where cr.id = coalesce(new.round_id, old.round_id);

  if coalesce(v_finalised, false) then
    raise exception 'Entries on a finalised round cannot be modified or deleted';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_lock_finalised_entries on public.count_entries;
create trigger trg_lock_finalised_entries
  before insert or update or delete on public.count_entries
  for each row execute function public.prevent_finalised_entry_mutation();

-- Auto-finalise a post once verified round count reaches count_limit
create or replace function public.maybe_finalise_post(p_post_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit integer;
  v_verified integer;
begin
  select e.count_limit
    into v_limit
  from public.posts p
  join public.elections e on e.id = p.election_id
  where p.id = p_post_id;

  select count(*)
    into v_verified
  from public.count_rounds
  where post_id = p_post_id
    and status = 'verified';

  if v_verified >= v_limit then
    update public.count_rounds
       set is_finalised = true
     where post_id = p_post_id
       and status = 'verified'
       and is_finalised = false;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------
create or replace function public.submit_count_round(
  p_post_id uuid,
  p_entries jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_staff uuid := auth.uid();
  v_election public.elections%rowtype;
  v_candidate_count integer;
  v_entry_count integer;
  v_pending integer;
  v_verified integer;
  v_rejected_id uuid;
  v_round_number integer;
  v_round_id uuid;
  v_entry jsonb;
begin
  if v_staff is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_staff() and not public.is_admin() then
    raise exception 'Only counting staff can submit rounds';
  end if;

  if public.is_staff() and not public.is_assigned_to_post(p_post_id) then
    raise exception 'You are not assigned to this post';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Entries must be a JSON array';
  end if;

  select e.*
    into v_election
  from public.elections e
  join public.posts p on p.election_id = e.id
  where p.id = p_post_id;

  if not found then
    raise exception 'Post not found';
  end if;

  if v_election.state <> 'counting' then
    raise exception 'Counting is not open for this election';
  end if;

  -- Optimistic lock: serialise submissions per post / election
  perform 1 from public.elections where id = v_election.id for update;
  perform 1 from public.posts where id = p_post_id for update;

  select count(*) into v_candidate_count
  from public.candidates
  where post_id = p_post_id;

  v_entry_count := jsonb_array_length(p_entries);

  if v_candidate_count = 0 then
    raise exception 'This post has no candidates';
  end if;

  if v_entry_count <> v_candidate_count then
    raise exception 'Submit a count for every candidate in a single transaction';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) e
    where not exists (
      select 1 from public.candidates c
      where c.id = (e->>'candidate_id')::uuid
        and c.post_id = p_post_id
    )
  ) then
    raise exception 'One or more candidates do not belong to this post';
  end if;

  if exists (
    select 1
    from public.candidates c
    where c.post_id = p_post_id
      and not exists (
        select 1
        from jsonb_array_elements(p_entries) e
        where (e->>'candidate_id')::uuid = c.id
      )
  ) then
    raise exception 'Missing candidate in this round';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_entries) e
    where (e->>'votes') is null
       or (e->>'votes') ~ '[^0-9]'
       or (e->>'votes')::int < 0
  ) then
    raise exception 'Votes must be integers greater than or equal to 0';
  end if;

  select count(*) into v_pending
  from public.count_rounds
  where post_id = p_post_id
    and staff_id = v_staff
    and status = 'pending_verification';

  if v_pending > 0 then
    raise exception 'A round is already awaiting supervisor verification';
  end if;

  select count(*) into v_verified
  from public.count_rounds
  where post_id = p_post_id
    and status = 'verified';

  select cr.id
    into v_rejected_id
  from public.count_rounds cr
  where cr.post_id = p_post_id
    and cr.staff_id = v_staff
    and cr.status = 'rejected'
  order by cr.round_number desc
  limit 1;

  if v_rejected_id is not null then
    select round_number into v_round_number
    from public.count_rounds
    where id = v_rejected_id;
  else
    if v_verified >= v_election.count_limit then
      raise exception 'Count limit reached for this post. Ask the admin to raise the finalisation limit.';
    end if;

    select coalesce(max(round_number), 0) + 1
      into v_round_number
    from public.count_rounds
    where post_id = p_post_id
      and staff_id = v_staff;
  end if;

  begin
    if v_rejected_id is not null then
      v_round_id := v_rejected_id;

      delete from public.count_entries where round_id = v_round_id;

      update public.count_rounds
         set status = 'pending_verification',
             submitted_at = now(),
             verified_by = null,
             verified_at = null,
             remarks = null,
             is_finalised = false
       where id = v_round_id;
    else
      insert into public.count_rounds (post_id, staff_id, round_number, status)
      values (p_post_id, v_staff, v_round_number, 'pending_verification')
      returning id into v_round_id;
    end if;
  exception
    when unique_violation then
      raise exception 'Duplicate round detected. This round was already submitted.';
  end;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    insert into public.count_entries (round_id, candidate_id, votes)
    values (
      v_round_id,
      (v_entry->>'candidate_id')::uuid,
      (v_entry->>'votes')::int
    );
  end loop;

  return jsonb_build_object(
    'id', v_round_id,
    'round_number', v_round_number,
    'status', 'pending_verification'
  );
end;
$$;

create or replace function public.review_count_round(
  p_round_id uuid,
  p_action text,
  p_remarks text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_round public.count_rounds%rowtype;
  v_state public.election_state;
begin
  if v_user is null then
    raise exception 'Not authenticated';
  end if;

  if not public.is_supervisor() and not public.is_admin() then
    raise exception 'Only the counting supervisor can review rounds';
  end if;

  if p_action not in ('verify', 'reject') then
    raise exception 'Action must be verify or reject';
  end if;

  select cr.*
    into v_round
  from public.count_rounds cr
  where cr.id = p_round_id
  for update;

  if not found then
    raise exception 'Round not found';
  end if;

  if v_round.is_finalised then
    raise exception 'This round is finalised and cannot be changed';
  end if;

  if v_round.status <> 'pending_verification' then
    raise exception 'Only pending rounds can be reviewed';
  end if;

  select e.state
    into v_state
  from public.posts p
  join public.elections e on e.id = p.election_id
  where p.id = v_round.post_id;

  if v_state <> 'counting' then
    raise exception 'Counting is not open for this election';
  end if;

  if p_action = 'verify' then
    update public.count_rounds
       set status = 'verified',
           verified_by = v_user,
           verified_at = now(),
           remarks = p_remarks
     where id = p_round_id;

    perform public.maybe_finalise_post(v_round.post_id);
  else
    update public.count_rounds
       set status = 'rejected',
           verified_by = v_user,
           verified_at = now(),
           remarks = p_remarks
     where id = p_round_id;
  end if;

  return jsonb_build_object(
    'id', p_round_id,
    'status', case when p_action = 'verify' then 'verified' else 'rejected' end
  );
end;
$$;

create or replace function public.get_live_results()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_election public.elections%rowtype;
  v_posts jsonb;
begin
  select *
    into v_election
  from public.elections
  order by created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('election', null, 'posts', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(post_row order by display_order, name), '[]'::jsonb)
    into v_posts
  from (
    select
      p.display_order,
      p.name,
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'seats', p.seats,
        'display_order', p.display_order,
        'verified_rounds', (
          select count(*)::int
          from public.count_rounds cr
          where cr.post_id = p.id and cr.status = 'verified'
        ),
        'pending_rounds', (
          select count(*)::int
          from public.count_rounds cr
          where cr.post_id = p.id and cr.status = 'pending_verification'
        ),
        'is_finalised', (
          select count(*) >= v_election.count_limit
          from public.count_rounds cr
          where cr.post_id = p.id and cr.status = 'verified'
        ),
        'total_verified_votes', (
          select coalesce(sum(ce.votes), 0)::int
          from public.count_entries ce
          join public.count_rounds cr on cr.id = ce.round_id
          where cr.post_id = p.id and cr.status = 'verified'
        ),
        'candidates', (
          select coalesce(jsonb_agg(to_jsonb(c) order by c.votes desc, c.name), '[]'::jsonb)
          from (
            select
              cand.id,
              cand.name,
              cand.photo_url,
              cand.panel_name,
              coalesce((
                select sum(ce.votes)::int
                from public.count_entries ce
                join public.count_rounds cr on cr.id = ce.round_id
                where ce.candidate_id = cand.id
                  and cr.status = 'verified'
              ), 0) as votes
            from public.candidates cand
            where cand.post_id = p.id
          ) c
        )
      ) as post_row
    from public.posts p
    where p.election_id = v_election.id
  ) s;

  return jsonb_build_object(
    'election', jsonb_build_object(
      'id', v_election.id,
      'name', v_election.name,
      'date', v_election.date,
      'total_votes_polled', v_election.total_votes_polled,
      'count_limit', v_election.count_limit,
      'state', v_election.state
    ),
    'posts', v_posts
  );
end;
$$;

create or replace function public.reset_election_counts(p_election_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only an admin can reset counts';
  end if;

  delete from public.count_rounds cr
  using public.posts p
  where cr.post_id = p.id
    and p.election_id = p_election_id;

  update public.elections
     set state = 'setup'
   where id = p_election_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.elections enable row level security;
alter table public.posts enable row level security;
alter table public.candidates enable row level security;
alter table public.staff_assignments enable row level security;
alter table public.count_rounds enable row level security;
alter table public.count_entries enable row level security;

-- Profiles
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (
    auth.uid() = id
    or public.is_admin()
    or public.is_supervisor()
  );

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id and role = public.current_role());

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin())
  with check (public.is_admin());

-- Elections / posts / candidates: public read, admin write
drop policy if exists "elections_public_read" on public.elections;
create policy "elections_public_read" on public.elections
  for select using (true);

drop policy if exists "elections_admin_write" on public.elections;
create policy "elections_admin_write" on public.elections
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "posts_public_read" on public.posts;
create policy "posts_public_read" on public.posts
  for select using (true);

drop policy if exists "posts_admin_write" on public.posts;
create policy "posts_admin_write" on public.posts
  for all using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "candidates_public_read" on public.candidates;
create policy "candidates_public_read" on public.candidates
  for select using (true);

drop policy if exists "candidates_admin_write" on public.candidates;
create policy "candidates_admin_write" on public.candidates
  for all using (public.is_admin())
  with check (public.is_admin());

-- Staff assignments
drop policy if exists "assignments_staff_read" on public.staff_assignments;
create policy "assignments_staff_read" on public.staff_assignments
  for select using (
    staff_id = auth.uid()
    or public.is_admin()
    or public.is_supervisor()
  );

drop policy if exists "assignments_admin_write" on public.staff_assignments;
create policy "assignments_admin_write" on public.staff_assignments
  for all using (public.is_admin())
  with check (public.is_admin());

-- Count rounds
drop policy if exists "rounds_select" on public.count_rounds;
create policy "rounds_select" on public.count_rounds
  for select using (
    public.is_admin()
    or public.is_supervisor()
    or staff_id = auth.uid()
    or status = 'verified'
  );

drop policy if exists "rounds_staff_insert" on public.count_rounds;
create policy "rounds_staff_insert" on public.count_rounds
  for insert with check (
    staff_id = auth.uid()
    and public.is_assigned_to_post(post_id)
    and (public.is_staff() or public.is_admin())
  );

drop policy if exists "rounds_staff_update_rejected" on public.count_rounds;
create policy "rounds_staff_update_rejected" on public.count_rounds
  for update using (
    staff_id = auth.uid()
    and public.is_assigned_to_post(post_id)
    and is_finalised = false
  )
  with check (
    staff_id = auth.uid()
    and is_finalised = false
  );

drop policy if exists "rounds_supervisor_update" on public.count_rounds;
create policy "rounds_supervisor_update" on public.count_rounds
  for update using (
    (public.is_supervisor() or public.is_admin())
    and is_finalised = false
  )
  with check (public.is_supervisor() or public.is_admin());

drop policy if exists "rounds_admin_all" on public.count_rounds;
create policy "rounds_admin_all" on public.count_rounds
  for all using (public.is_admin())
  with check (public.is_admin());

-- Count entries
drop policy if exists "entries_select" on public.count_entries;
create policy "entries_select" on public.count_entries
  for select using (
    public.is_admin()
    or public.is_supervisor()
    or exists (
      select 1 from public.count_rounds cr
      where cr.id = round_id
        and (cr.staff_id = auth.uid() or cr.status = 'verified')
    )
  );

drop policy if exists "entries_staff_insert" on public.count_entries;
create policy "entries_staff_insert" on public.count_entries
  for insert with check (
    exists (
      select 1 from public.count_rounds cr
      where cr.id = round_id
        and cr.staff_id = auth.uid()
        and cr.is_finalised = false
        and public.is_assigned_to_post(cr.post_id)
    )
  );

drop policy if exists "entries_staff_delete" on public.count_entries;
create policy "entries_staff_delete" on public.count_entries
  for delete using (
    exists (
      select 1 from public.count_rounds cr
      where cr.id = round_id
        and cr.staff_id = auth.uid()
        and cr.is_finalised = false
        and cr.status = 'rejected'
    )
  );

drop policy if exists "entries_admin_all" on public.count_entries;
create policy "entries_admin_all" on public.count_entries
  for all using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant select on public.elections, public.posts, public.candidates to anon, authenticated;
grant select on public.count_rounds, public.count_entries to anon, authenticated;
grant select on public.profiles, public.staff_assignments to authenticated;
grant insert, update, delete on public.elections, public.posts, public.candidates, public.staff_assignments, public.profiles to authenticated;
grant insert, update, delete on public.count_rounds, public.count_entries to authenticated;

grant execute on function public.current_role() to anon, authenticated;
grant execute on function public.is_admin() to authenticated;
grant execute on function public.is_supervisor() to authenticated;
grant execute on function public.is_staff() to authenticated;
grant execute on function public.is_assigned_to_post(uuid) to authenticated;
grant execute on function public.submit_count_round(uuid, jsonb) to authenticated;
grant execute on function public.review_count_round(uuid, text, text) to authenticated;
grant execute on function public.get_live_results() to anon, authenticated;
grant execute on function public.reset_election_counts(uuid) to authenticated;
grant execute on function public.maybe_finalise_post(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------------
alter table public.count_rounds replica identity full;
alter table public.count_entries replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.count_rounds;
  exception when duplicate_object then
    null;
  end;
  begin
    alter publication supabase_realtime add table public.count_entries;
  exception when duplicate_object then
    null;
  end;
end $$;

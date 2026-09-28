-- Sprint 12C durable guest-AI abuse control.
-- This migration deploys quota infrastructure only. It does not deploy guest AI,
-- set Edge secrets, or enable public guest AI traffic.

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'guest_quota_owner') then
    create role guest_quota_owner noinherit nologin;
  end if;

  if not exists (select 1 from pg_roles where rolname = 'guest_quota_worker') then
    -- Production must set a password through the approved secret workflow before
    -- this role is used by an Edge Function. No password is embedded here.
    create role guest_quota_worker noinherit login;
  end if;
end
$$;

-- Supabase's managed migration executor may not initially be a member of the
-- NOLOGIN owner role. Grant temporary SET ROLE ability for ownership transfer,
-- then revoke it after all objects are owned.
do $$
begin
  execute format('grant guest_quota_owner to %I with set true', current_user);
end
$$;

create schema if not exists guest_abuse;
alter schema guest_abuse owner to guest_quota_owner;
set role guest_quota_owner;

create table if not exists guest_abuse.network_policy (
  policy_id boolean primary key default true check (policy_id),
  network_window_seconds integer not null default 3600 check (network_window_seconds between 300 and 3600),
  network_hard_limit integer not null default 30 check (network_hard_limit between 3 and 1000),
  flow_ttl_seconds integer not null default 604800 check (flow_ttl_seconds between 86400 and 691200),
  updated_at timestamptz not null default now()
);

insert into guest_abuse.network_policy (policy_id)
values (true)
on conflict (policy_id) do nothing;

create table if not exists guest_abuse.flow_budgets (
  flow_fingerprint bytea primary key,
  generation_count smallint not null default 0 check (generation_count between 0 and 3),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists flow_budgets_expires_at_idx
  on guest_abuse.flow_budgets (expires_at);

create table if not exists guest_abuse.network_windows (
  network_fingerprint bytea not null,
  window_start timestamptz not null,
  reservation_count integer not null default 0 check (reservation_count >= 0),
  expires_at timestamptz not null,
  primary key (network_fingerprint, window_start)
);

create index if not exists network_windows_expires_at_idx
  on guest_abuse.network_windows (expires_at);

create or replace function guest_abuse.consume_guest_generation(
  p_flow_fingerprint bytea,
  p_network_fingerprint bytea
)
returns table (
  allowed boolean,
  result_code text,
  remaining_generations smallint
)
language plpgsql
security definer
set search_path = pg_catalog, guest_abuse
as $$
declare
  v_now timestamptz := now();
  v_flow_inserted integer := 0;
  v_network_inserted integer := 0;
  v_generation_count smallint;
  v_network_count integer;
  v_flow_expires_at timestamptz;
  v_network_window_start timestamptz;
  v_network_expires_at timestamptz;
  v_window_seconds integer;
  v_network_limit integer;
  v_flow_ttl_seconds integer;
begin
  if octet_length(p_flow_fingerprint) <> 32
     or octet_length(p_network_fingerprint) <> 32 then
    return query select false, 'invalid_fingerprint'::text, 0::smallint;
    return;
  end if;

  select
    network_window_seconds,
    network_hard_limit,
    flow_ttl_seconds
  into
    v_window_seconds,
    v_network_limit,
    v_flow_ttl_seconds
  from guest_abuse.network_policy
  where policy_id = true
  for share;

  if v_window_seconds is null then
    return query select false, 'quota_unavailable'::text, 0::smallint;
    return;
  end if;

  -- Flow row locking is always acquired before network row locking.
  insert into guest_abuse.flow_budgets (
    flow_fingerprint,
    expires_at
  )
  values (
    p_flow_fingerprint,
    v_now + make_interval(secs => v_flow_ttl_seconds)
  )
  on conflict (flow_fingerprint) do nothing;

  get diagnostics v_flow_inserted = row_count;

  select
    generation_count,
    expires_at
  into
    v_generation_count,
    v_flow_expires_at
  from guest_abuse.flow_budgets
  where flow_fingerprint = p_flow_fingerprint
  for update;

  if v_flow_expires_at <= v_now then
    return query select false, 'flow_expired'::text, 0::smallint;
    return;
  end if;

  if v_generation_count >= 3 then
    return query select false, 'flow_exhausted'::text, 0::smallint;
    return;
  end if;

  v_network_window_start := to_timestamp(
    floor(extract(epoch from v_now) / v_window_seconds) * v_window_seconds
  );
  v_network_expires_at := v_network_window_start + make_interval(secs => v_window_seconds);

  insert into guest_abuse.network_windows (
    network_fingerprint,
    window_start,
    expires_at
  )
  values (
    p_network_fingerprint,
    v_network_window_start,
    v_network_expires_at
  )
  on conflict (network_fingerprint, window_start) do nothing;

  get diagnostics v_network_inserted = row_count;

  select reservation_count
  into v_network_count
  from guest_abuse.network_windows
  where network_fingerprint = p_network_fingerprint
    and window_start = v_network_window_start
  for update;

  if v_network_count >= v_network_limit then
    if v_network_inserted = 1 then
      delete from guest_abuse.network_windows
      where network_fingerprint = p_network_fingerprint
        and window_start = v_network_window_start;
    end if;

    return query select false, 'network_rate_limited'::text, 0::smallint;
    return;
  end if;

  update guest_abuse.flow_budgets
  set generation_count = generation_count + 1,
      last_seen_at = v_now
  where flow_fingerprint = p_flow_fingerprint;

  update guest_abuse.network_windows
  set reservation_count = reservation_count + 1
  where network_fingerprint = p_network_fingerprint
    and window_start = v_network_window_start;

  return query select
    true,
    'reserved'::text,
    (2 - v_generation_count)::smallint;
end;
$$;

alter table guest_abuse.network_policy enable row level security;
alter table guest_abuse.flow_budgets enable row level security;
alter table guest_abuse.network_windows enable row level security;

reset role;

revoke all on schema guest_abuse from public, anon, authenticated, service_role;
revoke all on all tables in schema guest_abuse from public, anon, authenticated, service_role, guest_quota_worker;
revoke all on all sequences in schema guest_abuse from public, anon, authenticated, service_role, guest_quota_worker;
revoke all on function guest_abuse.consume_guest_generation(bytea, bytea) from public, anon, authenticated, service_role;

grant usage on schema guest_abuse to guest_quota_worker;
grant execute on function guest_abuse.consume_guest_generation(bytea, bytea) to guest_quota_worker;

set role guest_quota_owner;
alter default privileges for role guest_quota_owner in schema guest_abuse
  revoke all on tables from public, anon, authenticated, service_role, guest_quota_worker;
alter default privileges for role guest_quota_owner in schema guest_abuse
  revoke all on sequences from public, anon, authenticated, service_role, guest_quota_worker;
alter default privileges for role guest_quota_owner in schema guest_abuse
  revoke execute on functions from public, anon, authenticated, service_role;
reset role;

do $$
begin
  execute format('revoke guest_quota_owner from %I', current_user);
end
$$;

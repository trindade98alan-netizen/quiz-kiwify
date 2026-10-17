create table if not exists public.vsd_measurement_events (
 id uuid primary key,
 visit uuid not null,
 event text not null,
 data jsonb not null default '{}',
 attribution jsonb not null default '{}',
 user_id uuid,
 internal boolean not null default false,
 created_at timestamptz not null default now()
);
create index if not exists vsd_measurement_created on public.vsd_measurement_events(created_at);
create index if not exists vsd_measurement_visit on public.vsd_measurement_events(visit,created_at);
alter table public.vsd_measurement_events enable row level security;
revoke all on public.vsd_measurement_events from public;

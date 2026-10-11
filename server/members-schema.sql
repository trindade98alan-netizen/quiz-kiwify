create table if not exists public.vsd_purchases (
  order_id text primary key,
  product_id text not null,
  email text not null check (email=lower(trim(email))),
  active boolean not null default false,
  source_event_at timestamptz not null,
  updated_at timestamptz not null default now()
);
create index if not exists vsd_access_lookup on public.vsd_purchases(email,product_id) where active;
create table if not exists public.vsd_progress (
  user_id uuid primary key,
  completed text[] not null default '{}',
  updated_at timestamptz not null default now(),
  check(completed <@ array['aula','sistema','parcelado','anti','som']::text[])
);
create table if not exists public.vsd_materials (
  id text primary key check (id in ('parcelado','anti','som')),
  filename text not null,
  pdf bytea not null check(octet_length(pdf)<5242880)
);
-- Browser roles must never read purchases, progress or paid files directly.
alter table public.vsd_purchases enable row level security;
alter table public.vsd_progress enable row level security;
alter table public.vsd_materials enable row level security;
revoke all on public.vsd_purchases,public.vsd_progress,public.vsd_materials from public;
create table if not exists public.vsd_webhook_receipts (
  digest text primary key,
  shape jsonb not null,
  header_names text[] not null,
  received_at timestamptz not null default now()
);
alter table public.vsd_webhook_receipts enable row level security;
revoke all on public.vsd_webhook_receipts from public;

create table if not exists xau_snapshots (
  id serial primary key,
  scanned_at timestamptz not null default now(),
  source text not null,
  window_minutes integer not null default 15,
  buy_count integer not null default 0,
  sell_count integer not null default 0,
  exit_count integer not null default 0,
  tp_count integer not null default 0,
  total_posts integer not null default 0,
  gold_price numeric,
  bias text not null default 'neutral',
  summary text,
  posts_json jsonb not null default '[]',
  tps_json jsonb not null default '[]'
);

create index if not exists xau_snapshots_scanned_at_idx
  on xau_snapshots (scanned_at desc);

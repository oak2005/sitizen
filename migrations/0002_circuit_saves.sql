-- Per-user Grand Circuit saves + finished-game history.
-- user_id is TEXT (Better Auth ids). Never trust a client-sent user id.
create table if not exists circuit_saves (
  id          serial primary key,
  user_id     text not null,
  status      text not null check (status in ('active', 'finished')),
  state       jsonb not null,
  winner_id   text,
  you_won     boolean,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists circuit_saves_user_status_idx
  on circuit_saves (user_id, status, updated_at desc);

-- At most one in-progress game per account.
create unique index if not exists circuit_saves_one_active_per_user
  on circuit_saves (user_id)
  where status = 'active';

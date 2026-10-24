-- Notificaciones de bajas de cuenta (Disp. 954/2025)
create table if not exists account_deletions (
  id uuid primary key default gen_random_uuid(),
  deleted_user_name text not null,
  deleted_user_role text not null check (deleted_user_role in ('coach', 'athlete')),
  notify_user_id uuid not null references auth.users(id) on delete cascade,
  seen_at timestamptz,
  deleted_at timestamptz not null default now()
);

alter table account_deletions enable row level security;

create policy "Users see their own deletion notifications"
  on account_deletions for select
  using (auth.uid() = notify_user_id);

create policy "Users can mark notifications as seen"
  on account_deletions for update
  using (auth.uid() = notify_user_id)
  with check (auth.uid() = notify_user_id);

create table bookmarks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  url text not null,
  note text not null,
  summary text,
  tags text[],
  created_at timestamp with time zone default now()
);
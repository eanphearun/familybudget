-- Family Budget — Supabase schema
-- Run this once in your Supabase project: Dashboard → SQL Editor → New query → paste → Run

create table if not exists accounts (
  id text primary key,
  name text not null,
  sort_order int default 0
);

create table if not exists categories (
  id bigint generated always as identity primary key,
  name text not null,
  type text not null check (type in ('income','expense')),
  sort_order int default 0
);

create table if not exists transactions (
  id bigint generated always as identity primary key,
  date date not null default current_date,
  type text not null check (type in ('income','expense')),
  amount numeric not null check (amount > 0),
  account_id text references accounts(id),
  category text not null,
  note text,
  added_by text,
  created_at timestamptz default now()
);

-- Seed accounts
insert into accounts (id, name, sort_order) values
  ('checking','Checking',1),
  ('savings','Savings',2),
  ('aba','ABA',3),
  ('acleda-ol','ACLEDA - Oun Ly',4),
  ('sathapana','Sathapana',5),
  ('acleda-ph','ACLEDA - Phearun',6),
  ('cash','Cash',7),
  ('aeon','AEON Credit Card',8),
  ('ftb','FTB',9)
on conflict (id) do nothing;

-- Seed categories
insert into categories (name, type, sort_order) values
  ('Bird''s Nest Commission','income',1),
  ('Salary - Phearun','income',2),
  ('Salary - Oun Ly','income',3),
  ('Parent''s Care','expense',1),
  ('Children''s Care','expense',2),
  ('Debt / Home / Car Installment','expense',3),
  ('Monthly Food','expense',4),
  ('Car / Motor Gasoline','expense',5),
  ('Car Fuel Maintenance','expense',6),
  ('Car Cleaning','expense',7),
  ('Util. Electricity','expense',8),
  ('Util. Gas','expense',9),
  ('Util. Phone(s)','expense',10),
  ('Util. TV / Internet','expense',11),
  ('Util. Water','expense',12),
  ('Home Security','expense',13),
  ('Waste Payment','expense',14),
  ('TongTing','expense',15),
  ('Other / Misc','expense',16)
on conflict do nothing;

-- Row Level Security
-- MVP setting: anyone with your Supabase URL + anon key can read/write.
-- That's fine for a private family app whose URL isn't shared publicly, but
-- it is NOT per-user access control. See README "Security note" before
-- treating this as anything more than a family MVP.
alter table accounts enable row level security;
alter table categories enable row level security;
alter table transactions enable row level security;

create policy "public read accounts" on accounts for select using (true);
create policy "public read categories" on categories for select using (true);
create policy "public read transactions" on transactions for select using (true);
create policy "public insert transactions" on transactions for insert with check (true);
create policy "public delete transactions" on transactions for delete using (true);

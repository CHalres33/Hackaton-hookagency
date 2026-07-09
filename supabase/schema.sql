-- Madeleine — CRM simulé (Supabase)
-- Exécuter via SQL editor ou mcp apply_migration

create table if not exists accounts (
  id bigint generated always as identity primary key,
  name text not null,
  domain text unique not null,
  linkedin_url text,
  logo_url text,
  tier int default 2 check (tier between 1 and 3),
  created_at timestamptz default now()
);

create table if not exists contacts (
  id bigint generated always as identity primary key,
  account_id bigint references accounts(id),
  firstname text not null,
  lastname text not null,
  job_title text,
  linkedin_url text,
  city text,
  country text,
  email text,
  email_status text default 'pending' check (email_status in ('pending','found','failed')),
  phone text,
  phone_status text default 'pending' check (phone_status in ('pending','found','failed')),
  postal_address text,
  address_status text default 'pending' check (address_status in ('pending','found','failed')),
  enrichment_confidence real,
  photo_url text,
  created_at timestamptz default now()
);

create table if not exists signals (
  id bigint generated always as identity primary key,
  type text not null,           -- job_change | promotion | hiring_intent | keyword | fundraise | champion_move | manual
  source text not null default 'sillage',
  payload jsonb not null default '{}',   -- payload.sillage_id pour dédup
  score int check (score between 0 and 100),
  confidence real,
  rarity text generated always as (case when score >= 85 then 'legendaire' when score >= 60 then 'rare' else 'commun' end) stored,
  account_id bigint references accounts(id),
  contact_id bigint references contacts(id),
  status text default 'new' check (status in ('new','processing','treated','ignored')),
  created_at timestamptz default now()
);

create table if not exists passions (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts(id) not null,
  category text not null,       -- musique | sport | tech | food | voyage | cause | autre
  value text not null,
  proof text,                   -- citation exacte
  source_url text,
  source_context text default 'pro_public' check (source_context in ('pro_public','hors_pro','prive')),
  date_source date,
  confidence real,
  giftability real,
  creep_safety text,            -- raisonnement affiché dans la file de validation
  discovered_at timestamptz default now()
);

create table if not exists relationship_events (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts(id) not null,
  source text not null check (source in ('gmail','linkedin','crm')),
  direction text check (direction in ('inbound','outbound')),
  occurred_at timestamptz not null,
  weight real default 1,
  payload jsonb default '{}'
);

create table if not exists relationships (
  contact_id bigint primary key references contacts(id),
  warmth int default 0 check (warmth between 0 and 100),
  level text default 'inconnu' check (level in ('inconnu','contact','connexion','champion','ambassadeur')),
  xp int default 0,
  updated_at timestamptz default now()
);

create table if not exists actions (
  id bigint generated always as identity primary key,
  signal_id bigint references signals(id),
  contact_id bigint references contacts(id) not null,
  channel text not null check (channel in ('email','linkedin','carte_manuscrite','cadeau','cadeau_legendaire')),
  gift_name text,
  gift_url text,
  gift_price_eur real,
  passion_id bigint references passions(id),
  message text not null,
  justification text not null,  -- ce que le juge lit : signal x chaleur x passion x coût
  cost_estimate_eur real,
  status text default 'proposed' check (status in ('proposed','approved','rejected','sent')),
  handwrytten_order_id text,
  created_at timestamptz default now()
);

create table if not exists game_state (
  id int primary key default 1,
  team_xp int default 0,
  streak int default 0,
  badges jsonb default '[]',
  updated_at timestamptz default now()
);
insert into game_state (id) values (1) on conflict do nothing;

-- Realtime sur le fil d'actualité et la file de validation
alter publication supabase_realtime add table signals;
alter publication supabase_realtime add table actions;

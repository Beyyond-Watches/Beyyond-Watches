create table if not exists customers (
  id text primary key,
  phone text not null unique,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token_hash text primary key,
  kind text not null check (kind in ('customer', 'admin')),
  customer_id text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists sessions_customer_idx on sessions (customer_id);

create table if not exists otp_codes (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  sent_at timestamptz not null default now(),
  sends int not null default 1
);

create table if not exists products (
  id text primary key,
  slug text not null unique,
  name text not null,
  tagline text not null default '',
  description text not null default '',
  price_paise integer not null check (price_paise > 0),
  category text not null check (category in ('everyday', 'luxury')),
  movement text not null,
  case_mm integer not null,
  stock integer not null default 0 check (stock >= 0),
  image text not null,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists coupons (
  code text primary key,
  kind text not null check (kind in ('percent', 'flat')),
  amount integer not null check (amount > 0),
  min_paise integer not null default 0,
  category text check (category in ('everyday', 'luxury')),
  active boolean not null default true,
  note text not null default ''
);

create table if not exists orders (
  id text primary key,
  customer_id text not null references customers (id),
  status text not null check (status in ('placed', 'packed', 'shipped', 'delivered', 'declined')),
  subtotal_paise integer not null,
  discount_paise integer not null,
  shipping_paise integer not null,
  total_paise integer not null,
  coupon_code text,
  upi_ref text not null default '',
  address_json text not null,
  items_json text not null,
  created_at timestamptz not null default now()
);

create index if not exists orders_customer_idx on orders (customer_id);
create index if not exists orders_created_idx on orders (created_at desc);

insert into products (id, slug, name, tagline, description, price_paise, category, movement, case_mm, stock, image, featured) values
('prd_aurum', 'aurum-chronograph', 'Aurum Chronograph', 'Gold-tone, for evenings that run long.', 'Three-register chronograph in a 42mm gold-tone case. Black lacquer dial, sapphire crystal, and a bracelet that sits quieter than it looks. Serviced in India.', 18400000, 'luxury', 'Automatic', 42, 5, '/watches/aurum.jpg', true),
('prd_nocturne', 'nocturne-skeleton', 'Nocturne Skeleton', 'Openworked, and in no hurry.', 'A 41mm skeleton automatic. Midnight-blue bridges, a visible balance, and a polished case. The most mechanical thing in the room.', 24600000, 'luxury', 'Automatic', 41, 3, '/watches/nocturne.jpg', true),
('prd_meridian', 'meridian-gmt', 'Meridian GMT', 'Two cities, one wrist.', '40mm GMT in two-tone steel and gold. Cream dial and a traveller hand that does not shout. For people who keep odd hours in another time zone.', 12850000, 'luxury', 'Automatic', 40, 6, '/watches/meridian.jpg', false),
('prd_obsidian', 'obsidian-diver', 'Obsidian Diver', 'Black, and built for water.', '42mm diver with a black ceramic bezel, luminous plots, and a steel bracelet. Rated to 200 metres, worn just as often on land.', 9600000, 'luxury', 'Automatic', 42, 7, '/watches/obsidian.jpg', false),
('prd_pearl', 'pearl-dress', 'Pearl Dress', 'The quiet one.', '36mm dress watch. Ivory lacquer dial, dauphine hands, slim silver bracelet. Easy to forget until someone asks what it is.', 7450000, 'luxury', 'Quartz', 36, 8, '/watches/pearl.jpg', false),
('prd_city', 'city-automatic', 'City Automatic', 'Steel for a workday.', '40mm automatic in brushed steel. Charcoal sunburst dial, a date, and nothing you have to explain at the office.', 1890000, 'everyday', 'Automatic', 40, 18, '/watches/city.jpg', true),
('prd_field', 'field-khaki', 'Field Khaki', 'Numerals you can read at a glance.', '39mm field watch. Matte khaki dial, Arabic numerals, sword hands, and a leather strap that looks better once it is scuffed.', 1240000, 'everyday', 'Quartz', 39, 22, '/watches/field.jpg', false),
('prd_coastal', 'coastal-blue', 'Coastal Blue', 'A blue dial, nothing extra.', '40mm steel with a blue sunburst dial and stick markers. An everyday automatic that stays bright without dressing up.', 980000, 'everyday', 'Automatic', 40, 20, '/watches/coastal.jpg', false),
('prd_pilot', 'heritage-pilot', 'Heritage Pilot', 'A triangle at twelve.', '42mm pilot. Matte black dial, a large triangle at 12, cathedral hands, and a strap you can change yourself.', 2280000, 'everyday', 'Automatic', 42, 12, '/watches/pilot.jpg', true),
('prd_metro', 'metro-quartz', 'Metro Quartz', 'Straightforward, and thin.', '38mm quartz. White dial, black leaf hands, black leather strap. The normal watch — thin enough for a shirt cuff.', 675000, 'everyday', 'Quartz', 38, 30, '/watches/metro.jpg', false)
on conflict (id) do nothing;

insert into coupons (code, kind, amount, min_paise, category, active, note) values
('BEYYOND10', 'percent', 10, 0, null, true, '10% off the whole cart'),
('WELCOME500', 'flat', 50000, 500000, null, true, '₹500 off orders over ₹5,000'),
('LUXE15', 'percent', 15, 2000000, 'luxury', true, '15% off luxury pieces over ₹20,000')
on conflict (code) do nothing;

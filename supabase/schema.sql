create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;

do $$ begin
  create type public.app_role as enum ('admin', 'seller', 'user');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.vendor_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.order_status as enum ('ORDER_PLACED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.payment_method as enum ('COD', 'STRIPE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.cashback_status as enum ('pending', 'approved', 'paid', 'rejected');
exception
  when duplicate_object then null;
end $$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  role public.app_role not null default 'user',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  name text not null,
  username citext not null unique,
  description text not null,
  email text not null,
  contact text not null,
  address text not null,
  logo_url text,
  status public.vendor_status not null default 'pending',
  is_active boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  name text not null,
  description text not null,
  mrp numeric(10,2) not null check (mrp >= 0),
  price numeric(10,2) not null check (price >= 0 and price <= mrp),
  category text not null,
  images jsonb not null default '[]'::jsonb,
  in_stock boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete restrict,
  total numeric(10,2) not null check (total >= 0),
  status public.order_status not null default 'ORDER_PLACED',
  payment_method public.payment_method not null,
  shipping_address jsonb not null,
  is_paid boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete restrict,
  quantity integer not null check (quantity > 0),
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  unique (order_id, product_id)
);

create table if not exists public.cashback_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(10,2) not null check (amount >= 0),
  status public.cashback_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_vendors_user_id on public.vendors(user_id);
create index if not exists idx_products_vendor_id on public.products(vendor_id);
create index if not exists idx_orders_user_id on public.orders(user_id);
create index if not exists idx_orders_vendor_id on public.orders(vendor_id);
create index if not exists idx_order_items_order_id on public.order_items(order_id);
create index if not exists idx_cashback_records_user_id on public.cashback_records(user_id);

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_vendors_updated_at on public.vendors;
create trigger set_vendors_updated_at
before update on public.vendors
for each row execute function public.set_updated_at();

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists set_orders_updated_at on public.orders;
create trigger set_orders_updated_at
before update on public.orders
for each row execute function public.set_updated_at();

drop trigger if exists set_cashback_records_updated_at on public.cashback_records;
create trigger set_cashback_records_updated_at
before update on public.cashback_records
for each row execute function public.set_updated_at();

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_auth_user_created();

create or replace function public.handle_auth_user_updated()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.users
  set email = new.email,
      updated_at = timezone('utc', now())
  where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
after update on auth.users
for each row execute function public.handle_auth_user_updated();

create or replace function private.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((
    select role
    from public.users
    where id = (select auth.uid())
  ), 'user'::public.app_role);
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select private.current_role()) = 'admin'::public.app_role;
$$;

create or replace function private.is_vendor_owner(target_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.vendors
    where id = target_vendor_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function private.can_manage_vendor(target_vendor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select private.is_admin()) or exists (
    select 1
    from public.vendors
    where id = target_vendor_id
      and user_id = (select auth.uid())
      and status = 'approved'::public.vendor_status
      and is_active = true
  );
$$;

create or replace function private.can_view_order(target_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (select private.is_admin()) or exists (
    select 1
    from public.orders
    where id = target_order_id
      and (
        user_id = (select auth.uid())
        or vendor_id in (
          select id
          from public.vendors
          where user_id = (select auth.uid())
        )
      )
  );
$$;

create or replace function public.prevent_user_role_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Allow service_role (server-side admin operations) to change roles freely.
  if auth.role() = 'service_role' then
    return new;
  end if;

  if old.role is distinct from new.role and not private.is_admin() then
    raise exception 'Only admins can change roles.';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_user_role_changes on public.users;
create trigger protect_user_role_changes
before update on public.users
for each row execute function public.prevent_user_role_changes();

create or replace function public.prevent_vendor_self_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not private.is_admin() then
    if old.status is distinct from new.status or old.is_active is distinct from new.is_active then
      raise exception 'Only admins can approve or activate vendors.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_vendor_approval on public.vendors;
create trigger protect_vendor_approval
before update on public.vendors
for each row execute function public.prevent_vendor_self_approval();

create or replace function public.prevent_seller_order_rewrites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if private.is_admin() then
    return new;
  end if;

  if private.is_vendor_owner(old.vendor_id) then
    if row(new.user_id, new.vendor_id, new.total, new.payment_method, new.shipping_address, new.is_paid, new.created_at)
       is distinct from row(old.user_id, old.vendor_id, old.total, old.payment_method, old.shipping_address, old.is_paid, old.created_at) then
      raise exception 'Sellers can only update order status.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_order_rewrites on public.orders;
create trigger protect_order_rewrites
before update on public.orders
for each row execute function public.prevent_seller_order_rewrites();

alter table public.users enable row level security;
alter table public.vendors enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.cashback_records enable row level security;

create policy "users_select_own"
on public.users
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = id);

create policy "users_admin_all"
on public.users
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "vendors_select_public_or_owner"
on public.vendors
for select
to authenticated, anon
using (
  ((status = 'approved'::public.vendor_status) and is_active = true)
  or user_id = (select auth.uid())
  or (select private.is_admin())
);

create policy "vendors_insert_own"
on public.vendors
for insert
to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "vendors_update_own"
on public.vendors
for update
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()))
with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "vendors_delete_admin"
on public.vendors
for delete
to authenticated
using ((select private.is_admin()));

create policy "products_select_public"
on public.products
for select
to authenticated, anon
using (
  vendor_id in (
    select id
    from public.vendors
    where status = 'approved'::public.vendor_status
      and is_active = true
  )
);

create policy "products_manage_vendor"
on public.products
for all
to authenticated
using ((select private.can_manage_vendor(vendor_id)))
with check ((select private.can_manage_vendor(vendor_id)));

create policy "orders_insert_own"
on public.orders
for insert
to authenticated
with check ((select auth.uid()) is not null and user_id = (select auth.uid()));

create policy "orders_select_related"
on public.orders
for select
to authenticated
using (
  user_id = (select auth.uid())
  or vendor_id in (
    select id
    from public.vendors
    where user_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy "orders_update_seller_or_admin"
on public.orders
for update
to authenticated
using (
  vendor_id in (
    select id
    from public.vendors
    where user_id = (select auth.uid())
  )
  or (select private.is_admin())
)
with check (
  vendor_id in (
    select id
    from public.vendors
    where user_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy "orders_delete_admin"
on public.orders
for delete
to authenticated
using ((select private.is_admin()));

create policy "order_items_select_related"
on public.order_items
for select
to authenticated
using ((select private.can_view_order(order_id)));

create policy "order_items_insert_related_order"
on public.order_items
for insert
to authenticated
with check (
  order_id in (
    select id
    from public.orders
    where user_id = (select auth.uid())
  )
  or (select private.is_admin())
);

create policy "order_items_update_admin"
on public.order_items
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "order_items_delete_admin"
on public.order_items
for delete
to authenticated
using ((select private.is_admin()));

create policy "cashback_select_own_or_admin"
on public.cashback_records
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "cashback_admin_all"
on public.cashback_records
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

do $$ begin
  alter type public.app_role add value if not exists 'vendor';
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.wallet_txn_status as enum ('pending', 'available', 'withdrawn', 'reversed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.wallet_txn_type as enum ('cashback', 'commission', 'settlement', 'withdrawal', 'adjustment');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type public.dispute_status as enum ('open', 'in_review', 'resolved', 'rejected');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  pending_balance numeric(12,2) not null default 0 check (pending_balance >= 0),
  available_balance numeric(12,2) not null default 0 check (available_balance >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.cashback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  status public.wallet_txn_status not null default 'pending',
  reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  gross_amount numeric(12,2) not null check (gross_amount >= 0),
  commission_amount numeric(12,2) not null check (commission_amount >= 0),
  settlement_amount numeric(12,2) not null check (settlement_amount >= 0),
  status public.wallet_txn_status not null default 'pending',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  amount numeric(12,2) not null check (amount >= 0),
  txn_type public.wallet_txn_type not null,
  status public.wallet_txn_status not null default 'pending',
  description text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (user_id is not null or vendor_id is not null)
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug citext not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  redirect_url text,
  is_active boolean not null default true,
  priority integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  campaign_type text not null,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.dispute_tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  issue text not null,
  status public.dispute_status not null default 'open',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  actor_role public.app_role,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  rating numeric(2,1) not null check (rating >= 1 and rating <= 5),
  review text,
  is_moderated boolean not null default false,
  moderation_status text not null default 'visible',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (product_id, user_id, order_id)
);

create table if not exists public.moderation_logs (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  admin_id uuid not null references public.users(id) on delete cascade,
  action text not null,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.fraud_flags (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  user_id uuid references public.users(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  reason text not null,
  severity text not null default 'medium',
  is_resolved boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.sponsored_listings (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  budget numeric(12,2) not null check (budget >= 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code citext not null unique,
  description text not null,
  discount numeric(5,2) not null check (discount > 0 and discount <= 100),
  for_new_user boolean not null default false,
  for_member boolean not null default false,
  is_public boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.orders add column if not exists no_return_confirmed boolean not null default false;
alter table public.vendors add column if not exists gst_number text;
alter table public.vendors add column if not exists bank_account_name text;
alter table public.vendors add column if not exists bank_account_number text;
alter table public.vendors add column if not exists ifsc_code text;
alter table public.vendors add column if not exists selected_categories jsonb not null default '[]'::jsonb;
alter table public.vendors add column if not exists restricted_category_approved boolean not null default false;
alter table public.products add column if not exists cashback_rate numeric(5,2) not null default 8 check (cashback_rate >= 0);
alter table public.products add column if not exists coupon_enabled boolean not null default false;
alter table public.products add column if not exists coupon_code text;
alter table public.products add column if not exists sponsored boolean not null default false;

create index if not exists idx_wallets_user_id on public.wallets(user_id);
create index if not exists idx_cashback_user_id on public.cashback(user_id);
create index if not exists idx_commissions_vendor_id on public.commissions(vendor_id);
create index if not exists idx_transactions_user_id on public.transactions(user_id);
create index if not exists idx_transactions_vendor_id on public.transactions(vendor_id);
create index if not exists idx_transactions_order_id on public.transactions(order_id);

drop trigger if exists set_wallets_updated_at on public.wallets;
create trigger set_wallets_updated_at
before update on public.wallets
for each row execute function public.set_updated_at();

drop trigger if exists set_cashback_updated_at on public.cashback;
create trigger set_cashback_updated_at
before update on public.cashback
for each row execute function public.set_updated_at();

drop trigger if exists set_commissions_updated_at on public.commissions;
create trigger set_commissions_updated_at
before update on public.commissions
for each row execute function public.set_updated_at();

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_categories_updated_at on public.categories;
create trigger set_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists set_banners_updated_at on public.banners;
create trigger set_banners_updated_at
before update on public.banners
for each row execute function public.set_updated_at();

drop trigger if exists set_campaigns_updated_at on public.campaigns;
create trigger set_campaigns_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

drop trigger if exists set_dispute_tickets_updated_at on public.dispute_tickets;
create trigger set_dispute_tickets_updated_at
before update on public.dispute_tickets
for each row execute function public.set_updated_at();

drop trigger if exists set_reviews_updated_at on public.reviews;
create trigger set_reviews_updated_at
before update on public.reviews
for each row execute function public.set_updated_at();

drop trigger if exists set_fraud_flags_updated_at on public.fraud_flags;
create trigger set_fraud_flags_updated_at
before update on public.fraud_flags
for each row execute function public.set_updated_at();

drop trigger if exists set_sponsored_listings_updated_at on public.sponsored_listings;
create trigger set_sponsored_listings_updated_at
before update on public.sponsored_listings
for each row execute function public.set_updated_at();

create or replace function public.release_order_financials(target_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
begin
  select * into v_order from public.orders where id = target_order_id;

  if v_order.id is null then
    raise exception 'Order not found';
  end if;

  if v_order.status <> 'DELIVERED'::public.order_status and v_order.no_return_confirmed = false then
    raise exception 'Order must be delivered/no-return confirmed before funds are available';
  end if;

  update public.cashback
  set status = 'available'::public.wallet_txn_status,
      updated_at = timezone('utc', now())
  where order_id = target_order_id
    and status = 'pending'::public.wallet_txn_status;

  update public.commissions
  set status = 'available'::public.wallet_txn_status,
      updated_at = timezone('utc', now())
  where order_id = target_order_id
    and status = 'pending'::public.wallet_txn_status;

  update public.transactions
  set status = 'available'::public.wallet_txn_status,
      updated_at = timezone('utc', now())
  where order_id = target_order_id
    and status = 'pending'::public.wallet_txn_status;

  update public.wallets w
  set pending_balance = greatest(0, w.pending_balance - t.amount),
      available_balance = w.available_balance + t.amount,
      updated_at = timezone('utc', now())
  from public.transactions t
  where t.order_id = target_order_id
    and t.user_id = w.user_id
    and t.status = 'available'::public.wallet_txn_status
    and t.txn_type = 'cashback'::public.wallet_txn_type;
end;
$$;

create or replace function public.handle_order_financial_state_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'DELIVERED'::public.order_status or new.no_return_confirmed = true then
    perform public.release_order_financials(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists trigger_order_financial_state_change on public.orders;
create trigger trigger_order_financial_state_change
after update of status, no_return_confirmed on public.orders
for each row execute function public.handle_order_financial_state_change();

alter table public.wallets enable row level security;
alter table public.cashback enable row level security;
alter table public.commissions enable row level security;
alter table public.transactions enable row level security;
alter table public.categories enable row level security;
alter table public.banners enable row level security;
alter table public.campaigns enable row level security;
alter table public.dispute_tickets enable row level security;
alter table public.audit_logs enable row level security;
alter table public.reviews enable row level security;
alter table public.moderation_logs enable row level security;
alter table public.fraud_flags enable row level security;
alter table public.sponsored_listings enable row level security;
alter table public.coupons enable row level security;

drop trigger if exists set_coupons_updated_at on public.coupons;
create trigger set_coupons_updated_at
before update on public.coupons
for each row execute function public.set_updated_at();

create policy "wallets_select_own_or_admin"
on public.wallets
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "wallets_admin_all"
on public.wallets
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "wallets_upsert_own"
on public.wallets
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "wallets_update_own"
on public.wallets
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "cashback_select_own_or_admin_v2"
on public.cashback
for select
to authenticated
using (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "cashback_admin_all_v2"
on public.cashback
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "cashback_insert_own_pending"
on public.cashback
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'::public.wallet_txn_status
);

create policy "commissions_select_vendor_or_admin"
on public.commissions
for select
to authenticated
using (
  vendor_id in (select id from public.vendors where user_id = (select auth.uid()))
  or (select private.is_admin())
);

create policy "commissions_admin_all"
on public.commissions
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "transactions_select_related"
on public.transactions
for select
to authenticated
using (
  user_id = (select auth.uid())
  or vendor_id in (select id from public.vendors where user_id = (select auth.uid()))
  or (select private.is_admin())
);

create policy "transactions_admin_all"
on public.transactions
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "transactions_insert_own_cashback"
on public.transactions
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and txn_type = 'cashback'::public.wallet_txn_type
  and status = 'pending'::public.wallet_txn_status
);

create policy "transactions_insert_vendor_pending"
on public.transactions
for insert
to authenticated
with check (
  vendor_id in (select id from public.vendors where user_id = (select auth.uid()))
  and txn_type = 'settlement'::public.wallet_txn_type
  and status = 'pending'::public.wallet_txn_status
);

create policy "categories_public_read"
on public.categories
for select
to authenticated, anon
using (is_active = true or (select private.is_admin()));

create policy "categories_admin_all"
on public.categories
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "banners_public_read"
on public.banners
for select
to authenticated, anon
using (is_active = true or (select private.is_admin()));

create policy "banners_admin_all"
on public.banners
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "campaigns_public_read"
on public.campaigns
for select
to authenticated, anon
using (is_active = true or (select private.is_admin()));

create policy "campaigns_admin_all"
on public.campaigns
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "disputes_select_related"
on public.dispute_tickets
for select
to authenticated
using (
  user_id = (select auth.uid())
  or vendor_id in (select id from public.vendors where user_id = (select auth.uid()))
  or (select private.is_admin())
);

create policy "disputes_insert_user"
on public.dispute_tickets
for insert
to authenticated
with check (user_id = (select auth.uid()) or (select private.is_admin()));

create policy "disputes_update_admin"
on public.dispute_tickets
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "audit_logs_admin_read"
on public.audit_logs
for select
to authenticated
using ((select private.is_admin()));

create policy "audit_logs_insert_admin"
on public.audit_logs
for insert
to authenticated
with check ((select private.is_admin()));

create policy "reviews_select_public"
on public.reviews
for select
to authenticated, anon
using (moderation_status = 'visible' or (select private.is_admin()));

create policy "reviews_insert_verified_buyer"
on public.reviews
for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1
    from public.order_items oi
    join public.orders o on o.id = oi.order_id
    where oi.product_id = reviews.product_id
      and o.id = reviews.order_id
      and o.user_id = (select auth.uid())
      and o.status = 'DELIVERED'::public.order_status
  )
);

create policy "reviews_update_admin"
on public.reviews
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "moderation_logs_admin_all"
on public.moderation_logs
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "fraud_flags_admin_all"
on public.fraud_flags
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "sponsored_listings_select_public"
on public.sponsored_listings
for select
to authenticated, anon
using (is_active = true or (select private.is_admin()));

create policy "sponsored_listings_vendor_manage"
on public.sponsored_listings
for all
to authenticated
using (
  vendor_id in (select id from public.vendors where user_id = (select auth.uid()))
  or (select private.is_admin())
)
with check (
  vendor_id in (select id from public.vendors where user_id = (select auth.uid()))
  or (select private.is_admin())
);

create policy "coupons_public_read"
on public.coupons
for select
to authenticated, anon
using (
  (is_public = true and (expires_at is null or expires_at >= timezone('utc', now())))
  or (select private.is_admin())
);

create policy "coupons_admin_all"
on public.coupons
for all
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));
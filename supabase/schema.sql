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
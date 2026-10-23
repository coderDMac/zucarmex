-- Prototipo académico. Todas las políticas y RPC se aplican también fuera de la interfaz.
create extension if not exists pgcrypto;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 full_name text not null default '', role text not null default 'client' check(role in ('client','admin')),
 phone text not null default '', created_at timestamptz not null default now()
);
create table public.clients (
 id uuid primary key default gen_random_uuid(), profile_id uuid not null unique references public.profiles(id),
 business_name text not null, tax_name text, phone text not null default '', address text not null default '',
 city text not null default 'Culiacán', state text not null default 'Sinaloa', postal_code text not null default '',
 active boolean not null default true, created_at timestamptz not null default now()
);
create table public.products (
 id uuid primary key default gen_random_uuid(), sku text not null unique, name text not null,
 description text not null default '', presentation text not null, image_url text not null default '',
 reference_price numeric(14,2) not null check(reference_price > 0), active boolean not null default true,
 updated_at timestamptz not null default now()
);
create table public.volume_discount_tiers (
 id integer primary key, min_quantity integer not null check(min_quantity > 0), max_quantity integer,
 discount_percent numeric(5,2) not null check(discount_percent between 0 and 100),
 check(max_quantity is null or max_quantity >= min_quantity)
);
create sequence public.order_folio_seq start 129;
create table public.orders (
 id uuid primary key default gen_random_uuid(), order_number text not null unique default ('ZUC-' || lpad(nextval('public.order_folio_seq')::text,5,'0')),
 client_id uuid not null references public.clients(id),
 status text not null default 'requested' check(status in ('requested','validating','confirmed','preparing','ready','delivered','incident','cancelled')),
 requested_date date not null, fulfillment_type text not null check(fulfillment_type in ('pickup','delivery')),
 delivery_address text, reference_subtotal numeric(14,2) not null, estimated_discount numeric(14,2) not null,
 estimated_total numeric(14,2) not null, confirmed_total numeric(14,2),
 payment_status text not null default 'pending' check(payment_status in ('pending','simulated_paid')),
 incident_note text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(fulfillment_type <> 'delivery' or length(trim(delivery_address)) >= 10)
);
create table public.order_items (
 id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
 product_id uuid not null references public.products(id), quantity integer not null check(quantity between 1 and 10000),
 reference_unit_price numeric(14,2) not null, volume_discount_percent numeric(5,2) not null,
 estimated_line_total numeric(14,2) not null, confirmed_unit_price numeric(14,2), confirmed_line_total numeric(14,2),
 unique(order_id,product_id)
);
create table public.recurring_schedules (
 id uuid primary key default gen_random_uuid(), client_id uuid not null references public.clients(id),
 frequency text not null check(frequency in ('weekly','biweekly','monthly')), next_due_date date not null,
 active boolean not null default true, fulfillment_type text not null check(fulfillment_type in ('pickup','delivery')),
 delivery_address text, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.recurring_schedule_items (
 id uuid primary key default gen_random_uuid(), schedule_id uuid not null references public.recurring_schedules(id) on delete cascade,
 product_id uuid not null references public.products(id), quantity integer not null check(quantity between 1 and 10000), unique(schedule_id,product_id)
);
create table public.payments (
 id uuid primary key default gen_random_uuid(), order_id uuid not null unique references public.orders(id),
 payment_method text not null check(payment_method in ('bank_transfer','authorized_credit','point_of_sale')),
 status text not null check(status in ('pending','simulated_paid')), amount numeric(14,2) not null check(amount > 0), created_at timestamptz not null default now()
);
create index on public.orders(client_id,created_at desc);
create index on public.order_items(order_id);
create index on public.recurring_schedules(client_id,next_due_date);
create index on public.recurring_schedule_items(schedule_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path=public as $$
begin new.updated_at=now(); return new; end $$;
create trigger products_updated before update on public.products for each row execute function public.touch_updated_at();
create trigger orders_updated before update on public.orders for each row execute function public.touch_updated_at();
create trigger schedules_updated before update on public.recurring_schedules for each row execute function public.touch_updated_at();
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into public.profiles(id,full_name) values(new.id,coalesce(new.raw_user_meta_data->>'full_name','')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create function public.is_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create function public.owns_client(p_id uuid) returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.clients where id=p_id and profile_id=auth.uid());
$$;

alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.volume_discount_tiers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.recurring_schedules enable row level security;
alter table public.recurring_schedule_items enable row level security;
alter table public.payments enable row level security;
create policy profile_read on public.profiles for select to authenticated using(id=auth.uid() or public.is_admin());
create policy profile_edit on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy client_read on public.clients for select to authenticated using(profile_id=auth.uid() or public.is_admin());
create policy product_read on public.products for select to authenticated using(active or public.is_admin());
create policy product_admin on public.products for all to authenticated using(public.is_admin()) with check(public.is_admin());
create policy tier_read on public.volume_discount_tiers for select to authenticated using(true);
create policy order_read on public.orders for select to authenticated using(public.owns_client(client_id) or public.is_admin());
create policy item_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (public.owns_client(o.client_id) or public.is_admin())));
create policy schedule_read on public.recurring_schedules for select to authenticated using(public.owns_client(client_id) or public.is_admin());
create policy schedule_item_read on public.recurring_schedule_items for select to authenticated using(exists(select 1 from public.recurring_schedules s where s.id=schedule_id and (public.owns_client(s.client_id) or public.is_admin())));
create policy payment_read on public.payments for select to authenticated using(exists(select 1 from public.orders o where o.id=order_id and (public.owns_client(o.client_id) or public.is_admin())));
-- No INSERT/UPDATE directos sobre pedidos, pagos o recurrencias. Las RPC son transaccionales.
revoke all on public.profiles,public.clients,public.products,public.volume_discount_tiers,public.orders,public.order_items,public.recurring_schedules,public.recurring_schedule_items,public.payments from anon,authenticated;
grant select on public.profiles,public.clients,public.products,public.volume_discount_tiers,public.orders,public.order_items,public.recurring_schedules,public.recurring_schedule_items,public.payments to authenticated;
grant update(full_name,phone) on public.profiles to authenticated;
grant insert,update on public.products to authenticated;

create function public.advance_due(p_date date,p_frequency text) returns date language plpgsql stable set search_path=public as $$
declare d date:=p_date; today_local date:=(now() at time zone 'America/Mazatlan')::date;
begin
 loop
 d:=case p_frequency when 'weekly' then d+7 when 'biweekly' then d+15 when 'monthly' then (d+interval '1 month')::date else null end;
 if d is null then raise exception 'Frecuencia inválida'; end if;
 exit when d>today_local;
 end loop; return d;
end $$;

create function public.submit_order(p_items jsonb,p_requested_date date,p_fulfillment_type text,p_delivery_address text,p_schedule_id uuid default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.clients; s public.recurring_schedules; p public.products; line jsonb; q integer; pct numeric; sub numeric:=0; total numeric:=0; line_total numeric; oid uuid; today_local date:=(now() at time zone 'America/Mazatlan')::date;
begin
 select * into c from public.clients where profile_id=auth.uid() and active;
 if c.id is null or public.is_admin() then raise exception 'Cliente no autorizado'; end if;
 if p_requested_date is null or p_requested_date<=today_local then raise exception 'Selecciona una fecha futura'; end if;
 if p_fulfillment_type is null or p_fulfillment_type not in ('pickup','delivery') then raise exception 'Modalidad inválida'; end if;
 if p_fulfillment_type='delivery' and (p_delivery_address is null or length(trim(p_delivery_address))<10 or length(p_delivery_address)>500) then raise exception 'Dirección inválida'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Selecciona productos'; end if;
 if (select count(*) from jsonb_array_elements(p_items)) <> (select count(distinct value->>'product_id') from jsonb_array_elements(p_items)) then raise exception 'Productos duplicados'; end if;
 if p_schedule_id is not null then
  select * into s from public.recurring_schedules where id=p_schedule_id and client_id=c.id for update;
  if s.id is null or not s.active or s.next_due_date>today_local then raise exception 'La programación no está pendiente de confirmación'; end if;
 end if;
 insert into public.orders(client_id,requested_date,fulfillment_type,delivery_address,reference_subtotal,estimated_discount,estimated_total)
 values(c.id,p_requested_date,p_fulfillment_type,case when p_fulfillment_type='delivery' then trim(p_delivery_address) else null end,0,0,0) returning id into oid;
 for line in select value from jsonb_array_elements(p_items) loop
  if (line->>'quantity') !~ '^[0-9]+$' then raise exception 'Cantidad inválida'; end if;
  q:=(line->>'quantity')::integer;
  if q is null or q not between 1 and 10000 then raise exception 'Cantidad fuera de rango'; end if;
  select * into p from public.products where id=(line->>'product_id')::uuid and active for share;
  if p.id is null then raise exception 'Producto no disponible'; end if;
  select discount_percent into pct from public.volume_discount_tiers where q>=min_quantity and (max_quantity is null or q<=max_quantity);
  pct:=coalesce(pct,0); line_total:=round(q*p.reference_price*(1-pct/100),2);
  insert into public.order_items(order_id,product_id,quantity,reference_unit_price,volume_discount_percent,estimated_line_total) values(oid,p.id,q,p.reference_price,pct,line_total);
  sub:=sub+q*p.reference_price; total:=total+line_total;
 end loop;
 update public.orders set reference_subtotal=sub,estimated_discount=sub-total,estimated_total=total where id=oid;
 if p_schedule_id is not null then update public.recurring_schedules set next_due_date=public.advance_due(s.next_due_date,s.frequency) where id=s.id; end if;
 return oid;
end $$;

create function public.create_schedule(p_order_id uuid,p_frequency text,p_next_due_date date) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.orders; sid uuid;
begin
 select * into o from public.orders where id=p_order_id;
 if o.id is null or not public.owns_client(o.client_id) or public.is_admin() then raise exception 'Pedido no autorizado'; end if;
 if p_frequency is null or p_frequency not in ('weekly','biweekly','monthly') or p_next_due_date is null or p_next_due_date<(now() at time zone 'America/Mazatlan')::date then raise exception 'Revisa la frecuencia y fecha'; end if;
 insert into public.recurring_schedules(client_id,frequency,next_due_date,fulfillment_type,delivery_address) values(o.client_id,p_frequency,p_next_due_date,o.fulfillment_type,o.delivery_address) returning id into sid;
 insert into public.recurring_schedule_items(schedule_id,product_id,quantity) select sid,product_id,quantity from public.order_items where order_id=o.id;
 return sid;
end $$;
create function public.manage_schedule(p_id uuid,p_action text) returns void language plpgsql security definer set search_path=public as $$
declare s public.recurring_schedules;
begin
 select * into s from public.recurring_schedules where id=p_id for update;
 if s.id is null or not public.owns_client(s.client_id) or public.is_admin() then raise exception 'Programación no autorizada'; end if;
 if p_action='skip' then
  if not s.active or s.next_due_date>(now() at time zone 'America/Mazatlan')::date then raise exception 'Esta recurrencia aún no está pendiente'; end if;
  update public.recurring_schedules set next_due_date=public.advance_due(s.next_due_date,s.frequency) where id=p_id;
 elsif p_action='toggle' then update public.recurring_schedules set active=not active where id=p_id;
 else raise exception 'Acción inválida'; end if;
end $$;
create function public.admin_update_order(p_id uuid,p_status text,p_prices jsonb,p_incident_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders; i public.order_items; price numeric; total numeric:=0;
begin
 if not public.is_admin() then raise exception 'Acceso exclusivo de administración'; end if;
 select * into o from public.orders where id=p_id for update;
 if o.id is null then raise exception 'Pedido no encontrado'; end if;
 if p_status is null or p_status not in ('requested','validating','confirmed','preparing','ready','delivered','incident','cancelled') then raise exception 'Estado inválido'; end if;
 if o.status in ('delivered','cancelled') and p_status<>o.status then raise exception 'El pedido ya está cerrado'; end if;
 if p_status='incident' and length(trim(coalesce(p_incident_note,'')))<5 then raise exception 'Describe la incidencia'; end if;
 if o.payment_status='simulated_paid' and p_status in ('requested','validating','cancelled') then raise exception 'El pedido tiene un pago registrado; registra una incidencia para su revisión'; end if;
 if p_status in ('confirmed','preparing','ready','delivered') then
  if o.status in ('requested','validating') and p_status<>'confirmed' then raise exception 'Confirma primero disponibilidad y precio'; end if;
  for i in select * from public.order_items where order_id=p_id loop
   price:=(p_prices->>(i.id::text))::numeric;
   if price is null or price<=0 or price>1000000 then raise exception 'Revisa los precios confirmados'; end if;
   price:=round(price,2);
   if o.payment_status='simulated_paid' and price is distinct from i.confirmed_unit_price then raise exception 'No se puede modificar un precio pagado'; end if;
   update public.order_items set confirmed_unit_price=price,confirmed_line_total=round(price*quantity*(1-volume_discount_percent/100),2) where id=i.id;
   total:=total+round(price*i.quantity*(1-i.volume_discount_percent/100),2);
  end loop;
  update public.orders set confirmed_total=total where id=p_id;
 end if;
 update public.orders set status=p_status,incident_note=case when p_status='incident' then left(p_incident_note,1000) else null end where id=p_id;
end $$;
create function public.simulate_payment(p_order_id uuid,p_method text) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.orders; pid uuid;
begin
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or not public.owns_client(o.client_id) or public.is_admin() then raise exception 'Pedido no autorizado'; end if;
 if p_method is null or p_method not in ('bank_transfer','authorized_credit','point_of_sale') then raise exception 'Método inválido'; end if;
 if o.status not in ('confirmed','preparing','ready','delivered') or o.confirmed_total is null then raise exception 'El pedido debe estar confirmado'; end if;
 select id into pid from public.payments where order_id=p_order_id;
 if pid is not null then return pid; end if;
 insert into public.payments(order_id,payment_method,status,amount) values(p_order_id,p_method,'simulated_paid',o.confirmed_total) returning id into pid;
 update public.orders set payment_status='simulated_paid' where id=p_order_id; return pid;
end $$;
create function public.update_discount_tiers(p_tiers jsonb) returns void language plpgsql security definer set search_path=public as $$
declare r record; prev_max integer:=0; prev_percent numeric:=-1; n integer:=0;
begin
 if not public.is_admin() then raise exception 'Acceso exclusivo de administración'; end if;
 if p_tiers is null or jsonb_typeof(p_tiers)<>'array' or jsonb_array_length(p_tiers)<>4 then raise exception 'Configura cuatro rangos'; end if;
 perform pg_advisory_xact_lock(738219);
 for r in select * from jsonb_to_recordset(p_tiers) as x(id integer,min_quantity integer,max_quantity integer,discount_percent numeric) order by min_quantity loop
  n:=n+1;
  if r.min_quantity is null or r.discount_percent is null or r.min_quantity<>prev_max+1 or r.discount_percent not between 0 and 100 or r.discount_percent<prev_percent or (n<4 and (r.max_quantity is null or r.max_quantity<r.min_quantity)) or (n=4 and r.max_quantity is not null) then raise exception 'Rangos continuos y porcentajes crecientes requeridos'; end if;
  prev_max:=r.max_quantity; prev_percent:=r.discount_percent;
 end loop;
 delete from public.volume_discount_tiers where id is not null;
 insert into public.volume_discount_tiers select row_number() over(order by min_quantity),min_quantity,max_quantity,discount_percent from jsonb_to_recordset(p_tiers) as x(min_quantity integer,max_quantity integer,discount_percent numeric);
end $$;

-- Ninguna RPC es invocable de forma anónima. Helpers internos permanecen privados.
revoke all on function public.touch_updated_at(),public.handle_new_user(),public.advance_due(date,text),public.is_admin(),public.owns_client(uuid),public.submit_order(jsonb,date,text,text,uuid),public.create_schedule(uuid,text,date),public.manage_schedule(uuid,text),public.admin_update_order(uuid,text,jsonb,text),public.simulate_payment(uuid,text),public.update_discount_tiers(jsonb) from public,anon,authenticated;
grant execute on function public.is_admin(),public.owns_client(uuid),public.submit_order(jsonb,date,text,text,uuid),public.create_schedule(uuid,text,date),public.manage_schedule(uuid,text),public.admin_update_order(uuid,text,jsonb,text),public.simulate_payment(uuid,text),public.update_discount_tiers(jsonb) to authenticated;
-- El seed utiliza la clave administrativa fuera del navegador.
grant all on public.profiles,public.clients,public.products,public.volume_discount_tiers,public.orders,public.order_items,public.recurring_schedules,public.recurring_schedule_items,public.payments to service_role;
grant usage,select on public.order_folio_seq to service_role;

-- Retroalimentación ZUCARMEX: historial, toneladas, método de pago y retiro de beneficios automáticos.
-- Los importes y condiciones históricas permanecen intactos.
alter table public.products add column unit_weight_kg numeric(12,3) check (unit_weight_kg > 0);
alter table public.order_items add column unit_weight_kg numeric(12,3) check (unit_weight_kg > 0);
alter table public.order_items add column product_name text not null default '';
alter table public.order_items add column product_presentation text not null default '';
alter table public.orders add column payment_method text check (payment_method in ('bank_transfer','authorized_credit','point_of_sale'));

-- Sólo se conocen los pesos de las presentaciones demo. No inferir pesos de productos reales.
update public.products set unit_weight_kg = case
 when id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002') and presentation='Saco de 50 kg' then 50
 when id='30000000-0000-4000-8000-000000000003' and presentation='Saco de 25 kg' then 25
 when id='30000000-0000-4000-8000-000000000004' and presentation='Saco de 20 kg' then 20
 else null end
where id in ('30000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000003','30000000-0000-4000-8000-000000000004');
update public.order_items i set unit_weight_kg=p.unit_weight_kg,product_name=p.name,product_presentation=p.presentation
from public.products p where p.id=i.product_id;
update public.orders o set payment_method=p.payment_method from public.payments p where p.order_id=o.id and p.status='simulated_paid';

-- Se retira la operación de configuración; la tabla antigua sólo queda como antecedente.
drop function public.update_discount_tiers(jsonb);
revoke all on public.volume_discount_tiers from authenticated,anon;
drop function public.submit_order(jsonb,date,text,text,uuid);

create or replace function public.submit_order(p_items jsonb,p_requested_date date,p_fulfillment_type text,p_delivery_address text,p_schedule_id uuid default null,p_payment_method text default null) returns uuid
language plpgsql security definer set search_path=public as $$
declare c public.clients; s public.recurring_schedules; p public.products; line jsonb; q integer; pct numeric; sub numeric:=0; total numeric:=0; line_total numeric; oid uuid; today_local date:=(now() at time zone 'America/Mazatlan')::date;
begin
 select * into c from public.clients where profile_id=auth.uid() and active;
 if c.id is null or public.is_admin() then raise exception 'Cliente no autorizado'; end if;
 if p_requested_date is null or p_requested_date<=today_local then raise exception 'Selecciona una fecha futura'; end if;
 if p_fulfillment_type is null or p_fulfillment_type not in ('pickup','delivery') then raise exception 'Modalidad inválida'; end if;
 if p_fulfillment_type='delivery' and (p_delivery_address is null or length(trim(p_delivery_address))<10 or length(p_delivery_address)>500) then raise exception 'Dirección inválida'; end if;
 if p_payment_method is null or p_payment_method not in ('bank_transfer','authorized_credit','point_of_sale') then raise exception 'Selecciona un método de pago válido'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items) not between 1 and 50 then raise exception 'Selecciona productos'; end if;
 if (select count(*) from jsonb_array_elements(p_items)) <> (select count(distinct value->>'product_id') from jsonb_array_elements(p_items)) then raise exception 'Productos duplicados'; end if;
 if p_schedule_id is not null then
  select * into s from public.recurring_schedules where id=p_schedule_id and client_id=c.id for update;
  if s.id is null or not s.active or s.next_due_date>today_local then raise exception 'La programación no está pendiente de confirmación'; end if;
 end if;
 insert into public.orders(client_id,requested_date,fulfillment_type,delivery_address,payment_method,reference_subtotal,estimated_discount,estimated_total)
 values(c.id,p_requested_date,p_fulfillment_type,case when p_fulfillment_type='delivery' then trim(p_delivery_address) else null end,p_payment_method,0,0,0) returning id into oid;
 for line in select value from jsonb_array_elements(p_items) loop
  if (line->>'quantity') !~ '^[0-9]+$' then raise exception 'Cantidad inválida'; end if;
  q:=(line->>'quantity')::integer;
  if q is null or q not between 1 and 10000 then raise exception 'Cantidad fuera de rango'; end if;
  select * into p from public.products where id=(line->>'product_id')::uuid and active for share;
  if p.id is null then raise exception 'Producto no disponible'; end if;
  pct:=0; line_total:=round(q*p.reference_price,2);
  insert into public.order_items(order_id,product_id,product_name,product_presentation,unit_weight_kg,quantity,reference_unit_price,volume_discount_percent,estimated_line_total) values(oid,p.id,p.name,p.presentation,p.unit_weight_kg,q,p.reference_price,0,line_total);
  sub:=sub+q*p.reference_price; total:=total+line_total;
 end loop;
 update public.orders set reference_subtotal=sub,estimated_discount=sub-total,estimated_total=total where id=oid;
 if p_schedule_id is not null then update public.recurring_schedules set next_due_date=public.advance_due(s.next_due_date,s.frequency) where id=s.id; end if;
 return oid;
end $$;

create or replace function public.admin_update_order(p_id uuid,p_status text,p_prices jsonb,p_incident_note text default null) returns void language plpgsql security definer set search_path=public as $$
declare o public.orders; i public.order_items; price numeric; line_total numeric; total numeric:=0;
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
   -- Preservar importes confirmados al avanzar de estado, sin volver a aplicar descuentos.
   -- Un precio nuevo se confirma por cantidad, sin reglas comerciales estandarizadas.
   line_total:=case when i.confirmed_unit_price=price and i.confirmed_line_total is not null
     then i.confirmed_line_total else round(price*i.quantity,2) end;
   update public.order_items set confirmed_unit_price=price,confirmed_line_total=line_total where id=i.id;
   total:=total+line_total;
  end loop;
  update public.orders set confirmed_total=total where id=p_id;
 end if;
 update public.orders set status=p_status,incident_note=case when p_status='incident' then left(p_incident_note,1000) else null end where id=p_id;
end $$;

create or replace function public.simulate_payment(p_order_id uuid,p_method text) returns uuid language plpgsql security definer set search_path=public as $$
declare o public.orders; pid uuid;
begin
 select * into o from public.orders where id=p_order_id for update;
 if o.id is null or not public.owns_client(o.client_id) or public.is_admin() then raise exception 'Pedido no autorizado'; end if;
 if p_method is null or p_method not in ('bank_transfer','authorized_credit','point_of_sale') then raise exception 'Método inválido'; end if;
 if o.status not in ('confirmed','preparing','ready','delivered') or o.confirmed_total is null then raise exception 'El pedido debe estar confirmado'; end if;
 select id into pid from public.payments where order_id=p_order_id;
 if pid is not null then return pid; end if;
 insert into public.payments(order_id,payment_method,status,amount) values(p_order_id,p_method,'simulated_paid',o.confirmed_total) returning id into pid;
 update public.orders set payment_status='simulated_paid',payment_method=p_method where id=p_order_id; return pid;
end $$;

revoke all on function public.submit_order(jsonb,date,text,text,uuid,text) from public,anon,authenticated;
grant execute on function public.submit_order(jsonb,date,text,text,uuid,text) to authenticated;
notify pgrst, 'reload schema';

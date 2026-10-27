-- Pesos explícitos del catálogo ya cargado en la demostración.
-- Un paquete de 10 × 900 g pesa 9 kg; uno de 10 × 1 kg pesa 10 kg.
-- No se asigna el peso de la presentación actual a compras anteriores a su actualización.
with known(sku,presentation,weight_kg) as (values
 ('AZ-STD-25','Azúcar Morena Zulka Costal de 25 Kg',25::numeric),
 ('AZ-REF-25','Azúcar Glass Zulka Costal de 25 kg',25::numeric),
 ('AZ-STD-900','Azúcar Morena Zulka Paquete con 10 piezas de 900 g',9::numeric),
 ('AZ-STD-10','Azúcar Morena Zulka Paquete con 10 piezas de 1 kg',10::numeric),
 ('AZ-GLASS-25','Azúcar Refinada Zulka Costal de 25 kg',25::numeric)
)
update public.order_items i set unit_weight_kg=k.weight_kg
from public.products p, public.orders o, known k
where i.product_id=p.id and i.order_id=o.id and i.unit_weight_kg is null
 and p.sku=k.sku and lower(trim(p.presentation))=lower(k.presentation)
 and o.created_at>=p.updated_at;

with known(sku,presentation,weight_kg) as (values
 ('AZ-STD-25','Azúcar Morena Zulka Costal de 25 Kg',25::numeric),
 ('AZ-REF-25','Azúcar Glass Zulka Costal de 25 kg',25::numeric),
 ('AZ-STD-900','Azúcar Morena Zulka Paquete con 10 piezas de 900 g',9::numeric),
 ('AZ-STD-10','Azúcar Morena Zulka Paquete con 10 piezas de 1 kg',10::numeric),
 ('AZ-GLASS-25','Azúcar Refinada Zulka Costal de 25 kg',25::numeric)
)
update public.products p set unit_weight_kg=k.weight_kg
from known k where p.unit_weight_kg is null and p.sku=k.sku
 and lower(trim(p.presentation))=lower(k.presentation);

-- Recuperar exclusivamente los tres fixtures originales del seed de usuarios.
-- Esos pedidos se crearon con Azúcar estándar, saco de 50 kg a $1,245.
-- No modificar importes, fechas, cantidades ni otros pedidos del cliente.
with fixtures(order_id,quantity) as (values
 ('40000000-0000-4000-8000-000000000001'::uuid,20),
 ('40000000-0000-4000-8000-000000000002'::uuid,20),
 ('40000000-0000-4000-8000-000000000003'::uuid,25)
)
update public.order_items i set unit_weight_kg=50,product_name='Azúcar estándar',product_presentation='Saco de 50 kg'
from fixtures f where i.order_id=f.order_id and i.quantity=f.quantity
 and i.product_id='30000000-0000-4000-8000-000000000001'::uuid
 and i.reference_unit_price=1245 and i.unit_weight_kg is null;

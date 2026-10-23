-- DATOS DEMO. No son catálogo, precios ni políticas comerciales reales de ZUCARMEX.
insert into public.products(id,sku,name,description,presentation,image_url,reference_price) values
('30000000-0000-4000-8000-000000000001','AZ-EST-50','Azúcar estándar','Cristales de azúcar para tus preparaciones de todos los días.','Saco de 50 kg','/images/sugar-standard.svg',1245),
('30000000-0000-4000-8000-000000000002','AZ-REF-50','Azúcar refinada','Textura uniforme para panificación y repostería.','Saco de 50 kg','/images/sugar-refined.svg',1395),
('30000000-0000-4000-8000-000000000003','AZ-MAS-25','Azúcar mascabado','Sabor y color para recetas con un toque especial.','Saco de 25 kg','/images/sugar-brown.svg',895),
('30000000-0000-4000-8000-000000000004','AZ-GLS-20','Azúcar glass','Molienda fina para coberturas, glaseados y decoración.','Saco de 20 kg','/images/sugar-glass.svg',765)
on conflict(id) do nothing;
insert into public.volume_discount_tiers values(1,1,9,0),(2,10,24,2),(3,25,49,4),(4,50,null,6) on conflict(id) do nothing;

# Portal de Clientes ZUCARMEX — Punto de Venta Culiacán

Prototipo funcional B2B para **Proyecto de Innovación II**. Permite validar una propuesta de valor con pequeñas panaderías recurrentes: gestionar compras habituales y anticipar el abastecimiento con menos llamadas y mensajes, conservando la atención personalizada.

El negocio ficticio de la demostración es **Panadería La Espiga**. La metodología de referencia del proyecto es _Disciplined Entrepreneurship_, de Bill Aulet.

## Stack

Next.js 16 con App Router, React, TypeScript estricto, CSS nativo, Framer Motion, GSAP, React Icons, Supabase PostgreSQL, Supabase Auth y RLS. No usa frameworks de componentes ni pasarelas de pago.

Framer Motion anima tarjetas, cambios de vista y modales. GSAP anima únicamente la cifra de referencia del dashboard. Se respeta la preferencia de movimiento reducido. El tema está centralizado en `src/app/globals.css`; los colores y el identificador tipográfico son una propuesta visual para el prototipo, no un manual de marca oficial.

## Instalación y ejecución

Requisitos: Node.js 22 o posterior y npm. Para Supabase local también necesitas Docker y la CLI de Supabase.

Este proyecto vive en la subcarpeta `zucarmex` del directorio de trabajo original:

```bash
cd zucarmex
npm install
cp .env.example .env.local
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Para compilar y ejecutar la versión de producción:

```bash
npm run build
npm start
```

### Recorrido inmediato sin backend

Con `npm run dev`, si las variables públicas de Supabase están vacías, `/login` ofrece **Entrar como cliente** y **Administración**. Es una demostración local explícita, no autenticación real. Los datos ficticios se guardan en `.demo/data.json`, excluido de Git. Puedes alternar perfiles desde la barra lateral.

Este modo es para un solo proceso local, sin datos sensibles. Para restablecerlo, con el servidor detenido elimina `.demo/data.json`. En producción queda deshabilitado, salvo que se defina explícitamente `ENABLE_LOCAL_DEMO=true`. **En cuanto hay configuración de Supabase, el modo local se deshabilita y ambas cuentas requieren Supabase Auth.**

## Configuración de Supabase

Elige **una** de las opciones siguientes.

### Opción A: Supabase local

Con Docker abierto:

```bash
supabase start
supabase status
```

La CLI aplica `supabase/migrations/202610230001_portal.sql` y `supabase/seed.sql` al crear la instancia. Los puertos locales son 54321 (API), 54322 (PostgreSQL) y 54323 (Studio).

Para una instancia ligera que sólo necesita PostgreSQL, Auth y REST:

```bash
supabase start -x realtime,storage-api,imgproxy,mailpit,postgres-meta,studio,edge-runtime,logflare,vector,supavisor
```

Copia de `supabase status` a `.env.local`:

- API URL → `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key (o anon key) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Service role key → `SUPABASE_SERVICE_ROLE_KEY`, exclusivamente para scripts

Define contraseñas propias de al menos 12 caracteres en `DEMO_CLIENT_PASSWORD` y `DEMO_ADMIN_PASSWORD`. No se distribuyen contraseñas predeterminadas ni se incluyen en el frontend. Reinicia Next.js después de cambiar el entorno.

Para detener esta instancia sin borrar los datos:

```bash
supabase stop
```

`supabase db reset` elimina los datos locales y reaplica migraciones y seed. Úsalo sólo si quieres restablecer deliberadamente tu instancia de desarrollo. Después ejecuta de nuevo el seed de usuarios.

### Opción B: proyecto alojado en Supabase

El entorno actual está vinculado al proyecto **zucarmex** (`mehfovxsoxbgcvldxzxu`) de la cuenta escolar. Puedes consultar sus tablas y usuarios en el [Dashboard de Supabase](https://supabase.com/dashboard/project/mehfovxsoxbgcvldxzxu). La aplicación sigue ejecutándose en Next.js local; los datos y la autenticación ya utilizan el proyecto alojado.

Para vincular otra copia del repositorio mediante la CLI, primero inicia sesión en el navegador con la cuenta propietaria y ejecuta desde esta carpeta:

```bash
supabase login --agent no --output-format text
supabase link --project-ref mehfovxsoxbgcvldxzxu --agent no --output-format text
supabase db push --linked --dry-run --skip-vault --agent no --output-format text
supabase db push --linked --include-seed --skip-vault --agent no --output-format text
```

Revisa el esquema y las migraciones pendientes antes de aplicar cambios. `supabase config diff` permite revisar por separado la configuración remota de Auth; `supabase config push` aplica las propiedades declaradas en `supabase/config.toml`. En este proyecto se habilitó el acceso por correo, se deshabilitó el registro público y se configuró `http://localhost:3000` como origen de desarrollo. Las contraseñas de las cuentas demo se conservan en variables locales y los usuarios se preparan con `npm run seed:users`.

Para un proyecto nuevo también puedes realizar la preparación manualmente:

1. Crea un proyecto de Supabase.
2. En SQL Editor ejecuta primero el contenido de `supabase/migrations/202610230001_portal.sql`.
3. Ejecuta después `supabase/seed.sql`.
4. En Authentication habilita el proveedor Email y deshabilita el registro público. Los usuarios se crean con el script administrativo.
5. Configura Site URL con tu origen de desarrollo (`http://localhost:3000`) o despliegue. El flujo actual usa correo/contraseña; no necesita OAuth ni enlaces de confirmación.
6. En Project Settings → API copia URL y clave pública a `.env.local`. Copia la service role key únicamente para ejecutar el seed localmente.
7. Define las dos contraseñas demo y ejecuta el seed de usuarios.

Consulta las [instrucciones oficiales de autenticación SSR de Supabase](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs). La aplicación usa cookies con `@supabase/ssr`, renueva sesiones en `src/proxy.ts` y verifica al usuario con `getUser()` en el servidor.

**Nunca uses `NEXT_PUBLIC_` para la service role key ni la coloques en código del navegador.** Las rutas de aplicación usan la clave pública y la sesión del usuario; no importan ni utilizan la clave administrativa.

## Seed y usuarios demo

`supabase/seed.sql` crea cuatro productos ficticios y estas reglas demostrativas, por cantidad de **cada producto**:

| Unidades | Descuento estimado |
| -------- | ------------------ |
| 1–9      | 0%                 |
| 10–24    | 2%                 |
| 25–49    | 4%                 |
| 50 o más | 6%                 |

Después de migrar y configurar `.env.local`:

```bash
npm run seed:users
```

El script crea o actualiza únicamente estas cuentas de demostración, con las contraseñas suministradas en el entorno:

| Cuenta                      | Rol           | Destino   |
| --------------------------- | ------------- | --------- |
| `cliente@demo-zucarmex.com` | Cliente       | `/portal` |
| `admin@demo-zucarmex.com`   | Administrador | `/admin`  |

También crea Panadería La Espiga, pedidos históricos de 20 y 25 sacos, un pedido en preparación y una recurrencia quincenal **pendiente hoy**. Las fechas se calculan en la zona horaria de Culiacán (`America/Mazatlan`), para que el demo sea repetible en cualquier fecha.

Reejecutar el script actualiza las contraseñas, el perfil y los datos del negocio demo, pero conserva pedidos y programaciones existentes. No modifica otras cuentas ni imprime contraseñas. Si un paso falla por configuración, corrígela y vuelve a ejecutar el script. Si una ejecución se interrumpe justo entre crear un pedido y sus partidas, restablece la instancia local antes de volver a preparar los fixtures.

En el entorno actual, `.env.local` contiene la conexión al **proyecto alojado de Supabase** y contraseñas aleatorias para estas cuentas. La configuración anterior de Docker se conservó en `.env.supabase-local`. Ambos archivos se excluyen de Git. Puedes consultar las contraseñas en `.env.local` o cambiarlas y ejecutar `npm run seed:users` de nuevo. Reinicia `npm run dev` después de cambiar el entorno si Next.js no recarga las variables automáticamente. Para una compilación de producción, ejecuta `npm run build` después de cambiar las variables públicas de Supabase.

## Flujos disponibles

| Cliente                | Administración        |
| ---------------------- | --------------------- |
| `/login`               | `/login`              |
| `/portal`              | `/admin`              |
| `/portal/catalogo`     | `/admin/productos`    |
| `/portal/nuevo-pedido` | `/admin/pedidos`      |
| `/portal/pedidos`      | `/admin/pedidos/[id]` |
| `/portal/pedidos/[id]` | `/admin/clientes`     |
| `/portal/recurrentes`  | `/admin/beneficios`   |
| `/portal/ayuda`        |                       |
| `/portal/perfil`       |                       |

Las rutas se resuelven con segmentos opcionales del App Router. La sesión y el rol se verifican en layouts y páginas; cada operación de escritura vuelve a comprobar identidad y permisos en el servidor y en PostgreSQL. Un cliente que intenta abrir `/admin` vuelve a `/portal`, y el administrador sólo accede a su panel. No existe cambio de rol sin autenticación cuando Supabase está configurado.

El catálogo permite buscar y agregar varias líneas a una solicitud. El asistente permite editar cantidades, seleccionar fecha futura y modalidad, revisar importes y enviar. El historial permite filtrar, seguir y repetir pedidos. El administrador puede editar o agregar productos, activar/desactivar su visibilidad, editar rangos, confirmar importes, actualizar estados, registrar incidencias y cancelar pedidos sin pago.

## Demostración recomendada: cinco minutos

1. **Cliente:** inicia sesión como `cliente@demo-zucarmex.com`. Muestra el precio actualizado, pedido activo, último pedido y beneficio contextual.
2. **Recompra:** pulsa **Repetir último pedido**. Cambia 20 a **25 sacos** de azúcar estándar demo. Con referencia de $1,245 se muestra **4%**, descuento de $1,245 y total estimado de **$29,880 MXN**.
3. **Anticipación:** selecciona una fecha futura y **Entrega en dirección registrada**. Revisa el resumen y pulsa **Enviar solicitud**. Aparece **Solicitud recibida**, un folio y la advertencia de confirmación comercial.
4. **Administrador:** cierra sesión e ingresa como `admin@demo-zucarmex.com` (o usa otro navegador con sesión independiente). Abre la nueva solicitud, revisa los precios por saco, selecciona **Confirmado**, marca disponibilidad y guarda. También puedes mostrar los estados posteriores.
5. **Pago:** vuelve al cliente y actualiza el seguimiento. Se distingue el **precio confirmado** del estimado. Abre **Ir a pago simulado**, elige **Transferencia bancaria** y pulsa **Simular pago**. Aparece **Pago registrado para fines demostrativos**.
6. **Recurrente:** en ese pedido pulsa **Programar pedido recurrente**, elige **Cada 15 días** y guarda. Si hoy fuera 23 de octubre, la fecha sugerida sería **7 de noviembre**. El seed incluye además una programación pendiente hoy para mostrar **Revisar y confirmar** durante la exposición.
7. Revisa esa programación: ajusta cantidades, fecha y modalidad, o **omite** la recurrencia. Sólo al pulsar **Enviar solicitud** se genera un nuevo pedido en estado **Solicitud recibida**. Se calculan precios vigentes y se avanza la próxima fecha.

Las programaciones futuras muestran su fecha y necesitan confirmación cuando llega el momento. Si hay varios períodos vencidos, confirmar u omitir avanza hasta la primera fecha futura; no genera pedidos atrasados. El período quincenal son exactamente 15 días; el mensual ajusta fechas de fin de mes al último día disponible.

## Reglas y modelo de datos

Tablas: `profiles`, `clients`, `products`, `volume_discount_tiers`, `orders`, `order_items`, `recurring_schedules`, `recurring_schedule_items`, `payments`.

- El precio de referencia se guarda como snapshot en cada partida. Una actualización del catálogo no modifica solicitudes anteriores. Repetir un pedido usa referencias **actuales**.
- Los descuentos se aplican por producto y se redondean por partida a centavos. Los rangos deben ser continuos y crecientes. Cambiarlos sólo afecta solicitudes nuevas.
- La fecha requerida expresa intención de abastecimiento: **no congela precios ni garantiza entrega**.
- Las programaciones son intenciones, no compras. Confirmar es transaccional: crea una solicitud y avanza la programación bajo bloqueo para impedir doble confirmación.
- El administrador confirma precio unitario; el servidor calcula el total con el beneficio guardado en la solicitud. No se permite saltar de solicitud a preparación sin confirmar previamente.
- Se paga únicamente después de confirmar (estados Confirmado, Preparando, Listo o Entregado). El importe procede del total confirmado. La operación es idempotente: un pedido tiene como máximo un pago.
- Un precio pagado no se puede modificar. Un pedido pagado que requiere revisión se marca con **Incidencia**; la simulación no implementa devoluciones. Los pedidos entregados o cancelados están cerrados.
- Los estados son Solicitud recibida, En validación, Confirmado, Preparando, Listo, Entregado, Incidencia y Cancelado.
- No hay cron. Las alertas se calculan al visitar/actualizar el portal.

### Seguridad proporcional

RLS restringe perfiles, negocios, pedidos, partidas, recurrencias y pagos a su propietario. El administrador consulta la información necesaria para el prototipo. Los clientes no pueden cambiar su rol ni escribir directamente estados, precios o totales.

Las RPC `submit_order`, `admin_update_order`, `simulate_payment`, `create_schedule`, `manage_schedule` y `update_discount_tiers` validan permisos y reglas en la base de datos. No hay permisos de escritura directa para pedidos, pagos o recurrencias desde clientes autenticados. Las funciones internas no son invocables anónimamente. Los precios del navegador nunca son la fuente del cálculo. La API comprueba el origen de solicitudes y las cookies del modo local son HttpOnly y SameSite=Lax.

## Verificación

```bash
npm run typecheck
npm test
npm run build
```

Con Supabase **local** iniciado y usuarios demo creados:

```bash
npm run test:integration
```

Las pruebas de integración usan Auth y PostgreSQL reales. Comprueban aislamiento entre dos clientes, imposibilidad de escalar rol o confirmar desde cliente, snapshots, cálculo de volumen, confirmación administrativa, pago idempotente y recurrencias sin compras automáticas. Crean datos temporales que eliminan al finalizar. Por seguridad se omiten si el backend no es localhost; no se ejecutan contra proyectos alojados.

## Arquitectura y evolución a SAP

```text
src/app/                 Rutas, layouts de sesión, endpoint de operaciones
src/components/          Interfaz, formularios y animaciones
src/lib/domain/          Tipos, precios, fechas y validación
src/lib/order-service.ts Casos de uso y operaciones
src/lib/data/            Repositorio de lectura y demo local aislada
src/lib/supabase/        Clientes SSR/navegador y configuración
supabase/migrations/     Modelo, RLS y operaciones transaccionales
supabase/seed.sql         Catálogo y beneficios ficticios
scripts/seed-users.mjs   Usuarios Auth y fixtures de demostración
```

Los componentes no consultan tablas de Supabase directamente. Las lecturas pasan por el repositorio y las escrituras por servicios de aplicación y RPC; el backend aplica las reglas de forma autoritativa. El almacén JSON sólo sostiene la vista previa local sin Supabase.

**En una implementación empresarial, SAP permanecería como fuente de verdad operativa y el Portal funcionaría como capa digital de experiencia para clientes.** SAP administraría inventarios, precios, clientes, pedidos y seguimiento. Supabase simula infraestructura para esta demostración; no se propone como reemplazo empresarial de SAP. No se implementó un adaptador SAP.

Para sustituir el catálogo usa el panel de productos o edita `supabase/seed.sql` antes de inicializar otra instancia. Los placeholders SVG están en `public/images/`; el catálogo del modo local está en `src/lib/data/demo-seed.ts`. No son empaques oficiales.

## Limitaciones académicas

- Productos, imágenes, precios, negocios y descuentos **demo**; no representan información o condiciones comerciales reales.
- **Pago simulado**, sin dinero ni información bancaria.
- **Sin SAP**, inventario real, facturación, CFDI, contabilidad, CRM ni ERP.
- **Sin logística real**: no hay fletes, mapas, rutas o promesas automáticas de entrega.
- **Sin mensajes externos**: el formulario de ayuda sólo prepara una confirmación visual; no envía ni almacena mensajes.
- Sin correos automáticos, notificaciones push o actualización en tiempo real: refresca para ver cambios hechos desde otra sesión.
- Gestión administrativa deliberadamente sencilla, sin analítica avanzada. No hay alta pública de clientes, recuperación de contraseña ni operación comercial productiva.

Toda funcionalidad está orientada a demostrar una propuesta: el cliente puede gestionar y anticipar compras recurrentes con menos fricción, conservando el acompañamiento de ZUCARMEX.

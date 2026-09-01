# SANSER Web

Landing y cotizador de SANSER Metalúrgica (Next.js 16 + Tailwind 4 + react-three-fiber),
con un CRM interno para las consultas que llegan desde el sitio.

## Desarrollo

Todo corre en Docker: web (Next en modo dev, con hot reload) y db (Postgres 17).

```bash
docker compose up -d          # levantar (http://localhost:3000)
docker compose exec web pnpm db:migrate   # crear/actualizar las tablas del CRM
docker compose logs -f web    # ver logs
docker compose down           # parar
docker compose build          # rebuild tras tocar package.json
```

El Postgres local queda expuesto en el puerto **5547** del host
(`postgres://sanser:sanser@localhost:5547/sanser`) por si querés abrirlo con un cliente SQL.

Comprobaciones, las mismas que conviene pasar antes de subir:

```bash
docker compose exec web pnpm lint
docker compose exec web pnpm exec tsc --noEmit
docker compose run --rm --no-deps -v /app/.next web pnpm build
```

El `-v /app/.next` del build no es decorativo: aísla su salida de la del servidor de
desarrollo, que comparte esa carpeta y se queda sirviendo 404 si se la pisan.

## CRM

Panel interno en **/admin**, protegido con una contraseña única. Registra tres tipos de lead:

| Tipo          | Se crea cuando…                                        |
| ------------- | ------------------------------------------------------ |
| `contacto`    | alguien envía el formulario de la landing              |
| `presupuesto` | alguien pide un presupuesto en el cotizador            |
| `whatsapp`    | se abre WhatsApp desde el modal o desde el cotizador   |

De cada lead se guarda además el contexto de la visita: página de origen, referrer,
user agent, IP y —en producción, vía cabeceras de Vercel— ciudad, provincia y país.
Desde el panel se cambia el estado (nuevo → contactado → presupuestado → ganado/perdido),
se escriben notas, se dan de alta registros a mano y se exporta todo a CSV.

### Papelera y agrupado por cliente

**Borrar saca de la vista, no destruye.** Los registros se marcan con `deleted_at` y
desaparecen de la lista, de las cifras de cabecera y del agrupado por cliente; el botón
*Papelera* los muestra y permite restaurarlos. Se hace así porque un lead puede tener un
PDF ya entregado, gastos de obra imputados y el historial del cliente colgando: un
borrado de verdad se llevaría el rastro de todo eso por delante.

Se marca con las casillas y se borra en lote, que es el caso real —limpiar de una vez las
pruebas internas de meses—, no de a uno.

**Un cliente es un teléfono, con los dígitos normalizados.** La pestaña *Clientes* muestra
una fila por persona: cuántos registros dejó, cuántos presupuestos, cuánto se le confirmó
y el estado más avanzado al que llegó. Pinchando una fila se ven todos sus registros.

La clave sale de una columna generada en Postgres, `phone_key`: sólo los dígitos y los
últimos diez, lo que descarta el prefijo de país y el 0 de larga distancia. Antes se
comparaba la cadena tal cual, así que `+54 3743 48-7728`, `03743 48-7728` y `3743487728`
eran tres clientes distintos y el historial no encontraba nada. La calcula la base y no
el código porque hay tres caminos de alta —formulario, cotizador y alta manual— y alguno
se iba a olvidar.

**Ojo:** el sitio nunca pide correo, así que agrupar por email no es posible hoy. Quien no
deja teléfono no se puede agrupar y queda fuera de esa lista; el pie dice cuántos son.

```bash
docker compose exec web node scripts/smoke-crm.mjs
```

Además:

- **Aviso por correo** de cada presupuesto y cada consulta, en cuanto entra. Sale por el
  mismo Formspree que ya recibía el formulario; `LEAD_NOTIFY_ENDPOINT` permite apuntarlo
  a otro servicio sin tocar código. Los clics a WhatsApp no avisan: serían ruido.
- **El PDF viaja con el presupuesto.** Se guarda en `lead_pdfs` y se sirve en
  `/api/presupuesto/<token>`, con un token UUID que es toda la protección del enlace
  (va por WhatsApp, no puede pedir sesión). El mensaje de WhatsApp del cotizador lo
  incluye, y desde la ficha se puede abrir o copiar.
- **Aviso de leads dormidos**: los que llevan más de 48 h en `nuevo` salen destacados
  arriba y el cartel filtra por ellos.
- **Sin duplicados**: regenerar el mismo presupuesto (mismo teléfono y título, dentro de
  media hora) actualiza el registro en vez de crear otro. Y enviarlo por WhatsApp marca
  ese presupuesto como *contactado* en lugar de sumar una fila suelta.
- **Historial por cliente**: la ficha enlaza a todos los registros de ese teléfono.

Nota sobre almacenamiento: cada PDF ronda 1 MB y el plan gratuito de Neon da 0,5 GB,
o sea unos 500 presupuestos. Cuando se acerque, lo natural es mover los PDFs a Vercel
Blob y dejar sólo el enlace en la base.

### El cotizador: pedido, borrador y presupuesto

`/cotizar` es público, pero el visitante **no se lleva ningún papel**: configura su
tinglado, ve el total en pantalla, deja nombre y teléfono y pide el presupuesto. Eso
entra al CRM como **borrador**, sin número. El precio que vio es orientativo y nadie de
SANSER lo firmó todavía.

Quien tenga **sesión abierta en `/admin`** ve la misma página en modo interno, con ítems,
precios, título, CUIT, fecha y fotos editables. Desde la ficha del lead, *Abrir y
confirmar* reabre ese borrador en el cotizador con todo cargado —medidas, ítems, detalle—
para ajustarlo.

**Confirmar** es el acto que convierte el borrador en documento: la base le asigna un
número correlativo (`SP-26-0001`, de `quote_number_seq`), el lead pasa a *presupuestado* y
recién ahí se genera y guarda el PDF definitivo. Después Santi aprieta *Enviar al cliente*
—nunca sale solo— y el mensaje va con el enlace al PDF.

Los dos PDF se distinguen a propósito: el borrador dice "BORRADOR — sujeto a confirmación"
y no lleva número ni validez; el confirmado lleva su número y los 7 días de validez. Un
presupuesto ya confirmado no se puede editar por detrás: cambiaría el precio de algo que
el cliente ya tiene.

Ojo con no mezclar los dos estados que conviven: `quote_state` (borrador/confirmado) es el
del documento, y `status` (nuevo → contactado → presupuestado → ganado/perdido) es el del
negocio. Confirmar no es que el cliente aceptó.

Aviso: el PDF se genera en el navegador, así que quien sepa usar las herramientas de
desarrollo puede saltarse el bloqueo. Cerrar esa puerta del todo exige generar el PDF en
el servidor.

## Gestión de gastos

Panel en **/admin/finanzas**, con la misma sesión que el CRM. Responde tres preguntas:
cuánto entró y salió, qué obra dejó plata, y cuánto hay que facturar para no perder.

### Dos pantallas, y la que importa es la de cargar

**Cargar** es la que se abre. Está pensada para el teléfono, en el galpón, con la factura
en la mano: primero si entró o salió plata, después cuánto, después qué era —con botones
grandes que dicen *Perfilería*, *Chapa*, *Sueldos*, *Alquiler*—, la foto de la factura y
listo. Debajo queda lo último cargado, para confirmar de un vistazo y poder deshacer.

**El que carga nunca elige el tipo contable.** Nadie en un taller piensa «esto es un
gasto variable»; piensa «compré chapa». El tipo va detrás de cada concepto, en
[`lib/finanzas/conceptos.ts`](lib/finanzas/conceptos.ts), y lo decide el sistema. Elegir
*Chapa* hace que además aparezca la pregunta de a qué obra, y elegir *Alquiler* no.
Los nombres salen del propio cotizador, para que se lea lo mismo que se presupuesta.

**Los números** es la otra pestaña, con el detalle, los filtros, la carga detallada y la
jerga completa. Ahí sí se habla de márgenes y de tipos.

### Cómo está pensado

**Un solo libro, no cuatro tablas.** Todo movimiento —ingreso, gasto fijo, variable o de
producción— es una fila de `fin_movimientos` con el tipo como columna. Casi toda pregunta
del negocio es «sumá el período y agrupá por tipo»; con una tabla por tipo eso serían
cuatro consultas y una unión. El monto va siempre positivo: el signo lo pone el tipo.

**La separación de gastos no es cosmética:**

| tipo | qué es | se imputa a una obra |
| --- | --- | --- |
| `fijo` | existe aunque no se venda nada: alquiler, sueldos, seguro | no |
| `variable` | acompaña a la actividad pero no es de una obra: combustible, herramientas | no |
| `produccion` | material y mano de obra de **una** obra | sí |
| `ingreso` | plata que entró | sí, si corresponde a una obra |

Un alquiler imputado a un tinglado le arruinaría la rentabilidad, así que el formulario
sólo ofrece imputar en los dos tipos que corresponde.

**Los gastos fijos se guardan dos veces a propósito.** En `fin_gastos_fijos` está la
lista de lo que se paga todos los meses —para no tipearla— y el botón *Generar el mes*
la vuelca como movimientos reales. Podría calcularse al vuelo y ahorrarse las filas, pero
entonces el libro diría lo que *debería* pagarse en vez de lo que se pagó, y en cuanto un
mes el alquiler suba las cuentas dejarían de cuadrar con el banco. Generar dos veces el
mismo mes no duplica nada: lo impide un índice único.

**Los ingresos no son las ventas.** Una venta ya vive en el CRM (un lead `ganado` con su
`quote_total`); un ingreso es plata efectivamente cobrada. Se llevan separados porque
casi nunca coinciden —seña, saldo, cuotas— y la diferencia entre lo presupuestado y lo
cobrado es justamente lo que se quiere ver en la tabla de obras.

### «ROI» son dos números distintos

La palabra significa cosas distintas según quién pregunte, así que se muestran las dos
con su nombre en vez de una cifra ambigua:

- **Margen** = (ingresos − gastos) / ingresos → de cada peso facturado, cuánto queda.
- **Retorno** = (ingresos − gastos) / gastos → por cada peso puesto, cuánto vuelve.
- **ROI por obra** = (cobrado − costo de producción) / costo → si conviene volver a tomar
  un trabajo así.

Donde no se puede dividir se muestra «—» y no un cero: un ROI sin costos cargados no es
cero, es desconocido.

### Proyección

No adivina: proyecta lo medido. El **punto de equilibrio** sale de los fijos mensuales y
del margen bruto, y contesta lo único que importa a fin de mes —cuánto hay que facturar
para no perder plata—. Lo **esperado** es lo presupuestado y todavía abierto por la tasa
histórica de cierre. El mes en curso no entra en las medias: está a medias y las tira
hacia abajo. Con menos de tres meses cerrados la pantalla avisa de que eso es una cuenta
y no una previsión.

### Comprobantes

Se sube una foto o un PDF por movimiento, hasta **4 MB** —el tope no es caprichoso:
Vercel corta el cuerpo de una petición en 4,5 MB—. Se guardan en la base como los PDF de
presupuesto, pero con una diferencia deliberada: aquél viaja por WhatsApp y su token es
toda la protección; **éstos exigen sesión** además del token.

El filtro *Sin comprobante* deja ver de un vistazo lo que falta respaldar.

Mismo aviso de capacidad que los presupuestos: el plan gratuito da 0,5 GB. El pie de la
tabla muestra cuánto se lleva usado; cuando apriete, el binario se mueve a Vercel Blob y
sólo queda el enlace —la tabla ya está separada para que ese cambio no toque nada más—.

### Probarlo

```bash
docker compose exec web node scripts/smoke-finanzas.mjs
```

Recorre el circuito entero contra el entorno local: sesión, altas, validaciones,
generación del mes por duplicado, subida y descarga de comprobantes, las cuentas y la
página. No es un framework de tests —el repo no tiene ninguno— pero cubre lo que da miedo.

### Un solo dominio

El sitio responde por tres nombres —el canónico, `sansermetalurgica.com` y el
`sansermetalurgica.vercel.app` que Vercel le asigna al proyecto— y los dos últimos
redirigen al bueno con **308**, conservando ruta y query. Eso lo hace
[`proxy.ts`](proxy.ts), no el panel de Vercel: si la redirección vive sólo en el panel,
basta que alguien la toque para que Google vuelva a indexar dos sitios sin que quede
rastro en el código.

Sólo actúa en producción: las vistas previas siguen sirviendo en su propia URL, que es
para lo que existen.

Y si un host equivocado ya está indexado, esto no lo borra: hay que esperar a que Google
lo vuelva a rastrear y vea el 308 —de una a cuatro semanas—. Nunca convertirlo en 404: el
redirect permanente traspasa la autoridad al dominio bueno y el 404 la tira.

### Variables de entorno

| Variable            | Para qué                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`      | Postgres donde viven los leads. En producción, la cadena de Neon.         |
| `ADMIN_PASSWORD`    | Contraseña de acceso a `/admin`.                                          |
| `AUTH_SECRET`       | Clave con la que se firma la cookie de sesión (cadena larga y aleatoria). |
| `FORMSPREE_ENABLED` | Opcional. `true` fuerza los correos (formulario y avisos) fuera de producción. |
| `LEAD_NOTIFY_ENDPOINT` | Opcional. Destino de los avisos de lead; por defecto, el Formspree del formulario. |

En local ya vienen puestas en `docker-compose.yml` (contraseña `sanser-local`).
Si falta alguna, el sitio sigue funcionando y `/admin` avisa de lo que falta en vez de romper.

Fuera de producción el formulario **no** reenvía a Formspree, para no llenar de pruebas
la casilla de SANSER; el lead sí se guarda en el CRM.

### Puesta en producción

1. Crear una base Postgres (Neon desde el marketplace de Vercel) y copiar su connection string.
2. Cargar `DATABASE_URL`, `ADMIN_PASSWORD` y `AUTH_SECRET` en el proyecto de Vercel.
3. Aplicar el esquema una vez contra esa base:
   `DATABASE_URL="postgres://…" node scripts/migrate.mjs`
4. Entrar a `https://…/admin` con la contraseña.

El esquema vive en [`db/schema.sql`](db/schema.sql) y es idempotente: se puede
volver a aplicar cada vez que cambie.

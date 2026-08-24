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
| `presupuesto` | se genera un PDF en el cotizador (medidas y total)     |
| `whatsapp`    | se abre WhatsApp desde el modal o desde el cotizador   |

De cada lead se guarda además el contexto de la visita: página de origen, referrer,
user agent, IP y —en producción, vía cabeceras de Vercel— ciudad, provincia y país.
Desde el panel se cambia el estado (nuevo → contactado → presupuestado → ganado/perdido),
se escriben notas, se dan de alta registros a mano y se exporta todo a CSV.

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

### El cotizador, público e interno

`/cotizar` es público: el visitante elige medidas, ve su estructura en 3D, deja nombre y
teléfono y se descarga el presupuesto en PDF — con lo que entra al CRM como lead. Los
precios y los ítems son de sólo lectura para él: el PDF lleva el membrete de SANSER y
cualquiera podría fabricar uno con cifras inventadas.

Quien tenga **sesión abierta en `/admin`** ve la misma página en modo interno, con los
ítems, los precios, el título, el CUIT, la fecha y las fotos editables. Es la misma ruta,
así que leer la cookie la vuelve dinámica; a cambio no hay dos páginas casi iguales que
mantener.

El botón de WhatsApp también cambia de destino: el vendedor le escribe al cliente (y eso
marca el presupuesto como *contactado*), mientras que el visitante nos escribe a nosotros
(y eso sólo queda anotado en la ficha, sin tocar el estado: nadie respondió todavía).

Aviso: el PDF se genera en el navegador, así que quien sepa usar las herramientas de
desarrollo puede saltarse el bloqueo. Cerrar esa puerta del todo exige generar el PDF en
el servidor.

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

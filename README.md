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
se escriben notas y se exporta todo a CSV.

### Variables de entorno

| Variable            | Para qué                                                                 |
| ------------------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`      | Postgres donde viven los leads. En producción, la cadena de Neon.         |
| `ADMIN_PASSWORD`    | Contraseña de acceso a `/admin`.                                          |
| `AUTH_SECRET`       | Clave con la que se firma la cookie de sesión (cadena larga y aleatoria). |
| `FORMSPREE_ENABLED` | Opcional. `true` fuerza el reenvío a Formspree también fuera de producción. |

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

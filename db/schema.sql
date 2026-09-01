-- Esquema del CRM. Idempotente: se puede correr tantas veces como haga falta.

CREATE TABLE IF NOT EXISTS leads (
  id            BIGSERIAL PRIMARY KEY,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- Qué originó el lead: formulario de contacto, presupuesto del cotizador
  -- o un clic al WhatsApp.
  kind          TEXT         NOT NULL CHECK (kind IN ('contacto', 'presupuesto', 'whatsapp')),

  -- Seguimiento comercial
  status        TEXT         NOT NULL DEFAULT 'nuevo'
                             CHECK (status IN ('nuevo', 'contactado', 'presupuestado', 'ganado', 'perdido')),
  notes         TEXT,

  -- Datos del cliente (todos opcionales: un clic a WhatsApp no trae ninguno)
  name          TEXT,
  phone         TEXT,
  cuit          TEXT,
  message       TEXT,

  -- Detalle del presupuesto, cuando kind = 'presupuesto'
  quote_title   TEXT,
  quote_total   NUMERIC(14,2),
  quote_config  JSONB,

  -- Contexto de la visita
  source_path   TEXT,
  referrer      TEXT,
  user_agent    TEXT,
  ip            TEXT,
  city          TEXT,
  region        TEXT,
  country       TEXT
);

CREATE INDEX IF NOT EXISTS leads_created_at_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_kind_idx       ON leads (kind);
CREATE INDEX IF NOT EXISTS leads_status_idx     ON leads (status);

-- PDFs de los presupuestos, para poder mandarlos por WhatsApp sin adjuntar a
-- mano. Van en su propia tabla: el bytea no debe engordar cada SELECT de leads.
CREATE TABLE IF NOT EXISTS lead_pdfs (
  lead_id     BIGINT       PRIMARY KEY REFERENCES leads(id) ON DELETE CASCADE,
  -- El enlace viaja por WhatsApp, así que el token tiene que ser impredecible.
  token       UUID         NOT NULL DEFAULT gen_random_uuid(),
  content     BYTEA        NOT NULL,
  size_bytes  INTEGER      NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS lead_pdfs_token_idx ON lead_pdfs (token);

-- Para agrupar el historial de un mismo cliente por teléfono.
CREATE INDEX IF NOT EXISTS leads_phone_idx ON leads (phone);

-- Estado del documento, distinto del estado comercial: mientras es borrador
-- Santi puede tocarlo, y sólo al confirmarlo se convierte en presupuesto
-- entregado. El número se asigna en ese momento, no antes.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_state  TEXT NOT NULL DEFAULT 'borrador'
  CHECK (quote_state IN ('borrador', 'confirmado'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS quote_number TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS leads_quote_number_idx ON leads (quote_number)
  WHERE quote_number IS NOT NULL;

-- Serie correlativa de presupuestos. No se reinicia cada año: el año va en el
-- prefijo y así el número nunca se repite.
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

-- ───────────────────────────────────────────────────────── gestión de gastos

-- Un solo libro para todo el dinero que entra y sale, con el tipo como columna
-- en vez de una tabla por cada cosa. Casi toda pregunta del negocio es «sumá el
-- período y agrupá por tipo»; con cuatro tablas eso son cuatro consultas y una
-- unión, y además el gasto imputado a una obra dejaría de ser un simple JOIN.
--
-- El monto va siempre en positivo: el signo lo pone el tipo. Guardar negativos
-- invita a que un ingreso mal cargado reste sin que nadie lo note.
CREATE TABLE IF NOT EXISTS fin_movimientos (
  id          BIGSERIAL    PRIMARY KEY,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),

  -- La fecha del hecho económico, no la de carga: si Santi carga en marzo una
  -- factura de febrero, el mes de febrero tiene que cambiar.
  fecha       DATE         NOT NULL,

  tipo        TEXT         NOT NULL
                           CHECK (tipo IN ('ingreso', 'fijo', 'variable', 'produccion')),

  concepto    TEXT         NOT NULL,
  categoria   TEXT,
  monto       NUMERIC(14,2) NOT NULL CHECK (monto > 0),

  medio_pago  TEXT,
  proveedor   TEXT,
  notas       TEXT,

  -- La obra a la que se imputa. Sin esto no hay rentabilidad por obra, que es
  -- la única cifra que dice si un tinglado se hizo ganando o perdiendo plata.
  -- ON DELETE SET NULL: borrar un lead no puede llevarse por delante el gasto,
  -- que ya ocurrió y tiene que seguir contando en el mes.
  lead_id     BIGINT       REFERENCES leads(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS fin_mov_fecha_idx   ON fin_movimientos (fecha DESC);
CREATE INDEX IF NOT EXISTS fin_mov_tipo_idx    ON fin_movimientos (tipo);
CREATE INDEX IF NOT EXISTS fin_mov_lead_idx    ON fin_movimientos (lead_id);

-- Los gastos fijos se repiten todos los meses, pero se guardan igual como
-- movimientos reales: el libro tiene que decir lo que se pagó, no lo que
-- tendría que pagarse. Esto es sólo la lista para no volver a tipearlos, y un
-- botón que genera el mes a partir de ella.
CREATE TABLE IF NOT EXISTS fin_gastos_fijos (
  id          BIGSERIAL    PRIMARY KEY,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  concepto    TEXT         NOT NULL,
  categoria   TEXT,
  monto       NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  proveedor   TEXT,
  -- Un fijo dado de baja no se borra: los meses ya generados lo siguen teniendo.
  activo      BOOLEAN      NOT NULL DEFAULT true,
  -- Día del mes en que suele pagarse. Sólo para ordenar y para la fecha que se
  -- propone al generar.
  dia_pago    SMALLINT     CHECK (dia_pago BETWEEN 1 AND 31)
);

-- Generar dos veces el mismo mes no puede duplicar el alquiler. Se marca de qué
-- plantilla y de qué mes salió cada movimiento generado, y el par es único.
ALTER TABLE fin_movimientos ADD COLUMN IF NOT EXISTS fijo_id BIGINT
  REFERENCES fin_gastos_fijos(id) ON DELETE SET NULL;
ALTER TABLE fin_movimientos ADD COLUMN IF NOT EXISTS periodo TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS fin_mov_fijo_periodo_idx
  ON fin_movimientos (fijo_id, periodo)
  WHERE fijo_id IS NOT NULL AND periodo IS NOT NULL;

-- Comprobantes. Mismo patrón que lead_pdfs —el binario en su propia tabla para
-- no engordar cada SELECT—, pero con una diferencia deliberada: el de un
-- presupuesto viaja por WhatsApp y por eso su token es toda la protección;
-- éstos son internos y además exigen sesión para descargarse.
CREATE TABLE IF NOT EXISTS fin_comprobantes (
  id            BIGSERIAL    PRIMARY KEY,
  movimiento_id BIGINT       NOT NULL REFERENCES fin_movimientos(id) ON DELETE CASCADE,
  token         UUID         NOT NULL DEFAULT gen_random_uuid(),
  filename      TEXT         NOT NULL,
  mime          TEXT         NOT NULL,
  content       BYTEA        NOT NULL,
  size_bytes    INTEGER      NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS fin_comprobantes_token_idx ON fin_comprobantes (token);
CREATE INDEX IF NOT EXISTS fin_comprobantes_mov_idx ON fin_comprobantes (movimiento_id);

-- ────────────────────────────────────── limpieza del CRM y agrupado por cliente

-- Borrado lógico. Las pruebas internas ensucian la lista, pero borrar de verdad
-- se lleva por delante el historial del cliente y los gastos imputados a esa
-- obra. Se marca la fecha y se esconde; lo que se borró sigue ahí para
-- recuperarlo.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Índice parcial: la consulta de todos los días es «los que NO están borrados»,
-- y así el índice sólo pesa lo que ocupa lo vivo.
CREATE INDEX IF NOT EXISTS leads_vivos_idx ON leads (created_at DESC)
  WHERE deleted_at IS NULL;

-- Clave de cliente a partir del teléfono.
--
-- Hasta ahora se agrupaba comparando la cadena tal cual, así que «+54 3743
-- 48-7728», «03743 48-7728» y «3743487728» eran tres clientes distintos y el
-- historial no encontraba nada. Se queda con los dígitos y con los últimos diez:
-- eso deja fuera el prefijo de país y el 0 de larga distancia, y conserva
-- característica más número.
--
-- Es una columna generada para que la calcule Postgres: si se hiciera al
-- insertar, cada camino de alta —formulario, cotizador, alta manual— tendría que
-- acordarse, y alguno se olvidaría.
ALTER TABLE leads ADD COLUMN IF NOT EXISTS phone_key TEXT
  GENERATED ALWAYS AS (
    NULLIF(RIGHT(REGEXP_REPLACE(COALESCE(phone, ''), '\D', '', 'g'), 10), '')
  ) STORED;

CREATE INDEX IF NOT EXISTS leads_phone_key_idx ON leads (phone_key)
  WHERE phone_key IS NOT NULL;

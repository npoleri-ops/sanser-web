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

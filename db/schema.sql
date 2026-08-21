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

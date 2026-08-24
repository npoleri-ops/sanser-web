import { query } from "./db"

// Un presupuesto con render 3D ronda 1 MB. Por encima de 4 no lo guardamos:
// sería un PDF anómalo y Neon no está para almacenar archivos grandes.
export const MAX_PDF_BYTES = 4 * 1024 * 1024

export interface StoredPdf {
  token: string
  size_bytes: number
}

/** Guarda (o reemplaza) el PDF de un presupuesto y devuelve su token público. */
export async function savePdf(leadId: string, base64: string): Promise<StoredPdf | null> {
  const content = Buffer.from(base64, "base64")
  if (content.length === 0 || content.length > MAX_PDF_BYTES) return null

  const rows = await query<StoredPdf>(
    `INSERT INTO lead_pdfs (lead_id, content, size_bytes)
     VALUES ($1, $2, $3)
     ON CONFLICT (lead_id) DO UPDATE
       SET content = EXCLUDED.content,
           size_bytes = EXCLUDED.size_bytes,
           created_at = now()
     RETURNING token, size_bytes`,
    [leadId, content, content.length],
  )

  return rows[0] ?? null
}

export async function getPdfByToken(token: string) {
  const rows = await query<{ content: Buffer; lead_id: string }>(
    `SELECT content, lead_id FROM lead_pdfs WHERE token = $1`,
    [token],
  )
  return rows[0] ?? null
}

export async function getPdfTokenForLead(leadId: string) {
  const rows = await query<{ token: string }>(
    `SELECT token FROM lead_pdfs WHERE lead_id = $1`,
    [leadId],
  )
  return rows[0]?.token ?? null
}

import { NextResponse } from "next/server"
import { getPdfByToken } from "@/lib/crm/pdfs"

/**
 * Sirve el PDF de un presupuesto por su token. El enlace se manda al cliente
 * por WhatsApp, así que no pide sesión: la protección es que el token es un
 * UUID aleatorio y no se puede adivinar.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  // Sin este filtro, un token con formato raro llegaría a Postgres y reventaría
  // la consulta con un error de tipo en vez de un 404 limpio.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)) {
    return new NextResponse("No encontrado", { status: 404 })
  }

  const pdf = await getPdfByToken(token)
  if (!pdf) return new NextResponse("No encontrado", { status: 404 })

  return new NextResponse(new Uint8Array(pdf.content), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="Presupuesto_SANSER.pdf"',
      "Cache-Control": "private, max-age=3600",
    },
  })
}

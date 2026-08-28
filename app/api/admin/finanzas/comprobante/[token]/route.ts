import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { getComprobantePorToken } from "@/lib/finanzas/comprobantes"

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/**
 * Sirve un comprobante. A diferencia del PDF de presupuesto —que va por WhatsApp
 * y por eso se apoya sólo en lo impredecible del token—, esto son papeles
 * internos: exige sesión del panel además del token.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!(await isAuthenticated())) return new NextResponse("No autorizado", { status: 401 })

  const { token } = await params
  // Sin este filtro un token con formato raro llega a Postgres y revienta la
  // consulta con un error de tipo en vez de devolver un 404 limpio.
  if (!ES_UUID.test(token)) return new NextResponse("No encontrado", { status: 404 })

  const c = await getComprobantePorToken(token)
  if (!c) return new NextResponse("No encontrado", { status: 404 })

  return new NextResponse(new Uint8Array(c.content), {
    headers: {
      "Content-Type": c.mime,
      // inline para poder mirarlo sin descargarlo; el nombre se conserva por si
      // se guarda. Entre comillas y sin las que traiga el original, o una comilla
      // en el nombre parte la cabecera.
      "Content-Disposition": `inline; filename="${c.filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  })
}

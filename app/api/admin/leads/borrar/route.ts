import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { borrarLeads, restaurarLeads } from "@/lib/crm/leads"

/**
 * Borra o restaura en lote. En lote porque el caso real es limpiar de una vez
 * los registros de prueba de meses, no borrarlos de a uno.
 *
 * Ruta propia en vez de un DELETE sobre la colección: hay que mandar la lista de
 * ids en el cuerpo, y un DELETE con cuerpo es de esas cosas que algunos
 * intermediarios se comen sin avisar.
 */
export async function POST(req: Request) {
  if (!(await isAuthenticated())) return NextResponse.json({ ok: false }, { status: 401 })

  const body = await req.json().catch(() => null)
  const ids = Array.isArray(body?.ids) ? body.ids.map(String) : []
  if (ids.length === 0 || !ids.every((id: string) => /^\d+$/.test(id))) {
    return NextResponse.json({ ok: false, error: "Lista de ids inválida" }, { status: 400 })
  }

  const restaurar = body?.accion === "restaurar"
  const afectados = restaurar ? await restaurarLeads(ids) : await borrarLeads(ids)

  return NextResponse.json({ ok: true, afectados, accion: restaurar ? "restaurar" : "borrar" })
}

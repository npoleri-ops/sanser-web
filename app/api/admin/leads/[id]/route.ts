import { NextResponse } from "next/server"
import { isAuthenticated } from "@/lib/crm/auth"
import { getLead } from "@/lib/crm/leads"
import { savePdf } from "@/lib/crm/pdfs"

/** Devuelve un lead suelto: lo usa el cotizador al reabrir un presupuesto. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const lead = await getLead(id)
  if (!lead) return NextResponse.json({ ok: false }, { status: 404 })

  return NextResponse.json({ ok: true, lead })
}

function publicOrigin(req: Request) {
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
  if (!host) return new URL(req.url).origin
  const proto = req.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}

/** Guarda el PDF definitivo de un presupuesto ya confirmado. */
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const { id } = await params
  if (!/^\d+$/.test(id)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const { pdfBase64 } = await req.json()
  if (typeof pdfBase64 !== "string" || !pdfBase64) {
    return NextResponse.json({ ok: false, message: "Falta el PDF" }, { status: 400 })
  }

  const pdf = await savePdf(id, pdfBase64)
  if (!pdf) {
    return NextResponse.json({ ok: false, message: "PDF no válido" }, { status: 400 })
  }

  return NextResponse.json({
    ok: true,
    pdfToken: pdf.token,
    pdfUrl: `${publicOrigin(req)}/api/presupuesto/${pdf.token}`,
  })
}

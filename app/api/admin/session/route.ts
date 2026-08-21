import { NextResponse } from "next/server"
import { checkPassword, createSessionCookie, destroySessionCookie } from "@/lib/crm/auth"

export async function POST(req: Request) {
  let password: unknown
  try {
    password = (await req.json())?.password
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (!checkPassword(password)) {
    // Un pequeño retardo encarece probar contraseñas a lo bruto.
    await new Promise(r => setTimeout(r, 600))
    return NextResponse.json({ ok: false, message: "Contraseña incorrecta" }, { status: 401 })
  }

  await createSessionCookie()
  return NextResponse.json({ ok: true })
}

export async function DELETE() {
  await destroySessionCookie()
  return NextResponse.json({ ok: true })
}

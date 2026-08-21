import { cookies } from "next/headers"

const COOKIE_NAME = "sanser_crm"
const MAX_AGE_SECONDS = 60 * 60 * 12 // 12 h

function getSecret() {
  const secret = process.env.AUTH_SECRET
  if (!secret) throw new Error("Falta AUTH_SECRET: no se puede firmar la sesión del CRM.")
  return secret
}

/**
 * Qué falta por configurar. Permite desplegar sin variables de entorno y que el
 * panel lo explique, en vez de reventar con un 500.
 */
export function missingCrmConfig() {
  const missing: string[] = []
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL")
  if (!process.env.ADMIN_PASSWORD) missing.push("ADMIN_PASSWORD")
  if (!process.env.AUTH_SECRET) missing.push("AUTH_SECRET")
  return missing
}

async function sign(value: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))
  return Buffer.from(signature).toString("base64url")
}

/** Comparación en tiempo constante: evita filtrar la firma a base de reintentos. */
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export async function createSessionCookie() {
  const expiresAt = String(Date.now() + MAX_AGE_SECONDS * 1000)
  const token = `${expiresAt}.${await sign(expiresAt)}`
  const store = await cookies()
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  })
}

export async function destroySessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

export async function isAuthenticated() {
  if (!process.env.AUTH_SECRET) return false

  const token = (await cookies()).get(COOKIE_NAME)?.value
  if (!token) return false

  const [expiresAt, signature] = token.split(".")
  if (!expiresAt || !signature) return false
  if (Number(expiresAt) < Date.now()) return false

  return safeEqual(signature, await sign(expiresAt))
}

export function checkPassword(candidate: unknown) {
  const expected = process.env.ADMIN_PASSWORD
  // Sin contraseña configurada no se entra: el panel nunca queda abierto.
  if (!expected) return false
  return typeof candidate === "string" && safeEqual(candidate, expected)
}

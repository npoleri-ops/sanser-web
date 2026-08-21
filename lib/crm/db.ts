import { Pool } from "pg"

// En desarrollo Next recarga los módulos en cada cambio; sin cachear el pool en
// globalThis acabaríamos abriendo una conexión nueva por recarga.
const globalForPool = globalThis as unknown as { sanserPool?: Pool }

export function getPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error("Falta DATABASE_URL: el CRM no puede guardar ni leer leads.")
  }

  if (!globalForPool.sanserPool) {
    globalForPool.sanserPool = new Pool({
      connectionString,
      // Neon y la mayoría de Postgres gestionados exigen TLS; el Postgres local
      // del docker-compose no lo tiene.
      ssl: connectionString.includes("localhost") || connectionString.includes("@db:")
        ? undefined
        : { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    })
  }

  return globalForPool.sanserPool
}

export async function query<T>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await getPool().query(text, params)
  return result.rows as T[]
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

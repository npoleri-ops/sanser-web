// Aplica db/schema.sql contra DATABASE_URL. Idempotente.
import { readFileSync } from "node:fs"
import { Client } from "pg"

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error("Falta DATABASE_URL")
  process.exit(1)
}

const client = new Client({
  connectionString,
  ssl: connectionString.includes("localhost") || connectionString.includes("@db:")
    ? undefined
    : { rejectUnauthorized: false },
})

await client.connect()
await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"))
await client.end()
console.log("Esquema aplicado sobre", connectionString.replace(/:[^:@]*@/, ":***@"))

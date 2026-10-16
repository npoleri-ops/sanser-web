import { readFileSync, existsSync } from "node:fs"
import { Client } from "pg"

for (const envFile of [".env.local", ".env"]) {
  if (existsSync(envFile)) {
    try {
      process.loadEnvFile(envFile)
      break
    } catch {}
  }
}

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

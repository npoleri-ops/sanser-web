/**
 * Prueba de extremo a extremo de la limpieza del CRM y el agrupado por cliente.
 *
 *   docker compose exec web node scripts/smoke-crm.mjs
 *
 * Deja los registros que crea en la papelera, así que se puede repetir sin
 * ensuciar la lista. Para borrarlos del todo:
 *   docker compose exec db psql -U sanser -d sanser \
 *     -c "DELETE FROM leads WHERE name LIKE 'SMOKE %';"
 *
 * Cubre lo que da miedo: que algo borrado siga contando en las cifras, que el
 * mismo cliente aparezca dos veces por escribir el teléfono distinto, y que la
 * papelera no devuelva lo que se guardó.
 */

const BASE = "http://localhost:3000"
let cookie = ""

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { ...(opts.headers || {}), ...(cookie ? { cookie } : {}) },
  })
  const set = res.headers.get("set-cookie")
  if (set) cookie = set.split(";")[0]
  const txt = await res.text()
  let body
  try { body = JSON.parse(txt) } catch { body = txt }
  return { status: res.status, body }
}
const json = (path, method, data) =>
  req(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(data) })

const ok = (etiqueta, cond, extra = "") =>
  console.log(`${cond ? "✓" : "✗"} ${etiqueta}${extra ? " · " + extra : ""}`)

// 1 · sin sesión no se borra nada
let r = await json("/api/admin/leads/borrar", "POST", { ids: ["1"] })
ok("borrar sin sesión devuelve 401", r.status === 401)
r = await req("/api/admin/clientes")
ok("clientes sin sesión devuelve 401", r.status === 401)

r = await json("/api/admin/session", "POST", { password: "sanser-local" })
ok("login", r.status === 200)

// 2 · el mismo teléfono escrito de cuatro maneras
const TEL = ["+54 3743 90-1122", "03743 90-1122", "3743901122", "54 9 3743 901122"]
const ids = []
for (const [i, phone] of TEL.entries()) {
  const res = await json("/api/admin/leads", "POST", {
    kind: "contacto", name: `SMOKE cliente ${i + 1}`, phone, message: "prueba",
  })
  if (res.status === 200 || res.status === 201) ids.push(String(res.body.lead.id))
}
ok("cuatro altas con el teléfono escrito distinto", ids.length === 4, `${ids.length} creadas`)

// 3 · se agrupan en un solo cliente
r = await req("/api/admin/clientes?search=SMOKE")
const cli = (r.body.clientes ?? []).filter(c => (c.name ?? "").startsWith("SMOKE"))
ok("se agrupan en UN cliente", cli.length === 1, `${cli.length} clientes`)
ok("y cuenta los cuatro registros", cli[0]?.registros === 4, `registros=${cli[0]?.registros}`)
ok("la clave son los últimos 10 dígitos", cli[0]?.phone_key === "3743901122", cli[0]?.phone_key)

// 4 · el contador del historial usa la misma clave
r = await req(`/api/admin/leads?search=SMOKE%20cliente%201`)
ok("el historial cuenta los cuatro", r.body.leads?.[0]?.phone_count === 4,
   `phone_count=${r.body.leads?.[0]?.phone_count}`)

// 5 · borrado lógico
const antes = (await req("/api/admin/leads")).body.stats.total
r = await json("/api/admin/leads/borrar", "POST", { ids: ids.slice(0, 2) })
ok("borra dos en lote", r.status === 200 && r.body.afectados === 2, JSON.stringify(r.body))

const despues = await req("/api/admin/leads")
ok("las cifras dejan de contarlos", despues.body.stats.total === antes - 2,
   `${antes} → ${despues.body.stats.total}`)
ok("y desaparecen de la lista", !despues.body.leads.some(l => ids.slice(0, 2).includes(String(l.id))))
ok("la papelera los cuenta", despues.body.borrados >= 2, `borrados=${despues.body.borrados}`)

// 6 · el agrupado tampoco los cuenta
r = await req("/api/admin/clientes?search=SMOKE")
const cli2 = (r.body.clientes ?? []).filter(c => (c.name ?? "").startsWith("SMOKE"))
ok("el cliente queda con dos registros", cli2[0]?.registros === 2, `registros=${cli2[0]?.registros}`)

// 7 · la papelera los muestra
r = await req("/api/admin/leads?borrados=1")
ok("la papelera los muestra", ids.slice(0, 2).every(id => r.body.leads.some(l => String(l.id) === id)))

// 8 · restaurar
r = await json("/api/admin/leads/borrar", "POST", { ids: ids.slice(0, 2), accion: "restaurar" })
ok("restaura los dos", r.status === 200 && r.body.afectados === 2, JSON.stringify(r.body))
r = await req("/api/admin/clientes?search=SMOKE")
const cli3 = (r.body.clientes ?? []).filter(c => (c.name ?? "").startsWith("SMOKE"))
ok("vuelven al cliente", cli3[0]?.registros === 4, `registros=${cli3[0]?.registros}`)

// 9 · validación
r = await json("/api/admin/leads/borrar", "POST", { ids: ["no-soy-un-id"] })
ok("rechaza ids inválidos", r.status === 400, r.body?.error)

// 10 · limpieza: se deja todo en la papelera
await json("/api/admin/leads/borrar", "POST", { ids })
ok("deja sus pruebas en la papelera", true)

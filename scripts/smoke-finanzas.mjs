/**
 * Prueba de extremo a extremo del gestor de gastos, contra el entorno local.
 *
 *   docker compose exec web node scripts/smoke-finanzas.mjs
 *
 * Deja datos de prueba en la base local. Para repetirla desde cero:
 *   docker compose exec db psql -U sanser -d sanser \
 *     -c "TRUNCATE fin_comprobantes, fin_movimientos, fin_gastos_fijos RESTART IDENTITY CASCADE;"
 *
 * No es un framework de tests —el repo no tiene ninguno todavía— pero cubre lo
 * que da miedo: que se pueda entrar sin sesión, que los números no cuadren, que
 * generar el mes dos veces duplique los fijos, y que se cuele un archivo que no
 * es un comprobante.
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
  // Sin recortar: una página entera no es JSON y comprobar su contenido
  // mirando sólo los primeros caracteres daba un falso negativo.
  try { body = JSON.parse(txt) } catch { body = txt }
  return { status: res.status, body }
}
const json = (path, method, data) =>
  req(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(data) })

const ok = (etiqueta, cond, extra = "") =>
  console.log(`${cond ? "✓" : "✗"} ${etiqueta}${extra ? " · " + extra : ""}`)

const hoy = new Date().toLocaleDateString("en-CA")
const mes = hoy.slice(0, 7)

// 1 · sin sesión no se entra
let r = await req("/api/admin/finanzas/movimientos")
ok("sin sesión devuelve 401", r.status === 401)

// 2 · login
r = await json("/api/admin/session", "POST", { password: "sanser-local" })
ok("login", r.status === 200)

// 3 · alta de movimientos
const lead = "1"
const altas = [
  { fecha: hoy, tipo: "ingreso", concepto: "Seña tinglado", monto: 3000000, leadId: lead, medio_pago: "Transferencia" },
  { fecha: hoy, tipo: "produccion", concepto: "Perfilería C", monto: 1200000, leadId: lead, proveedor: "Acindar" },
  { fecha: hoy, tipo: "produccion", concepto: "Pintura", monto: 300000, leadId: lead },
  { fecha: hoy, tipo: "variable", concepto: "Combustible", monto: 150000 },
]
const ids = []
for (const a of altas) {
  const res = await json("/api/admin/finanzas/movimientos", "POST", a)
  if (res.status === 201) ids.push(res.body.movimiento.id)
  ok(`alta ${a.tipo} ${a.concepto}`, res.status === 201, res.status !== 201 ? JSON.stringify(res.body) : "")
}

// 4 · validaciones
r = await json("/api/admin/finanzas/movimientos", "POST", { fecha: hoy, tipo: "ingreso", concepto: "x", monto: -5 })
ok("rechaza monto negativo", r.status === 400, r.body?.error)
r = await json("/api/admin/finanzas/movimientos", "POST", { fecha: "29-08-2026", tipo: "ingreso", concepto: "x", monto: 5 })
ok("rechaza fecha mal formada", r.status === 400, r.body?.error)

// 5 · gastos fijos + generar dos veces
r = await json("/api/admin/finanzas/fijos", "POST", { concepto: "Alquiler galpón", monto: 800000, dia_pago: 5 })
ok("alta de gasto fijo", r.status === 201)
r = await json("/api/admin/finanzas/fijos/generar", "POST", { periodo: mes })
ok("generar el mes", r.status === 200 && r.body.creados === 1, JSON.stringify(r.body))
r = await json("/api/admin/finanzas/fijos/generar", "POST", { periodo: mes })
ok("generar dos veces NO duplica", r.status === 200 && r.body.creados === 0, JSON.stringify(r.body))

// 6 · comprobante
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
)
const fd = new FormData()
fd.set("movimientoId", ids[1])
fd.set("file", new File([png], "factura.png", { type: "image/png" }))
r = await req("/api/admin/finanzas/comprobantes", { method: "POST", body: fd })
ok("subir comprobante", r.status === 201, JSON.stringify(r.body).slice(0, 80))
const token = r.body?.comprobante?.token

const fd2 = new FormData()
fd2.set("movimientoId", ids[1])
fd2.set("file", new File([Buffer.from("x")], "malo.exe", { type: "application/x-msdownload" }))
r = await req("/api/admin/finanzas/comprobantes", { method: "POST", body: fd2 })
ok("rechaza tipo no permitido", r.status === 415, r.body?.error)

// 7 · descarga del comprobante exige sesión
const guardada = cookie
cookie = ""
r = await req(`/api/admin/finanzas/comprobante/${token}`)
ok("comprobante sin sesión devuelve 401", r.status === 401)
cookie = guardada
r = await req(`/api/admin/finanzas/comprobante/${token}`)
ok("comprobante con sesión se descarga", r.status === 200)

// 8 · los números
// Hasta hoy, no hasta un día fijo: con el 28 escrito a mano, el rango dejaba
// fuera los movimientos en cuanto el mes pasaba de esa fecha.
r = await req(`/api/admin/finanzas/resumen?desde=${mes}-01&hasta=${hoy}`)
const s = r.body.resumen
ok("ingresos = 3.000.000", s.ingresos === 3000000, String(s.ingresos))
ok("producción = 1.500.000", s.produccion === 1500000, String(s.produccion))
ok("variables = 150.000", s.variables === 150000, String(s.variables))
ok("fijos = 800.000", s.fijos === 800000, String(s.fijos))
ok("gastos = 2.450.000", s.gastos === 2450000, String(s.gastos))
ok("resultado = 550.000", s.resultado === 550000, String(s.resultado))
ok("margen ≈ 18,3 %", Math.abs(s.margen - 550000 / 3000000) < 1e-9, (s.margen * 100).toFixed(1) + " %")

const obra = r.body.obras[0]
ok("rentabilidad por obra", obra && obra.cobrado === 3000000 && obra.costo === 1500000,
   obra ? `cobrado ${obra.cobrado} costo ${obra.costo} roi ${(obra.roi * 100).toFixed(0)}%` : "sin obra")
ok("pipeline y cierre calculados", r.body.proyeccion !== undefined,
   `cierre ${r.body.proyeccion.tasaCierre} · fijo/mes ${r.body.proyeccion.fijoMensual}`)

// 9 · filtros
r = await req("/api/admin/finanzas/movimientos?tipo=produccion")
ok("filtro por tipo", r.body.movimientos.every(m => m.tipo === "produccion"), `${r.body.total} filas`)
r = await req("/api/admin/finanzas/movimientos?sinComprobante=1")
ok("filtro sin comprobante", r.body.movimientos.every(m => (m.comprobantes ?? []).length === 0), `${r.body.total} filas`)
ok("la fecha vuelve como AAAA-MM-DD", /^\d{4}-\d{2}-\d{2}$/.test(r.body.movimientos[0].fecha), r.body.movimientos[0].fecha)

// 10 · borrado
r = await req(`/api/admin/finanzas/movimientos/${ids[3]}`, { method: "DELETE" })
ok("borrar movimiento", r.status === 200)

// 11 · la página
r = await req("/admin/finanzas")
ok("la página carga", r.status === 200 && String(r.body).includes("Plata de SANSER"))

// 12 · pagos: lo comprado y lo pagado
r = await json("/api/admin/finanzas/movimientos", "POST",
  { fecha: hoy, tipo: "produccion", concepto: "Chapa con tarjeta", monto: 400000, medio_pago: "Tarjeta", cuotas: 3, leadId: lead })
const conTarjeta = r.body.movimiento
ok("con tarjeta nace pendiente", r.status === 201 && conTarjeta.pagado === false && conTarjeta.cuotas === 3,
   `pagado=${conTarjeta?.pagado} cuotas=${conTarjeta?.cuotas}`)
r = await json("/api/admin/finanzas/movimientos", "POST",
  { fecha: hoy, tipo: "variable", concepto: "Flete en efectivo", monto: 50000, medio_pago: "Efectivo" })
const enEfectivo = r.body.movimiento
ok("en efectivo nace pagado", enEfectivo?.pagado === true && enEfectivo?.cuotas === null)
r = await json("/api/admin/finanzas/movimientos", "POST",
  { fecha: hoy, tipo: "ingreso", concepto: "Cobro raro", monto: 1000, pagado: false })
ok("un ingreso no queda nunca sin pagar", r.body.movimiento?.pagado === true)
await req(`/api/admin/finanzas/movimientos/${r.body.movimiento.id}`, { method: "DELETE" })

r = await req("/api/admin/finanzas/movimientos?pago=pendiente")
ok("filtro «falta pagar»", r.body.total >= 1 && r.body.movimientos.every(m => !m.pagado && m.tipo !== "ingreso"), `${r.body.total} filas`)
r = await req("/api/admin/finanzas/movimientos?medioPago=Tarjeta")
ok("filtro por medio", r.body.movimientos.every(m => m.medio_pago === "Tarjeta"), `${r.body.total} filas`)

r = await req(`/api/admin/finanzas/resumen?desde=${mes}-01&hasta=${hoy}`)
ok("lo pendiente suma la tarjeta", r.body.resumen.pendiente === 400000 && r.body.resumen.pendienteTarjeta === 400000,
   `pendiente ${r.body.resumen.pendiente} · tarjeta ${r.body.resumen.pendienteTarjeta}`)
const deLaObra = r.body.obras.find(o => o.lead_id === lead)
ok("la obra sabe lo que le falta pagar", deLaObra?.pendiente === 400000, String(deLaObra?.pendiente))

r = await json("/api/admin/finanzas/movimientos/pagar", "POST", { filtro: "pago=pendiente&medioPago=Tarjeta", pagado: true })
ok("pagar en lote sin fecha da error", r.status === 400, r.body?.error)
r = await json("/api/admin/finanzas/movimientos/pagar", "POST",
  { filtro: "pago=pendiente&medioPago=Tarjeta", pagado: true, fecha: hoy })
ok("pagar el resumen de la tarjeta", r.status === 200 && r.body.marcados === 1, JSON.stringify(r.body))
r = await req(`/api/admin/finanzas/movimientos/${conTarjeta.id}`)
ok("queda pagado con su fecha", r.body.movimiento.pagado === true && r.body.movimiento.pagado_en === hoy,
   `${r.body.movimiento.pagado} ${r.body.movimiento.pagado_en}`)
r = await json(`/api/admin/finanzas/movimientos/${conTarjeta.id}`, "PATCH", { pagado: false })
ok("se puede volver a pendiente", r.body.movimiento.pagado === false && r.body.movimiento.pagado_en === null)
r = await json("/api/admin/finanzas/movimientos/pagar", "POST", { ids: [conTarjeta.id, enEfectivo.id], pagado: true, fecha: hoy })
ok("pagar de a varios por id", r.body.marcados === 2, JSON.stringify(r.body))

// 13 · producción sin obra y obra asignada después
r = await json("/api/admin/finanzas/movimientos", "POST",
  { fecha: hoy, tipo: "produccion", concepto: "Perfil sin obra", monto: 70000, categoria: "Perfilería" })
const suelto = r.body.movimiento
r = await req(`/api/admin/finanzas/resumen?desde=${mes}-01&hasta=${hoy}`)
ok("avisa de la producción sin obra", r.body.resumen.produccionSinObraN === 1 && r.body.resumen.produccionSinObra === 70000,
   `${r.body.resumen.produccionSinObraN} · ${r.body.resumen.produccionSinObra}`)
r = await req("/api/admin/finanzas/movimientos?sinObra=1")
ok("filtro «producción sin obra»", r.body.total === 1 && r.body.movimientos[0].id === suelto.id, `${r.body.total} filas`)
r = await json(`/api/admin/finanzas/movimientos/${suelto.id}`, "PATCH", { lead_id: lead })
ok("asignar la obra después", r.body.movimiento.lead_id === lead)
r = await req("/api/admin/finanzas/movimientos?sinObra=1")
ok("ya no figura sin obra", r.body.total === 0)
r = await req(`/api/admin/finanzas/resumen?desde=${mes}-01&hasta=${hoy}`)
const conDesglose = r.body.obras.find(o => o.lead_id === lead)
ok("la obra lo suma en su desglose", conDesglose?.desglose.some(d => d.categoria === "Perfilería" && d.monto === 70000),
   JSON.stringify(conDesglose?.desglose))
ok("trae el costo por tinglado", typeof r.body.costoTinglado?.obras === "number", JSON.stringify(r.body.costoTinglado).slice(0, 90))

r = await json(`/api/admin/finanzas/movimientos/${enEfectivo.id}`, "PATCH", { lead_id: lead })
ok("un gasto variable no se imputa a una obra", r.body.movimiento.lead_id === null)

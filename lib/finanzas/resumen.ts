import { query } from "@/lib/crm/db"
import type { Proyeccion, RentabilidadObra, Resumen, SerieMes } from "./types"

/**
 * Los números del negocio.
 *
 * Sobre «ROI»: la palabra significa dos cosas distintas según a quién se le
 * pregunte, así que aquí se calculan las dos y cada una lleva su nombre en vez
 * de un único número ambiguo:
 *
 *  - margen  = (ingresos − gastos) / ingresos → de cada peso facturado, cuánto queda.
 *  - retorno = (ingresos − gastos) / gastos   → por cada peso puesto, cuánto vuelve.
 *
 * Y a nivel obra, `roi` es el retorno sobre lo que costó hacerla, que es la
 * lectura que sirve para decidir si conviene volver a tomar un trabajo así.
 */

const num = (v: string | null | undefined) => Number(v ?? 0)

/** Divide devolviendo null en vez de Infinity: un ROI sin costos no es infinito, es desconocido. */
function ratio(numerador: number, denominador: number): number | null {
  if (!denominador) return null
  return numerador / denominador
}

export async function resumen(desde: string, hasta: string): Promise<Resumen> {
  const rows = await query<{
    ingresos: string; fijos: string; variables: string; produccion: string
    movimientos: string; sin_comprobante: string
  }>(
    `SELECT
       COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::text    AS ingresos,
       COALESCE(SUM(monto) FILTER (WHERE tipo = 'fijo'), 0)::text       AS fijos,
       COALESCE(SUM(monto) FILTER (WHERE tipo = 'variable'), 0)::text   AS variables,
       COALESCE(SUM(monto) FILTER (WHERE tipo = 'produccion'), 0)::text AS produccion,
       COUNT(*)::text                                                   AS movimientos,
       COUNT(*) FILTER (
         WHERE NOT EXISTS (SELECT 1 FROM fin_comprobantes c WHERE c.movimiento_id = m.id)
       )::text                                                          AS sin_comprobante
     FROM fin_movimientos m
     WHERE fecha BETWEEN $1 AND $2`,
    [desde, hasta],
  )

  const r = rows[0]!
  const ingresos = num(r.ingresos)
  const fijos = num(r.fijos)
  const variables = num(r.variables)
  const produccion = num(r.produccion)
  const gastos = fijos + variables + produccion
  const resultado = ingresos - gastos

  return {
    desde,
    hasta,
    ingresos,
    fijos,
    variables,
    produccion,
    gastos,
    resultado,
    margen: ratio(resultado, ingresos),
    retorno: ratio(resultado, gastos),
    movimientos: num(r.movimientos),
    sinComprobante: num(r.sin_comprobante),
  }
}

/** Los últimos N meses, para ver la tendencia y no una foto suelta. */
export async function seriePorMes(meses = 12): Promise<SerieMes[]> {
  const rows = await query<{
    periodo: string; ingresos: string; fijos: string; variables: string; produccion: string
  }>(
    `SELECT to_char(fecha, 'YYYY-MM') AS periodo,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::text    AS ingresos,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'fijo'), 0)::text       AS fijos,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'variable'), 0)::text   AS variables,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'produccion'), 0)::text AS produccion
       FROM fin_movimientos
      WHERE fecha >= (date_trunc('month', CURRENT_DATE) - ($1::int - 1) * INTERVAL '1 month')::date
      GROUP BY 1
      ORDER BY 1`,
    [meses],
  )

  return rows.map(r => {
    const ingresos = num(r.ingresos)
    const fijos = num(r.fijos)
    const variables = num(r.variables)
    const produccion = num(r.produccion)
    return {
      periodo: r.periodo,
      ingresos, fijos, variables, produccion,
      resultado: ingresos - fijos - variables - produccion,
    }
  })
}

/**
 * Rentabilidad por obra. Sólo aparecen las que tienen algo imputado: una obra
 * sin gastos ni cobros cargados no dice nada y sólo ensucia la tabla.
 */
export async function rentabilidadObras(limite = 50): Promise<RentabilidadObra[]> {
  const rows = await query<{
    lead_id: string; quote_number: string | null; quote_title: string | null
    cliente: string | null; status: string; presupuestado: string | null
    cobrado: string; costo: string
  }>(
    `SELECT l.id AS lead_id,
            l.quote_number,
            l.quote_title,
            l.name AS cliente,
            l.status,
            l.quote_total::text AS presupuestado,
            COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'ingreso'), 0)::text    AS cobrado,
            COALESCE(SUM(m.monto) FILTER (WHERE m.tipo = 'produccion'), 0)::text AS costo
       FROM leads l
       JOIN fin_movimientos m ON m.lead_id = l.id
      GROUP BY l.id
      ORDER BY MAX(m.fecha) DESC
      LIMIT $1`,
    [limite],
  )

  return rows.map(r => {
    const cobrado = num(r.cobrado)
    const costo = num(r.costo)
    return {
      lead_id: r.lead_id,
      quote_number: r.quote_number,
      quote_title: r.quote_title,
      cliente: r.cliente,
      status: r.status,
      presupuestado: r.presupuestado ? Number(r.presupuestado) : null,
      cobrado,
      costo,
      resultado: cobrado - costo,
      roi: ratio(cobrado - costo, costo),
    }
  })
}

/**
 * Proyección. No adivina el futuro: proyecta lo que ya se sabe.
 *
 * El punto de equilibrio sale de dos cosas medidas —lo que cuestan los fijos al
 * mes y qué margen deja lo que se vende— y contesta la única pregunta que
 * importa a fin de mes: cuánto hay que facturar para no perder plata.
 *
 * Lo esperado del pipeline es lo abierto por la tasa histórica de cierre. Con
 * pocos presupuestos cerrados esa tasa es ruido, así que se devuelve también
 * cuántos meses de datos hay detrás y la pantalla lo advierte.
 */
export async function proyeccion(mesesBase = 6): Promise<Proyeccion> {
  // Media de fijos por mes, sobre meses cerrados: el mes en curso está a medias
  // y arrastraría la media hacia abajo.
  const [base] = await query<{
    fijos: string; ingresos: string; variables: string; produccion: string; meses: string
  }>(
    `SELECT COALESCE(SUM(monto) FILTER (WHERE tipo = 'fijo'), 0)::text       AS fijos,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'ingreso'), 0)::text    AS ingresos,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'variable'), 0)::text   AS variables,
            COALESCE(SUM(monto) FILTER (WHERE tipo = 'produccion'), 0)::text AS produccion,
            COUNT(DISTINCT to_char(fecha, 'YYYY-MM'))::text                  AS meses
       FROM fin_movimientos
      WHERE fecha >= (date_trunc('month', CURRENT_DATE) - $1::int * INTERVAL '1 month')::date
        AND fecha <  date_trunc('month', CURRENT_DATE)::date`,
    [mesesBase],
  )

  const meses = num(base?.meses) || 0
  const ingresos = num(base?.ingresos)
  const variables = num(base?.variables)
  const produccion = num(base?.produccion)

  const fijoMensual = meses ? num(base?.fijos) / meses : 0
  // Margen bruto: lo que deja la actividad antes de los fijos. Es el que sirve
  // para el equilibrio, porque los fijos son justamente lo que hay que cubrir.
  const margenBruto = ratio(ingresos - variables - produccion, ingresos)

  const [pipe] = await query<{ pipeline: string; ganados: string; perdidos: string }>(
    `SELECT COALESCE(SUM(quote_total) FILTER (
              WHERE status = 'presupuestado' AND quote_state = 'confirmado'), 0)::text AS pipeline,
            COUNT(*) FILTER (WHERE status = 'ganado')::text   AS ganados,
            COUNT(*) FILTER (WHERE status = 'perdido')::text  AS perdidos
       FROM leads
      WHERE kind = 'presupuesto'`,
  )

  const ganados = num(pipe?.ganados)
  const perdidos = num(pipe?.perdidos)
  const pipeline = num(pipe?.pipeline)
  const tasaCierre = ratio(ganados, ganados + perdidos)

  return {
    fijoMensual,
    margenBruto,
    puntoEquilibrio: margenBruto && margenBruto > 0 ? fijoMensual / margenBruto : null,
    pipeline,
    tasaCierre,
    esperado: tasaCierre === null ? null : pipeline * tasaCierre,
    mesesConDatos: meses,
  }
}

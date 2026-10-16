export const DEFAULT_PER_PAGE_FIN = 50

/**
 * Los cuatro tipos de movimiento. `ingreso` es plata que entró; los otros tres
 * son plata que salió, separados por cómo se comportan:
 *
 *  - fijo:       existe aunque no se venda nada (alquiler, sueldos, seguro).
 *  - variable:   acompaña a la actividad pero no es de una obra concreta
 *                (combustible, herramientas, fletes propios).
 *  - produccion: material y mano de obra de UNA obra. Es el único que se imputa
 *                a un lead, y sin él no hay rentabilidad por obra.
 *
 * La separación no es cosmética: los fijos son los que hay que cubrir para no
 * perder plata, y son la base del punto de equilibrio.
 */
export const TIPOS = ["ingreso", "fijo", "variable", "produccion"] as const
export type Tipo = (typeof TIPOS)[number]

export const TIPO_LABEL: Record<Tipo, string> = {
  ingreso: "Ingreso",
  fijo: "Gasto fijo",
  variable: "Gasto variable",
  produccion: "Gasto de producción",
}

export const ES_GASTO: Record<Tipo, boolean> = {
  ingreso: false,
  fijo: true,
  variable: true,
  produccion: true,
}

/** Sugerencias, no una lista cerrada: el rubro cambia y nadie quiere migrar. */
export const CATEGORIAS_SUGERIDAS: Record<Tipo, string[]> = {
  ingreso: ["Obra", "Seña", "Saldo", "Chapa suelta", "Otro"],
  fijo: ["Alquiler", "Sueldos", "Cargas sociales", "Seguro", "Servicios", "Contador", "Impuestos"],
  variable: ["Combustible", "Herramientas", "Flete", "Mantenimiento", "Papelería", "Publicidad"],
  produccion: ["Perfilería", "Chapa", "Pintura", "Bulonería", "Mano de obra", "Montaje", "Flete de obra"],
}

export const MEDIOS_PAGO = [
  "Efectivo",
  "Transferencia",
  "Cheque",
  "Tarjeta",
  "Mercado Pago",
  "Otro",
] as const

export interface Movimiento {
  id: string
  created_at: string
  updated_at: string
  /** Fecha del hecho económico, no la de carga. */
  fecha: string
  tipo: Tipo
  concepto: string
  categoria: string | null
  /** NUMERIC llega como string desde pg; no se convierte a number hasta mostrarlo. */
  monto: string
  medio_pago: string | null
  proveedor: string | null
  notas: string | null
  lead_id: string | null
  fijo_id: string | null
  periodo: string | null
  /** Si ya salió la plata. Un gasto con tarjeta se compra hoy y se paga con el resumen. */
  pagado: boolean
  /** Cuándo se pagó, si no fue el mismo día de la compra. */
  pagado_en: string | null
  /** Cuotas de la tarjeta, si se pagó así. */
  cuotas: number | null
  /** Datos de la obra imputada, para no pedirlos aparte en la tabla. */
  lead_titulo?: string | null
  lead_numero?: string | null
  lead_cliente?: string | null
  /** Comprobantes adjuntos. */
  comprobantes?: Comprobante[]
}

export interface Comprobante {
  id: string
  token: string
  filename: string
  mime: string
  size_bytes: number
  created_at: string
}

export interface NuevoMovimiento {
  fecha: string
  tipo: Tipo
  concepto: string
  categoria?: string | null
  monto: number
  medio_pago?: string | null
  proveedor?: string | null
  notas?: string | null
  leadId?: string | null
  /** Sin dato, pagado: es como se cargó siempre. */
  pagado?: boolean
  cuotas?: number | null
}

/**
 * Lo que se paga con tarjeta se compra hoy y se paga con el resumen. Por eso,
 * al cargar, nace pendiente; el resto se paga en el momento.
 */
export const NACE_PENDIENTE = (medio: string | null | undefined) => medio === "Tarjeta"

export const PAGO = ["pendiente", "pagado"] as const
export type EstadoPago = (typeof PAGO)[number]

export interface GastoFijo {
  id: string
  concepto: string
  categoria: string | null
  monto: string
  proveedor: string | null
  activo: boolean
  dia_pago: number | null
}

export interface FiltroMovimientos {
  tipo?: Tipo
  desde?: string
  hasta?: string
  search?: string
  leadId?: string
  /** Sólo los que no tienen comprobante cargado. */
  sinComprobante?: boolean
  /** Gastos pagados o pendientes de pago. Los ingresos no entran en ninguno. */
  pago?: EstadoPago
  medioPago?: string
  /** Gastos de producción que todavía no tienen obra. */
  sinObra?: boolean
}

/** Foto del período elegido. Todo se calcula en SQL y llega ya sumado. */
export interface Resumen {
  desde: string
  hasta: string
  ingresos: number
  fijos: number
  variables: number
  produccion: number
  gastos: number
  resultado: number
  /** (ingresos − gastos) / ingresos. Vacío si no hubo ingresos. */
  margen: number | null
  /** (ingresos − gastos) / gastos. La otra lectura de «ROI»: cuánto rinde lo puesto. */
  retorno: number | null
  movimientos: number
  sinComprobante: number
  /**
   * Lo que falta pagar, de cualquier fecha: una deuda de julio sigue siendo
   * deuda en octubre, así que no depende del período elegido.
   */
  pendiente: number
  pendientes: number
  /** De lo pendiente, lo que es de tarjeta: lo que va a venir en el resumen. */
  pendienteTarjeta: number
  /** Gastos de producción sin obra, que no cuentan en el costo de ningún tinglado. */
  produccionSinObra: number
  produccionSinObraN: number
}

export interface SerieMes {
  periodo: string
  ingresos: number
  fijos: number
  variables: number
  produccion: number
  resultado: number
}

/** Rentabilidad de una obra concreta: lo cobrado contra lo que costó hacerla. */
export interface RentabilidadObra {
  lead_id: string
  quote_number: string | null
  quote_title: string | null
  cliente: string | null
  status: string
  /** Lo presupuestado, del CRM. */
  presupuestado: number | null
  /** Lo efectivamente cobrado e imputado a la obra. */
  cobrado: number
  /** Gastos de producción imputados. */
  costo: number
  resultado: number
  /** (cobrado − costo) / costo. Null si todavía no hay costos cargados. */
  roi: number | null
  /** Ancho × largo del presupuesto, en m². Null si el presupuesto no trae medidas. */
  m2: number | null
  ancho: number | null
  largo: number | null
  /** Costo de producción por m² cubierto. */
  costoM2: number | null
  /** Qué parte de lo presupuestado se fue en costo de producción. */
  costoSobrePresupuesto: number | null
  /** El costo separado por rubro (Perfilería, Chapa, Mano de obra…). */
  desglose: { categoria: string; monto: number }[]
  /** Gastos de esta obra que todavía no se pagaron. */
  pendiente: number
}

/**
 * Cuánto cuesta un tinglado, sacado de las obras que ya tienen costos cargados
 * y medidas en el presupuesto. Sirve para presupuestar el próximo.
 */
export interface CostoTinglado {
  obras: number
  m2: number
  costo: number
  /** Costo total / m² totales: pondera por tamaño, un galpón grande pesa más. */
  costoM2: number | null
  /** El mismo cálculo por rubro: cuánto se va en chapa, perfilería… por m². */
  porRubro: { categoria: string; monto: number; porM2: number | null }[]
}

export interface Proyeccion {
  /** Media mensual de gastos fijos de los últimos meses con datos. */
  fijoMensual: number
  /** Margen bruto histórico: (ingresos − producción − variables) / ingresos. */
  margenBruto: number | null
  /**
   * Cuánto hay que facturar por mes para cubrir los fijos con ese margen.
   * Sin margen conocido no se puede calcular y se devuelve null en vez de un 0
   * que parecería «no hace falta vender nada».
   */
  puntoEquilibrio: number | null
  /** Presupuestos confirmados todavía sin ganar ni perder. */
  pipeline: number
  /** Ganados / (ganados + perdidos) del histórico. */
  tasaCierre: number | null
  /** pipeline × tasa de cierre: lo que cabe esperar de lo que hoy está abierto. */
  esperado: number | null
  mesesConDatos: number
}

import type { Tipo } from "./types"

/**
 * El catálogo con el que se carga desde el galpón.
 *
 * La idea de fondo: **el que carga no elige el tipo contable, elige lo que
 * compró**. Nadie en un taller piensa «esto es un gasto variable»; piensa
 * «compré chapa» o «pagué el alquiler». El tipo va detrás de cada concepto y lo
 * decide el sistema, que para eso está.
 *
 * Los nombres salen del propio cotizador —perfilería, chapa, pintura, aguarrás,
 * bulonería, mano de obra, flete— para que el que carga lea lo mismo que
 * presupuesta.
 */

export interface Concepto {
  /** Lo que se ve en el botón. */
  etiqueta: string
  /** Lo que se guarda como concepto del movimiento. */
  concepto: string
  tipo: Tipo
  categoria: string
}

export interface GrupoConceptos {
  /** Título del grupo, en lenguaje de taller y no de contabilidad. */
  titulo: string
  /** Por qué están juntos, para el que quiera entender la diferencia. */
  ayuda: string
  conceptos: Concepto[]
}

/** Lo que sale del bolsillo. */
export const PAGUE: GrupoConceptos[] = [
  {
    titulo: "De una obra",
    ayuda: "Material y trabajo de un tinglado concreto. Es lo que dice si esa obra dejó plata.",
    conceptos: [
      { etiqueta: "Perfilería", concepto: "Perfilería", tipo: "produccion", categoria: "Perfilería" },
      { etiqueta: "Chapa", concepto: "Chapa", tipo: "produccion", categoria: "Chapa" },
      { etiqueta: "Pintura y aguarrás", concepto: "Pintura y aguarrás", tipo: "produccion", categoria: "Pintura" },
      { etiqueta: "Bulones y tornillos", concepto: "Bulonería y tornillos", tipo: "produccion", categoria: "Bulonería" },
      { etiqueta: "Mano de obra", concepto: "Mano de obra", tipo: "produccion", categoria: "Mano de obra" },
      { etiqueta: "Flete de la obra", concepto: "Flete de la obra", tipo: "produccion", categoria: "Flete de obra" },
      { etiqueta: "Otro material", concepto: "Material", tipo: "produccion", categoria: "Otro material" },
    ],
  },
  {
    titulo: "Del taller",
    ayuda: "Gastos del día a día que no son de una obra en particular.",
    conceptos: [
      { etiqueta: "Combustible", concepto: "Combustible", tipo: "variable", categoria: "Combustible" },
      { etiqueta: "Herramientas", concepto: "Herramientas", tipo: "variable", categoria: "Herramientas" },
      { etiqueta: "Repuestos", concepto: "Repuestos", tipo: "variable", categoria: "Mantenimiento" },
      { etiqueta: "Arreglos", concepto: "Mantenimiento", tipo: "variable", categoria: "Mantenimiento" },
      { etiqueta: "Otro del taller", concepto: "Gasto del taller", tipo: "variable", categoria: "Otro" },
    ],
  },
  {
    titulo: "Todos los meses",
    ayuda: "Lo que hay que pagar aunque no se venda nada. Es lo que hay que cubrir sí o sí.",
    conceptos: [
      { etiqueta: "Alquiler", concepto: "Alquiler", tipo: "fijo", categoria: "Alquiler" },
      { etiqueta: "Sueldos", concepto: "Sueldos", tipo: "fijo", categoria: "Sueldos" },
      { etiqueta: "Luz y gas", concepto: "Luz y gas", tipo: "fijo", categoria: "Servicios" },
      { etiqueta: "Impuestos", concepto: "Impuestos", tipo: "fijo", categoria: "Impuestos" },
      { etiqueta: "Contador", concepto: "Contador", tipo: "fijo", categoria: "Contador" },
      { etiqueta: "Seguro", concepto: "Seguro", tipo: "fijo", categoria: "Seguro" },
    ],
  },
]

/** Lo que entra. */
export const COBRE: GrupoConceptos[] = [
  {
    titulo: "De una obra",
    ayuda: "Plata que entró por un tinglado. Se descuenta de lo que falta cobrar.",
    conceptos: [
      { etiqueta: "Seña", concepto: "Seña", tipo: "ingreso", categoria: "Seña" },
      { etiqueta: "Pago a cuenta", concepto: "Pago a cuenta", tipo: "ingreso", categoria: "Obra" },
      { etiqueta: "Saldo final", concepto: "Saldo final", tipo: "ingreso", categoria: "Saldo" },
    ],
  },
  {
    titulo: "Otras entradas",
    ayuda: "Ventas sueltas y cualquier otro ingreso que no sea de una obra.",
    conceptos: [
      { etiqueta: "Venta suelta", concepto: "Venta suelta", tipo: "ingreso", categoria: "Chapa suelta" },
      { etiqueta: "Otro ingreso", concepto: "Otro ingreso", tipo: "ingreso", categoria: "Otro" },
    ],
  },
]

/** Los conceptos de obra piden obra; el resto, no. Es lo único que cambia el formulario. */
export function pideObra(c: Concepto) {
  return c.tipo === "produccion" || (c.tipo === "ingreso" && c.categoria !== "Otro" && c.categoria !== "Chapa suelta")
}

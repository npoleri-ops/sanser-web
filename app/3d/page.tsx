import type { Metadata } from "next"
import { Visor3D } from "./visor-3d"
import type { ShedType, SheetType, RoofColor } from "@/lib/shed-config"
import { DEFAULT_CONFIG } from "@/lib/shed-config"

export const metadata: Metadata = {
  title: "Visor 3D Interactivo — SANSER Metalúrgica",
  description:
    "Explorá en 3D tu tinglado a medida. Rotá, acercá y mirá tu estructura desde todos los ángulos antes de pedir tu presupuesto.",
  robots: { index: false },
}

function parseShedConfig(params: Record<string, string | undefined>) {
  const VALID_TYPES: ShedType[] = [
    "gable",
    "shed",
    "gable_portico",
    "gable_varillas",
    "shed_varillas",
  ]
  const VALID_SHEETS: SheetType[] = ["t101", "sinusoidal"]
  const VALID_COLORS: RoofColor[] = ["cincalum", "negro"]

  const tipo = VALID_TYPES.includes(params.tipo as ShedType)
    ? (params.tipo as ShedType)
    : DEFAULT_CONFIG.type

  const ancho = parseFloat(params.ancho ?? "") || DEFAULT_CONFIG.width
  const largo = parseFloat(params.largo ?? "") || DEFAULT_CONFIG.length
  const alto = parseFloat(params.alto ?? "") || DEFAULT_CONFIG.height

  const chapa = VALID_SHEETS.includes(params.chapa as SheetType)
    ? (params.chapa as SheetType)
    : DEFAULT_CONFIG.sheet

  const color = VALID_COLORS.includes(params.color as RoofColor)
    ? (params.color as RoofColor)
    : DEFAULT_CONFIG.color

  const paredes = params.paredes === "1"
  const porton = params.porton === "1"
  const portonTrasero = params.portonTrasero === "1"

  return {
    ...DEFAULT_CONFIG,
    type: tipo,
    width: Math.min(50, Math.max(3, ancho)),
    length: Math.min(200, Math.max(3, largo)),
    height: Math.min(20, Math.max(2, alto)),
    sheet: chapa,
    color,
    walls: paredes,
    gate: porton,
    gateBack: portonTrasero,
  }
}

export default async function Visor3DPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const params = await searchParams
  const config = parseShedConfig(params)

  return <Visor3D config={config} />
}

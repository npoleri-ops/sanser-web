export type ShedType = "gable" | "shed" | "gable_portico" | "gable_varillas" | "shed_varillas" // dos aguas / una agua / pórtico / varillas
export type SheetType = "t101" | "sinusoidal"
export type WallSheetType = "same" | "t101" | "sinusoidal"
export type RoofColor = "cincalum" | "negro"
export type EnvironmentType = "day" | "afternoon" | "night"

export interface ShedConfig {
  type: ShedType
  width: number // ancho (m)
  length: number // largo (m)
  height: number // altura libre (m)
  sheet: SheetType
  wallSheet: WallSheetType
  color: RoofColor
  environment: EnvironmentType
  walls: boolean // cerramientos laterales (compatibilidad)
  wallLeft?: boolean // cerramiento lateral izquierdo
  wallRight?: boolean // cerramiento lateral derecho
  wallFront?: boolean // cerramiento frontal / tímpano
  wallBack?: boolean // cerramiento trasero / tímpano
  doorsCount?: number // cantidad de puertas de acceso peatonal
  gate: boolean // portón frontal
  gateBack: boolean // portón trasero
  centralColumns?: boolean // columnas intermedias de apoyo (1 agua)
}

export const DEFAULT_CONFIG: ShedConfig = {
  type: "gable",
  width: 15,
  length: 20,
  height: 5,
  sheet: "t101",
  wallSheet: "same",
  color: "negro",
  environment: "day",
  walls: false,
  wallLeft: false,
  wallRight: false,
  wallFront: false,
  wallBack: false,
  doorsCount: 0,
  gate: false,
  gateBack: false,
  centralColumns: false,
}

export const LIMITS = {
  width: { min: 8, max: 50, step: 1 },
  length: { min: 10, max: 200, step: 1 },
  height: { min: 4, max: 8, step: 0.5 },
}

export const COLOR_HEX: Record<RoofColor, string> = {
  cincalum: "#c9ced6",
  negro: "#141518",
}

export const COLOR_LABEL: Record<RoofColor, string> = {
  cincalum: "Cincalum (Plateado)",
  negro: "Negro Mate",
}

export const SHEET_LABEL: Record<SheetType, string> = {
  t101: "Cincalum T-110 (Cal. 25)",
  sinusoidal: "Sinusoidal (Cal. 25)",
}

export const TYPE_LABEL: Record<ShedType, string> = {
  gable: "A 2 Aguas (Triangular)",
  gable_portico: "A 2 Aguas (Pórtico Reticulado)",
  shed: "A 1 Agua",
  gable_varillas: "2 Aguas - Reticulado Liviano (Varilla Ø12/8)",
  shed_varillas: "1 Agua - Reticulado Liviano (Varilla Ø12/8)",
}

// Roof pitch (approx) used both for geometry and area math
export const PITCH_DEG = 12
const PITCH_RAD = (PITCH_DEG * Math.PI) / 180

export interface Computo {
  columnas: number
  cabreadas: number
  frames: number
  bays: number
  superficieTecho: number
  superficiePlanta: number
  correas: number
}

export function computeMateriales(config: ShedConfig): Computo {
  const { width, length, type } = config

  // Un pórtico cada ~5 m
  const bays = Math.max(2, Math.round(length / 5))
  const frames = bays + 1

  // Cada pórtico transversal lleva 2 columnas reticuladas
  let columnas = frames * 2
  if (type === "shed" && config.centralColumns) {
    columnas += frames
  }
  const cabreadas = frames

  const superficiePlanta = width * length

  // Superficie de techo considerando la pendiente
  let superficieTecho: number
  let correas: number
  if (type === "gable" || type === "gable_portico" || type === "gable_varillas") {
    // dos faldones: ancho inclinado total = width / cos(pitch)
    const slopeLen = (width / 2) / Math.cos(PITCH_RAD)
    superficieTecho = length * (slopeLen * 2)
    const n = Math.max(3, Math.min(40, Math.round(slopeLen / 1.6)))
    correas = (n + 1) * 2
  } else {
    const shedRise = width * Math.tan((8 * Math.PI) / 180)
    const ang = Math.atan(shedRise / width)
    const slopeLen = width / Math.cos(ang)
    superficieTecho = length * slopeLen
    const n = Math.max(3, Math.min(40, Math.round(slopeLen / 1.6)))
    correas = n + 1
  }

  return {
    columnas,
    cabreadas,
    frames,
    bays,
    superficiePlanta: Math.round(superficiePlanta),
    superficieTecho: Math.round(superficieTecho),
    correas,
  }
}

const WHATSAPP_NUMBER = "5493743487728" // 03743-487728

export function buildWhatsAppMessage(
  config: ShedConfig,
  client?: { name: string; phone: string; email: string }
): string {
  const { width, length, height, type, color, sheet } = config
  const computo = computeMateriales(config)

  const extras: string[] = []
  if (config.wallLeft && config.wallRight) extras.push("con cerramientos laterales en ambos lados")
  else if (config.wallLeft) extras.push("con cerramiento lateral izquierdo")
  else if (config.wallRight) extras.push("con cerramiento lateral derecho")
  else if (config.walls) extras.push("con cerramientos laterales")

  if (config.wallFront && config.wallBack) extras.push("con cerramiento frente y fondo")
  else if (config.wallFront) extras.push("con cerramiento frontal")
  else if (config.wallBack) extras.push("con cerramiento trasero")

  if (config.doorsCount && config.doorsCount > 0) {
    extras.push(`con ${config.doorsCount} puerta(s) de acceso peatonal`)
  }

  if (config.gate && config.gateBack) {
    extras.push("con portón pasante (Frente y Fondo)")
  } else if (config.gate) {
    extras.push("con portón frontal")
  } else if (config.gateBack) {
    extras.push("con portón trasero")
  }
  const extrasTxt = extras.length ? ` ${extras.join(" y ")}` : ""

  let msg = `¡Hola SANSER Metalúrgica! `
  if (client) {
    msg += `Soy ${client.name} y quisiera solicitar un presupuesto formal con los siguientes detalles:\n\n`
  } else {
    msg += `Quisiera cotizar un tinglado con los siguientes detalles:\n\n`
  }

  msg += `*DATOS TÉCNICOS:*\n`
  msg += `- Tipología: ${TYPE_LABEL[type]}\n`
  msg += `- Dimensiones: ${width}m (Ancho) x ${length}m (Largo) x ${height}m (Altura libre)\n`
  msg += `- Cubierta: Chapa ${SHEET_LABEL[sheet]} (Color: ${COLOR_LABEL[color]})\n`
  msg += `- Cerramiento Lat. Izquierdo: ${config.wallLeft ? "Sí" : (config.walls ? "Sí" : "No")}\n`
  msg += `- Cerramiento Lat. Derecho: ${config.wallRight ? "Sí" : (config.walls ? "Sí" : "No")}\n`
  msg += `- Cerramiento Frontal: ${config.wallFront ? "Sí" : "No"}\n`
  msg += `- Cerramiento Trasero: ${config.wallBack ? "Sí" : "No"}\n`
  if (config.doorsCount && config.doorsCount > 0) {
    msg += `- Puertas de acceso: ${config.doorsCount} unid. (0.90x2.05m)\n`
  }
  msg += `- Portón frontal: ${config.gate ? "Sí" : "No"}\n`
  msg += `- Portón trasero: ${config.gateBack ? "Sí" : "No"}\n`

  if (client) {
    msg += `\n*MIS DATOS DE CONTACTO:*\n`
    msg += `- Nombre: ${client.name}\n`
    msg += `- Teléfono: ${client.phone}\n`
    msg += `- Email: ${client.email?.trim() ? client.email.trim() : "No especificado"}\n`
  }

  return msg
}

export function buildWhatsAppUrl(config: ShedConfig): string {
  const message = buildWhatsAppMessage(config)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`
}

// ─── Secuencia de montaje ────────────────────────────────────────────────────

export interface PasoMontaje {
  paso: number
  titulo: string
  descripcion: string
  categoria: string
}

/**
 * Genera la secuencia de montaje paso a paso para el tinglado configurado.
 * Los pasos base (cimentación, estructura, cubierta) siempre aparecen.
 * Los pasos de cerramientos, portones y puertas se suman solo si están activos.
 */
export function getGuiaMontaje(config: ShedConfig): PasoMontaje[] {
  const { width, length, height, type } = config
  const isUnAgua = type === "shed" || type === "shed_varillas"
  const isVarillas = type === "gable_varillas" || type === "shed_varillas"

  const tipoLabel = TYPE_LABEL[type]
  const numPorticos = Math.ceil(length / 5) + 1
  const { correas, columnas, superficieTecho } = computeMateriales(config)

  const legacyWalls = Boolean(config.walls && !config.wallLeft && !config.wallRight)
  const hasLeft  = Boolean(config.wallLeft  || legacyWalls)
  const hasRight = Boolean(config.wallRight || legacyWalls)
  const hasFront = Boolean(config.wallFront)
  const hasBack  = Boolean(config.wallBack  || legacyWalls)
  const hasDoors = Boolean(config.doorsCount && config.doorsCount > 0)
  const hasGate  = Boolean(config.gate)
  const hasGateBack = Boolean(config.gateBack)

  const pasos: PasoMontaje[] = [
    {
      paso: 1,
      titulo: "Replanteo, Cimentación y Anclajes",
      descripcion: `Marcar los ejes de los pórticos cada ~5 m en los ${length} m de largo. Excavar y hormigonar ${numPorticos * 2} zapatas aisladas con placas base metálicas y bulones de anclaje embebidos. Nivelar con láser antes del fraguado.`,
      categoria: "Civil",
    },
    {
      paso: 2,
      titulo: "Montaje de Columnas Reticuladas",
      descripcion: `Izar, aplomar y abulonar ${columnas} columna${columnas !== 1 ? "s" : ""} sobre las placas base de anclaje${isVarillas ? " en reticulado liviano (Varilla Ø12/8)" : " en perfiles C 120×50"}. Altura libre: ${height} m. Apuntalar provisionalmente.`,
      categoria: "Estructura",
    },
    {
      paso: 3,
      titulo: `Izado de Cabreadas — ${tipoLabel}`,
      descripcion: `Montar los ${numPorticos} pórticos transversales de cabreadas sobre las columnas${isUnAgua ? " (inclinación 8°)" : " (pendiente 12°)"}. Colocar arriostramientos laterales y cruces de San Andrés para rigidizar la estructura en 3D.`,
      categoria: "Estructura",
    },
    {
      paso: 4,
      titulo: "Colocación de Correas de Techo",
      descripcion: `Instalar ${correas} líneas de correas C 80×40 galvanizadas a lo largo de toda la cubierta, espaciadas ~1.6 m sobre las cabreadas, asegurando la rigidez longitudinal del galpón.`,
      categoria: "Estructura",
    },
    {
      paso: 5,
      titulo: "Montaje de Cubierta de Chapa",
      descripcion: `Colocar chapas ${SHEET_LABEL[config.sheet]} sobre las correas, cubriendo una superficie de ${superficieTecho} m². Fijar con tornillos autoperforantes y arandela de neoprene vulcanizada en cada cresta.`,
      categoria: "Cubierta",
    },
  ]

  let numeroPaso = 6

  // Cerramientos laterales
  if (hasLeft || hasRight) {
    const lados = [hasLeft && "izquierdo", hasRight && "derecho"].filter(Boolean).join(" y ")
    const supLateral = Math.round(length * height)
    pasos.push({
      paso: numeroPaso++,
      titulo: `Cerramiento lateral${hasLeft && hasRight ? "es" : ""} (${lados})`,
      descripcion: `Instalar correas verticales C 80×40 galvanizadas cada ~1 m en el/los lateral/es. Colocar chapas verticales ${SHEET_LABEL[config.sheet]} en el cerramiento ${lados} (superficie aprox. ${hasLeft && hasRight ? supLateral * 2 : supLateral} m²). Montar tapajuntas en los vértices.`,
      categoria: "Cerramientos",
    })
  }

  // Tímpanos frontales / traseros
  if (hasFront || hasBack) {
    const lados = [hasFront && "frontal", hasBack && "trasero"].filter(Boolean).join(" y ")
    const flecha = isUnAgua ? (width * Math.tan((8 * Math.PI) / 180)) : ((width / 2) * Math.tan((12 * Math.PI) / 180))
    const supGable = Math.round((width * height) + ((width * flecha) / 2))
    pasos.push({
      paso: numeroPaso++,
      titulo: `Tímpano${hasFront && hasBack ? "s" : ""} (${lados})`,
      descripcion: `Completar el cierre perimetral con el/los tímpano/s ${lados}. Trazar y cortar la chapa siguiendo el perfil del techo (superficie unitaria aprox. ${supGable} m²). Asegurar las esquinas con tapajuntas de chapa plegada.`,
      categoria: "Cerramientos",
    })
  }

  // Portón frontal
  if (hasGate) {
    pasos.push({
      paso: numeroPaso++,
      titulo: "Portón de acceso frontal",
      descripcion: `Instalar el portón vehicular frontal con sus rieles, rodamientos y contrapesos (o bisagras, según modelo). El portón va sobre guías embebidas en el contrapiso; verificar nivel horizontal y verticalidad del marco antes de soldar definitivo.`,
      categoria: "Aberturas",
    })
  }

  // Portón trasero
  if (hasGateBack) {
    pasos.push({
      paso: numeroPaso++,
      titulo: "Portón de acceso trasero",
      descripcion: `Instalar el portón vehicular trasero (galpón pasante). Alinear con el portón frontal para garantizar paso libre. Verificar que ambos portones operen libremente antes de la entrega.`,
      categoria: "Aberturas",
    })
  }

  // Puertas peatonales
  if (hasDoors) {
    const cnt = config.doorsCount!
    pasos.push({
      paso: numeroPaso++,
      titulo: `Puerta${cnt > 1 ? "s" : ""} peatonal${cnt > 1 ? "es" : ""} (${cnt} unid.)`,
      descripcion: `Montar ${cnt} puerta${cnt > 1 ? "s" : ""} de acceso peatonal (0.90 × 2.05 m) con marco metálico reforzado, bisagras y cerradura de seguridad. Ajustar holguras de hoja antes de entrega.`,
      categoria: "Aberturas",
    })
  }

  // Paso final: terminaciones y control de calidad
  pasos.push({
    paso: numeroPaso,
    titulo: "Pintura y terminaciones",
    descripcion: `Aplicar convertidor de óxido en toda la estructura metálica (columnas, cabreadas y correas) y luego esmalte sintético en color negro mate. Revisar bulonería y tornillos autoperforantes. Limpiar residuos de obra y realizar el control final de plomada, nivel y estanqueidad de la cubierta.`,
    categoria: "Terminaciones",
  })

  return pasos
}

// ─── Videos explicativos de montaje ──────────────────────────────────────────

export interface MontajeVideoInfo {
  src: string
  fallbackSrc: string
  filename: string
  fallbackFilename: string
  label: string
  hasCerramientos: boolean
  hasPorton: boolean
  hasPuertas: boolean
}

/**
 * Selecciona la variante del video explicativo según la configuración completa
 * del tinglado: tipología base, presencia de cerramientos y aberturas.
 * Si la variante específica no existe en disco, el visor realiza un fallback fluido
 * a fallbackSrc (la versión genérica de la estructura).
 */
export function getMontajeVideo(config: ShedConfig): MontajeVideoInfo {
  const { type } = config
  const isUnAgua = type === "shed" || type === "shed_varillas"
  const isPortico = type === "gable_portico"

  const legacyWalls = Boolean(config.walls && !config.wallLeft && !config.wallRight)
  const hasCerramientos = Boolean(
    config.wallLeft || config.wallRight || config.wallFront || config.wallBack || legacyWalls
  )
  const hasPorton = Boolean(config.gate || config.gateBack)
  const hasPuertas = Boolean(config.doorsCount && config.doorsCount > 0)
  const hasAberturas = hasPorton || hasPuertas

  // Tipología base
  let baseSlug = "2-aguas"
  let baseLabel = "A 2 Aguas"
  if (isUnAgua) {
    baseSlug = "1-agua"
    baseLabel = "A 1 Agua"
  } else if (isPortico) {
    baseSlug = "2-aguas-portico"
    baseLabel = "A 2 Aguas Pórtico"
  }

  const fallbackFilename = isUnAgua ? "1-agua.mp4" : "2-aguas.mp4"
  const fallbackSrc = `/videos/montaje/${fallbackFilename}`

  // Variante específica según cerramientos y aberturas
  let variantSlug = baseSlug
  let variantDesc = "Estructura abierta"

  if (hasCerramientos && hasAberturas) {
    variantSlug = `${baseSlug}-con-cerramiento-y-aberturas`
    variantDesc = "Con cerramientos y aberturas"
  } else if (hasCerramientos) {
    variantSlug = `${baseSlug}-con-cerramiento`
    variantDesc = "Con cerramiento perimetral"
  } else if (hasAberturas) {
    variantSlug = `${baseSlug}-con-aberturas`
    variantDesc = "Con portón / puertas de acceso"
  }

  const filename = `${variantSlug}.mp4`
  const src = `/videos/montaje/${filename}`
  const label = `${baseLabel} (${variantDesc})`

  return {
    src,
    fallbackSrc,
    filename,
    fallbackFilename,
    label,
    hasCerramientos,
    hasPorton,
    hasPuertas,
  }
}

export const CONTACT = {
  phoneDisplay: "03743-487728",
  phoneSecondaryDisplay: "03743-448876",
  phoneSecondaryRaw: "+543743448876",
  whatsappSecondaryBase: `https://wa.me/543743448876`,
  phoneRaw: WHATSAPP_NUMBER,
  whatsappBase: `https://wa.me/${WHATSAPP_NUMBER}`,
  address: "Ecuador 811, Jardín América, Misiones, Argentina.",
  email: "sansermetalurgica@gmail.com",
}

"use client"


import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Download, Send, Image as ImageIcon, FileText, RefreshCw, CheckCircle2, Share2, Camera, X, Video, Copy } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import dynamic from "next/dynamic"
import { cn } from "@/lib/utils"
import { CONTACT, DEFAULT_CONFIG, TYPE_LABEL, SHEET_LABEL, ShedType, type ShedConfig, getGuiaMontaje } from "@/lib/shed-config"
import { BarraSecuencia } from "@/components/three/barra-secuencia"
import { registrarLead, trackLead } from "@/lib/crm/track"
import { problemaDeContacto } from "@/lib/crm/contacto"
import { CampoEmail, CampoTelefono } from "@/components/site/campos-contacto"
import { reportarSolicitudPresupuesto } from "@/lib/google-ads"
import type { Lead } from "@/lib/crm/types"
import type { ThreeSceneRef } from "@/components/three/config-scene"

export interface QuoteItem {
  id: string;
  description: string;
  unit: string;
  quantity: number;
  price: number;
}

const ConfigScene = dynamic(
  () => import("@/components/three/config-scene").then((m) => ({ default: m.ConfigScene })),
  { ssr: false }
)
// jspdf-autotable cuelga lastAutoTable del doc, pero no lo declara en los tipos de jsPDF.
type DocWithAutoTable = jsPDF & { lastAutoTable: { finalY: number } }

/** Accede al renderer Three.js registrado por SceneBridge al montar el canvas. */
function getSceneRef(): ThreeSceneRef | null {
  if (typeof window === "undefined") return null
  return (window as any).__SANSER_3D__ ?? null
}

const INITIAL_PRICES = {
  perfil120: 0,
  perfil80Negro: 0,
  perfil80Galv: 0,
  angulo: 0,
  chapa: 0,
  bulonesJuego: 0,
  arandelas: 0,
  tornillos: 0,
  pintura: 0,
  aguarras: 0,
  manoDeObra: 0,
  flete: 0,
  varilla12: 0,
  varilla8: 0,
}
type Prices = typeof INITIAL_PRICES

// Los inputs de medidas pueden quedar vacíos mientras se escribe: el estado guarda
// esa cadena vacía aunque ShedConfig declare number.
const EMPTY_NUMBER = "" as unknown as number

// Mapeo dinámico de videos explicativos de montaje según tipología.
// Ruta base: /videos/montaje/ (almacenados en public/videos/montaje/)
export const MONTAJE_VIDEOS_MAP: Record<ShedType, { filename: string; label: string }> = {
  gable: {
    filename: "2-aguas.mp4",
    label: "Dos Aguas Reticulado",
  },
  gable_portico: {
    filename: "2-aguas.mp4",
    label: "Dos Aguas Pórtico",
  },
  gable_varillas: {
    filename: "2-aguas.mp4",
    label: "Dos Aguas Varilla",
  },
  shed: {
    filename: "1-agua.mp4",
    label: "Un Agua Reticulado",
  },
  shed_varillas: {
    filename: "1-agua.mp4",
    label: "Un Agua Varilla",
  },
}

export const getMontajeVideo = (type: ShedType) => {
  const item = MONTAJE_VIDEOS_MAP[type] || MONTAJE_VIDEOS_MAP.gable
  return {
    src: `/videos/montaje/${item.filename}`,
    filename: item.filename,
    label: item.label,
  }
}

// Cálculo de superficies de cerramientos en m²
export const getSuperficies = (c: ShedConfig) => {
  const ancho = c.width || 0;
  const largo = c.length || 0;
  const alto = c.height || 5;
  const isUnAgua = c.type === "shed" || c.type === "shed_varillas";

  const supLateral = Math.round(largo * alto);
  const flecha = isUnAgua
    ? (ancho * Math.tan((8 * Math.PI) / 180))
    : ((ancho / 2) * Math.tan((12 * Math.PI) / 180));
  const supGable = Math.round((ancho * alto) + ((ancho * flecha) / 2));

  const legacyWalls = Boolean(c.walls && !c.wallLeft && !c.wallRight);
  const hasLeft = Boolean(c.wallLeft || legacyWalls);
  const hasRight = Boolean(c.wallRight || legacyWalls);
  const hasFront = Boolean(c.wallFront);
  const hasBack = Boolean(c.wallBack || legacyWalls);

  const supTotalCerramientos =
    (hasLeft ? supLateral : 0) +
    (hasRight ? supLateral : 0) +
    (hasFront ? supGable : 0) +
    (hasBack ? supGable : 0);

  return { supLateral, supGable, supTotalCerramientos, hasLeft, hasRight, hasFront, hasBack };
}

// Cálculo puro: sólo depende de sus argumentos, por eso vive fuera del componente.
const calcularPresupuesto = (currentConfig: ShedConfig, currentPrices: Prices) => {
  const ancho = currentConfig.width || 0;
  const largo = currentConfig.length || 0;
  const isUnAgua = currentConfig.type === "shed" || currentConfig.type === "shed_varillas";
  const isVarillas = currentConfig.type === "gable_varillas" || currentConfig.type === "shed_varillas";

  const numPorticos = Math.ceil(largo / 5) + 1;
  const numColumnas = numPorticos * 2;
  const numCabreadas = numPorticos;

  const altoLibre = currentConfig.height || 5;
  const factorColumna = (altoLibre + 1) / 6;

  // Perfiles 120 (Barras)
  const barras120 = isVarillas ? 0 : Math.ceil(isUnAgua
    ? ((numColumnas * 1 * factorColumna) + (numCabreadas * 1))
    : ((numColumnas * 1 * factorColumna) + (numCabreadas * 2))
  );

  // Perfiles 80 Negro (Barras)
  const barras80Negro = isVarillas ? 0 : Math.ceil(isUnAgua
    ? ((numColumnas * 1 * factorColumna) + (numCabreadas * 1.33))
    : ((numColumnas * 1 * factorColumna) + (numCabreadas * 2.33))
  );

  // Varillas Ø12 y Ø8 (Barras de 12m)
  let barrasVarilla12 = 0;
  let barrasVarilla8 = 0;
  if (isVarillas) {
    const lengthPerCabreada = isUnAgua ? ancho : (ancho / Math.cos(12 * Math.PI / 180));
    const metrosCordonesCabreada = lengthPerCabreada * 2;
    const metrosZigzagCabreada = lengthPerCabreada * 2.5;

    const metrosCordonesColumna = altoLibre * 4;
    const metrosZigzagColumna = altoLibre * 4 * 1.5;

    const totalMetrosVar12 = (numCabreadas * metrosCordonesCabreada) + (numColumnas * metrosCordonesColumna);
    const totalMetrosVar8 = (numCabreadas * metrosZigzagCabreada) + (numColumnas * metrosZigzagColumna);

    barrasVarilla12 = Math.ceil(totalMetrosVar12 / 12);
    barrasVarilla8 = Math.ceil(totalMetrosVar8 / 12);
  }

  // Correas 80 Galv (Barras)
  const lineasCorreas = Math.ceil(ancho / 1) + 1;
  const barras80Galv = Math.ceil((lineasCorreas * largo) / 12);

  // Hierro Ángulo (Barras)
  const barrasAngulo = isUnAgua ? 1 : 2;

  // Chapas (Metros)
  const totalMetrosChapa = Math.ceil(ancho / 1.0) * largo * 1.06;

  // Bulones y Tuercas: 8 por pórtico (1 agua) o 12 por pórtico (2 aguas), más 2 juegos extra de margen por seguridad
  const bulonesJuegos = (isUnAgua ? (numPorticos * 8) : (numPorticos * 12)) + 2;

  // Cálculo ajustado de arandelas (mínimo 3 kg, redondeo superior cada 60 m2)
  const arandelaKg = Math.max(3, Math.ceil((ancho * largo) / 60));

  // Tornillos Autoperforantes (Cajas)
  const factorTornillos = isUnAgua ? 3.5 : 4.0;
  const tornillosCajas = Math.max(2, Math.ceil((ancho * largo * factorTornillos) / 100));

  // Pintura (Baldes 4L): mínimo 2 baldes para tinglados estándar, escalando 1 balde cada ~90 m2
  const pinturaBaldes = Math.max(2, Math.ceil((ancho * largo) / 90));

  // Aguarrás (Baldes 4L): mínimo 1 balde, manteniendo relación de 1 cada 2 baldes de pintura
  const aguarrasBaldes = Math.max(1, Math.ceil(pinturaBaldes / 2));

  // Cálculo del costo exacto usando precios base de CSV que YA son por unidad/barra
  const p120 = currentPrices.perfil120 || 93600;
  const p80N = currentPrices.perfil80Negro || 70800;
  const p80G = currentPrices.perfil80Galv || 84000;
  const pAng = currentPrices.angulo || 30000;
  const pChapa = currentPrices.chapa || 15000;
  const pBulonJuego = currentPrices.bulonesJuego || 1140;
  const pAran = currentPrices.arandelas || 3500;
  const pTornillo = currentPrices.tornillos || 15000;
  const pPintura = currentPrices.pintura || 50000;
  const pAguarras = currentPrices.aguarras || 30000;
  const pVarilla12 = currentPrices.varilla12 || 12000;
  const pVarilla8 = currentPrices.varilla8 || 5500;

  const subtotalMateriales =
    (barras120 * p120) +
    (barras80Negro * p80N) +
    (barras80Galv * p80G) +
    (barrasAngulo * pAng) +
    (Math.ceil(totalMetrosChapa) * pChapa) +
    (bulonesJuegos * pBulonJuego) +
    (arandelaKg * pAran) +
    (tornillosCajas * pTornillo) +
    (pinturaBaldes * pPintura) +
    (aguarrasBaldes * pAguarras) +
    (barrasVarilla12 * pVarilla12) +
    (barrasVarilla8 * pVarilla8);

  const superficie = ancho * largo;
  const subtotalManoObra = Math.round(superficie * 11000);
  const subtotalPintor = 200000;

  const subtotalTingladoCompleto = subtotalMateriales + subtotalManoObra + subtotalPintor;

  // ── CERRAMIENTOS Y ABERTURAS ───────────────────────────────
  const { supLateral, supGable, supTotalCerramientos, hasLeft, hasRight, hasFront, hasBack } = getSuperficies(currentConfig);

  // Costo por m² de cerramiento completo (chapas, correas C 80x40 galvanizadas, tornillos y mano de obra de montaje)
  const costoM2Cerramiento = Math.round(
    (1.05 * pChapa) +
    ((0.8 / 12) * p80G) +
    ((6 / 100) * pTornillo) +
    4500
  );

  const doorsCount = Math.max(0, currentConfig.doorsCount || 0);
  const precioPuerta = 320000; // Puerta de acceso peatonal 0.90x2.05m con marco reforzado y cerradura

  const typeStr = TYPE_LABEL[currentConfig.type] ? TYPE_LABEL[currentConfig.type].toUpperCase() : "A UN AGUA";
  const nuevoTitulo = `TINGLADO ${ancho}X${largo} ${typeStr}`;
  const sheetLabel = SHEET_LABEL[currentConfig.sheet] || "Cincalum T-110";

  const nuevosItems: QuoteItem[] = [
    { id: "tinglado-1", description: nuevoTitulo, unit: "unid", quantity: 1, price: subtotalTingladoCompleto },
  ];

  if (hasLeft) {
    nuevosItems.push({
      id: "cerramiento-lat-izq",
      description: `Cerramiento Lateral Izquierdo (${supLateral} m² - Chapa ${sheetLabel})`,
      unit: "m²",
      quantity: supLateral,
      price: costoM2Cerramiento,
    });
  }

  if (hasRight) {
    nuevosItems.push({
      id: "cerramiento-lat-der",
      description: `Cerramiento Lateral Derecho (${supLateral} m² - Chapa ${sheetLabel})`,
      unit: "m²",
      quantity: supLateral,
      price: costoM2Cerramiento,
    });
  }

  if (hasFront) {
    nuevosItems.push({
      id: "cerramiento-frontal",
      description: `Cerramiento Frontal / Tímpano (${supGable} m² - Chapa ${sheetLabel})`,
      unit: "m²",
      quantity: supGable,
      price: costoM2Cerramiento,
    });
  }

  if (hasBack) {
    nuevosItems.push({
      id: "cerramiento-trasero",
      description: `Cerramiento Trasero / Tímpano (${supGable} m² - Chapa ${sheetLabel})`,
      unit: "m²",
      quantity: supGable,
      price: costoM2Cerramiento,
    });
  }

  if (doorsCount > 0) {
    nuevosItems.push({
      id: "puertas-acceso",
      description: "Puerta de acceso peatonal (0.90 × 2.05m con marco reforzado y cerradura)",
      unit: "unid",
      quantity: doorsCount,
      price: precioPuerta,
    });
  }

  if (currentConfig.gate) {
    nuevosItems.push({
      id: "porton-frontal",
      description: "Portón frontal para acceso de vehículos",
      unit: "unid",
      quantity: 1,
      price: 0,
    });
  }

  if (currentConfig.gateBack) {
    nuevosItems.push({
      id: "porton-trasero",
      description: "Portón trasero para vehículos (galpón pasante)",
      unit: "unid",
      quantity: 1,
      price: 0,
    });
  }

  nuevosItems.push({
    id: "flete-2",
    description: "Transporte / Flete / Instalación",
    unit: "viaje",
    quantity: 1,
    price: currentPrices.flete || 0,
  });

  let nuevoDetalle = isVarillas
    ? `Estructura de reticulado liviano en Varilla Conformada Ø12 (cordones) y Ø8 (diagonales en zigzag) / Correas de techo galvanizadas C 80x40 cada 1m / Cubierta: ${SHEET_LABEL[currentConfig.sheet]} / Bulonería y tornillos autoperforantes / Pintura con convertidor de óxido.`
    : `Estructura reforzada en perfiles C 120x50x1,6mm y 80x40x1,6mm conformados en frío / Correas de techo galvanizadas C 80x40 cada 1m / Cubierta: ${SHEET_LABEL[currentConfig.sheet]} / Bulonería de alta resistencia y tornillos autoperforantes con arandela de neoprene / Pintura con convertidor de óxido.`;

  const partesCerramiento: string[] = [];
  if (hasLeft && hasRight) partesCerramiento.push(`laterales ambos lados (${supLateral * 2} m²)`);
  else if (hasLeft) partesCerramiento.push(`lateral izquierdo (${supLateral} m²)`);
  else if (hasRight) partesCerramiento.push(`lateral derecho (${supLateral} m²)`);

  if (hasFront && hasBack) partesCerramiento.push(`frente y fondo (${supGable * 2} m²)`);
  else if (hasFront) partesCerramiento.push(`frontal (${supGable} m²)`);
  else if (hasBack) partesCerramiento.push(`trasero (${supGable} m²)`);

  if (partesCerramiento.length > 0) {
    nuevoDetalle += ` / Cerramientos en chapa ${sheetLabel} sobre correas C 80x40 galvanizadas (${partesCerramiento.join(", ")}, total: ${supTotalCerramientos} m²).`;
  }

  if (doorsCount > 0) {
    nuevoDetalle += ` / Incluye ${doorsCount} puerta(s) de acceso peatonal (0.90x2.05m) con marco metálico y cerradura.`;
  }

  if (currentConfig.gate && currentConfig.gateBack) {
    nuevoDetalle += " / Incluye portones vehiculares frontal y trasero (galpón pasante).";
  } else if (currentConfig.gate) {
    nuevoDetalle += " / Incluye portón vehicular frontal de acceso.";
  } else if (currentConfig.gateBack) {
    nuevoDetalle += " / Incluye portón vehicular trasero de acceso.";
  }

  return { nuevoTitulo, nuevosItems, nuevoDetalle }
}

const GOOGLE_SHEETS_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSF7Mzej2vMSn1h2u3DSr4N4YuMnwpW9KmLzkT6WGW3lIWGQWMUqDxGTeHcFEYCjijBU8rBrNwXCqLn/pub?output=csv"

/**
 * `interno` distingue al vendedor (sesión del CRM abierta) del visitante: sólo
 * el primero puede tocar precios, ítems y textos del presupuesto.
 */
export function Cotizador({
  interno,
  leadInicial,
}: {
  interno: boolean
  leadInicial?: Lead | null
}) {
  // Un presupuesto reabierto trae su configuración e ítems ya ajustados a mano.
  const guardado = (leadInicial?.quote_config ?? null) as
    | (ShedConfig & { items?: QuoteItem[]; materials?: string })
    | null
  const [date, setDate] = useState(() => new Date().toLocaleDateString("es-AR"))
  const [pdfCompartido, setPdfCompartido] = useState<{
    url: string
    token: string
    title: string
  } | null>(null)
  // Presupuesto en curso: existe en el CRM desde que se guarda como borrador.
  const [leadId, setLeadId] = useState<string | null>(leadInicial?.id ?? null)
  const [numeroPresupuesto, setNumeroPresupuesto] = useState<string | null>(
    leadInicial?.quote_number ?? null,
  )
  const [pedidoEnviado, setPedidoEnviado] = useState(false)
  const [clientName, setClientName] = useState(leadInicial?.name ?? "")
  const [cuit, setCuit] = useState(leadInicial?.cuit ?? "")
  const [phone, setPhone] = useState(leadInicial?.phone ?? "")
  const [email, setEmail] = useState(leadInicial?.email ?? "")
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [title, setTitle] = useState(leadInicial?.quote_title ?? "TINGLADO 10X20 A UN AGUA")
  const [materials, setMaterials] = useState(
    guardado?.materials ??
    "Perfiles C 120x50x1,6mm / Perfiles C 80x40x1,6mm galvanizados para correas / Cubierta: Cincalum T-110 (Cal. 25) / Tornillos",
  )
  const [images, setImages] = useState<string[]>([])
  const [items, setItems] = useState<QuoteItem[]>(
    guardado?.items ?? [
      { id: "5", description: "Transporte / Flete / Instalación", unit: "viaje", quantity: 1, price: 0 },
    ],
  )

  const [isGenerating, setIsGenerating] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [link3DCopied, setLink3DCopied] = useState(false)
  // Capturas manuales de vistas 3D para incluir en el PDF (máx. 3)
  const [capturas3D, setCapturas3D] = useState<string[]>([])

  const onSceneReady = useCallback((_ref: ThreeSceneRef) => {
    setSceneReady(true)
  }, [])

  /**
   * Genera un link al visor 3D interactivo con la configuración actual encodada
   * en los parámetros de búsqueda y lo copia al portapapeles.
   */
  const copiarLink3D = async () => {
    const params = new URLSearchParams({
      tipo: config.type,
      ancho: String(config.width),
      largo: String(config.length),
      alto: String(config.height),
      chapa: config.sheet,
      color: config.color,
      paredes: (config.wallLeft || config.wallRight || config.walls) ? "1" : "0",
      paredIzq: config.wallLeft ? "1" : "0",
      paredDer: config.wallRight ? "1" : "0",
      paredFrente: config.wallFront ? "1" : "0",
      paredFondo: config.wallBack ? "1" : "0",
      puertas: String(config.doorsCount || 0),
      porton: config.gate ? "1" : "0",
      portonTrasero: config.gateBack ? "1" : "0",
      ...(etapaMontaje > 0 ? { etapa: String(etapaMontaje) } : {}),
    })
    const url = `${window.location.origin}/3d?${params.toString()}`

    try {
      await navigator.clipboard.writeText(url)
      setLink3DCopied(true)
      setTimeout(() => setLink3DCopied(false), 3000)
    } catch {
      // Fallback: abrir en nueva pestaña si el clipboard no está disponible
      window.open(url, "_blank")
    }
  }

  /**
   * Toma un snapshot del canvas Three.js actual y lo agrega al array de
   * capturas manuales (máximo 3 vistas).
   */
  const capturarVista = () => {
    if (capturas3D.length >= 3) {
      alert("Ya tenés 3 vistas guardadas. Eliminá alguna para agregar otra.")
      return
    }
    const ref = getSceneRef()
    if (!ref) {
      alert("El visor 3D aún no está listo.")
      return
    }
    try {
      const { gl, scene, camera } = ref
      gl.render(scene, camera)
      const dataUrl = gl.domElement.toDataURL('image/png')
      setCapturas3D(prev => [...prev, dataUrl])
    } catch {
      // fallback: leer el canvas del DOM directamente
      try {
        const canvas = document.querySelector('canvas') as HTMLCanvasElement | null
        if (canvas) setCapturas3D(prev => [...prev, canvas.toDataURL('image/png')])
      } catch { }
    }
  }

  const eliminarCaptura = (idx: number) => {
    setCapturas3D(prev => prev.filter((_, i) => i !== idx))
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    const newImages: string[] = []
    let processed = 0

    files.slice(0, 2).forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          newImages.push(event.target.result as string)
        }
        processed++
        if (processed === Math.min(files.length, 2)) {
          setImages(prev => [...prev, ...newImages].slice(0, 2))
        }
      }
      reader.readAsDataURL(file)
    })
  }

  const [config, setConfig] = useState<ShedConfig>(
    guardado ? { ...DEFAULT_CONFIG, ...guardado } : DEFAULT_CONFIG,
  )
  const [prices, setPrices] = useState(INITIAL_PRICES)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [videoLinkCopied, setVideoLinkCopied] = useState(false)
  const videoMontaje = getMontajeVideo(config.type)
  const [etapaMontaje, setEtapaMontaje] = useState(0)
  const pasosMontaje = getGuiaMontaje(config)

  const copiarLinkVideo = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}${videoMontaje.src}` : videoMontaje.src
    try {
      await navigator.clipboard.writeText(url)
      setVideoLinkCopied(true)
      setTimeout(() => setVideoLinkCopied(false), 3000)
    } catch {
      if (typeof window !== "undefined") {
        window.open(url, "_blank")
      }
    }
  }

  // Las medidas se recuperan de localStorage al montar; hasta que eso pasa no se
  // guarda nada, o el efecto de guardado pisaría lo almacenado con los valores por defecto.
  const [hydrated, setHydrated] = useState(false)

  // Si el cotizador se abrió con un lead, mandan sus medidas y no se lee nada de
  // localStorage. La decisión se toma al montar y se guarda aquí: si dependiera de
  // la prop, un simple cambio de identidad volvería a disparar la lectura y pisaría
  // las medidas que Santi está editando.
  const reabriendoLead = useRef(Boolean(leadInicial))

  // Este efecto actualiza estado a propósito y no se puede evitar: localStorage no
  // existe en el servidor, así que sólo se puede leer una vez montado, y de ahí la
  // segunda pasada de render. Y `hydrated` tiene que ser estado, no una ref, porque
  // es lo que hace que el efecto de guardado vuelva a correr ya con las medidas
  // cargadas; con una ref guardaría los valores por defecto encima de lo almacenado,
  // que es exactamente lo que esto evita.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (reabriendoLead.current) {
      setHydrated(true)
      return
    }
    try {
      const storedAncho = localStorage.getItem('sanser_ancho')
      const storedLargo = localStorage.getItem('sanser_largo')
      const storedAlto = localStorage.getItem('sanser_alto')
      const storedWallLeft = localStorage.getItem('sanser_wall_left') === '1'
      const storedWallRight = localStorage.getItem('sanser_wall_right') === '1'
      const storedWallFront = localStorage.getItem('sanser_wall_front') === '1'
      const storedWallBack = localStorage.getItem('sanser_wall_back') === '1'
      const storedDoors = parseInt(localStorage.getItem('sanser_doors_count') || '0', 10)
      const storedGate = localStorage.getItem('sanser_gate') === '1'
      const storedGateBack = localStorage.getItem('sanser_gate_back') === '1'
      if (storedAncho && storedLargo && storedAlto) {
        setConfig(prev => ({
          ...prev,
          width: parseFloat(storedAncho) || 15,
          length: parseFloat(storedLargo) || 20,
          height: parseFloat(storedAlto) || 5,
          wallLeft: storedWallLeft,
          wallRight: storedWallRight,
          wallFront: storedWallFront,
          wallBack: storedWallBack,
          walls: storedWallLeft || storedWallRight,
          doorsCount: storedDoors,
          gate: storedGate,
          gateBack: storedGateBack,
        }))
      }
    } catch (e) {
      console.error("Error al cargar localStorage", e)
    }
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem('sanser_ancho', config.width.toString())
      localStorage.setItem('sanser_largo', config.length.toString())
      localStorage.setItem('sanser_alto', config.height.toString())
      localStorage.setItem('sanser_wall_left', config.wallLeft ? '1' : '0')
      localStorage.setItem('sanser_wall_right', config.wallRight ? '1' : '0')
      localStorage.setItem('sanser_wall_front', config.wallFront ? '1' : '0')
      localStorage.setItem('sanser_wall_back', config.wallBack ? '1' : '0')
      localStorage.setItem('sanser_doors_count', (config.doorsCount || 0).toString())
      localStorage.setItem('sanser_gate', config.gate ? '1' : '0')
      localStorage.setItem('sanser_gate_back', config.gateBack ? '1' : '0')
    } catch (e) {
      console.error("Error al guardar localStorage", e)
    }
  }, [hydrated, config.width, config.length, config.height, config.wallLeft, config.wallRight, config.wallFront, config.wallBack, config.doorsCount, config.gate, config.gateBack])

  const fetchCSV = useCallback(async (forceRefresh = false) => {
    setIsLoadingPrices(true)
    try {
      const bust = forceRefresh ? Date.now() : 'init'
      const url = GOOGLE_SHEETS_CSV_URL + '&t=' + bust
      const res = await fetch(url, { cache: 'no-store' })
      if (!res.ok) return
      const text = await res.text()
      const lines = text.split('\n')
      const newPrices: Partial<Prices> = {}

      lines.forEach(line => {
        // Soporta CSVs con comillas (ej: "Tornillos, Caja")
        // Para simplificar, si la hoja ahora es 3 columnas (Material, Unidad, Precio)
        // nos basamos en el final de la línea para encontrar el precio.
        const parts = line.split(',')
        if (parts.length < 2) return

        const textMatch = line.toLowerCase()
        // El precio suele estar al final de la línea en CSV limpios
        const rawPrice = parts[parts.length - 1]

        const parsePrecioInt = (val: string | number) => {
          const n = parseFloat(String(val).replace(/\./g, '').replace(/,/g, '.').replace(/[^0-9.]/g, ''));
          return (isNaN(n)) ? 0 : n;
        };
        const p = parsePrecioInt(rawPrice)

        if (p <= 0) return

        // Mapeo directo de nombres
        if (textMatch.includes('120') && textMatch.includes('perfil')) newPrices.perfil120 = p
        else if (textMatch.includes('80') && textMatch.includes('perfil')) {
          if (textMatch.includes('galv')) newPrices.perfil80Galv = p
          else newPrices.perfil80Negro = p
        }
        else if (textMatch.includes('ángulo') || textMatch.includes('angulo')) newPrices.angulo = p
        else if (textMatch.includes('chapa') || textMatch.includes('t101')) newPrices.chapa = p
        else if (textMatch.includes('bulón') || textMatch.includes('bulon') || textMatch.includes('juego')) newPrices.bulonesJuego = p
        else if (textMatch.includes('arandela')) newPrices.arandelas = p
        else if (textMatch.includes('autoperforante') || textMatch.includes('tornillo')) newPrices.tornillos = p
        else if (textMatch.includes('pintura') || textMatch.includes('convertidor') || textMatch.includes('óxido')) newPrices.pintura = p
        else if (textMatch.includes('aguarrás') || textMatch.includes('aguarras')) newPrices.aguarras = p
        else if (textMatch.includes('mano de obra') || textMatch.includes('armado')) newPrices.manoDeObra = p
        else if (textMatch.includes('flete') || textMatch.includes('logistica')) newPrices.flete = p
        else if (textMatch.includes('varilla') && textMatch.includes('12')) newPrices.varilla12 = p
        else if (textMatch.includes('varilla') && textMatch.includes('8')) newPrices.varilla8 = p
      })

      console.log("DETALLE MATERIALES CSV MAREADOS:", newPrices)
      setPrices(prev => ({ ...prev, ...newPrices }))
    } catch (e) {
      console.error("Error fetching CSV", e)
    } finally {
      setIsLoadingPrices(false)
    }
  }, [])

  useEffect(() => {
    // El spinner de precios se enciende al montar a propósito: la hoja de Google
    // es la fuente de verdad y hasta que responde no hay presupuesto que mostrar.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCSV()
  }, [fetchCSV])


  const configCargada = useRef(guardado ? JSON.stringify({ ...DEFAULT_CONFIG, ...guardado }) : null)

  useEffect(() => {
    // Presupuesto reabierto: mientras no cambien las medidas, mandan los valores
    // guardados, no los que recalcularía la hoja de precios.
    if (configCargada.current && JSON.stringify(config) === configCargada.current) return
    configCargada.current = null

    // Al cambiar medidas o precios el presupuesto se rehace entero, incluso si
    // se había tocado a mano: es el comportamiento querido.
    const { nuevoTitulo, nuevosItems, nuevoDetalle } = calcularPresupuesto(config, prices)
    setTitle(nuevoTitulo)
    setItems(nuevosItems)
    setMaterials(nuevoDetalle)
  }, [config, prices])



  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: "", unit: "unid", quantity: 1, price: 0 }])
  }

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id))
  }

  const updateItem = (id: string, field: keyof QuoteItem, value: string | number) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item))
  }

  const total = items.reduce((acc, item) => acc + item.quantity * item.price, 0)

  /**
   * Arma el PDF y lo descarga. Sin número es un borrador y así se rotula: sin
   * validez y con el aviso de que está sujeto a confirmación.
   */
  const construirPDF = async (numero: string | null): Promise<string | null> => {

    // ── Paleta corporativa SANSER ───────────────────────────────────────────
    const C = {
      naranja: [249, 115, 22] as [number, number, number], // #f97316
      oscuro: [17, 24, 39] as [number, number, number], // #111827
      oscuro2: [31, 41, 55] as [number, number, number], // #1f2937
      grisClaro: [249, 250, 251] as [number, number, number], // #f9fafb
      grisBorde: [229, 231, 235] as [number, number, number], // #e5e7eb
      grisTexto: [107, 114, 128] as [number, number, number], // #6b7280
      texto: [55, 65, 81] as [number, number, number], // #374151
      blanco: [255, 255, 255] as [number, number, number],
      negro: [0, 0, 0] as [number, number, number],
    }

    // ── Capturas 3D ───────────────────────────────────────
    // Prioridad: capturas manuales del usuario → captura automática de respaldo
    let imgSlots: (string | null)[] = []

    if (capturas3D.length > 0) {
      // El usuario capturó vistas manualmente: usarlas directamente
      imgSlots = capturas3D.slice(0, 3)
    } else {
      // Sin capturas manuales: tomar automáticamente 2 ángulos
      const sceneRef = getSceneRef()
      if (sceneRef) {
        try {
          const { gl, camera, scene } = sceneRef
          const origPos = camera.position.clone()
          const origQuat = camera.quaternion.clone()

          // Vista 1: ángulo actual
          gl.render(scene, camera)
          imgSlots.push(gl.domElement.toDataURL('image/png'))

          // Vista 2: ángulo posterior (180°)
          camera.position.set(-origPos.x, origPos.y, -origPos.z)
          camera.lookAt(0, config.height / 2, 0)
          gl.render(scene, camera)
          imgSlots.push(gl.domElement.toDataURL('image/png'))

          // Restaurar
          camera.position.copy(origPos)
          camera.quaternion.copy(origQuat)
          gl.render(scene, camera)
        } catch {
          try {
            const canvas3d = document.querySelector('canvas') as HTMLCanvasElement | null
            if (canvas3d) imgSlots.push(canvas3d.toDataURL('image/png'))
          } catch { }
        }
      }
    }

    // Fotos manuales subidas (legado): completar slots si hay espacio
    const fotosManual = images.filter(Boolean)
    for (const foto of fotosManual) {
      if (imgSlots.length < 3) imgSlots.push(foto)
    }

    const tieneCapturasManual = capturas3D.length > 0

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()   // 210
      let y = 0

      // ═════════════════════════════════════════════════════════
      // 1. BANDA DE ENCABEZADO OSCURA
      // ═════════════════════════════════════════════════════════
      const headerH = 40
      doc.setFillColor(...C.oscuro)
      doc.rect(0, 0, W, headerH, 'F')

      // Acento naranja inferior de 2px
      doc.setFillColor(...C.naranja)
      doc.rect(0, headerH - 2, W, 2, 'F')

      // Logo oficial SANSER dibujado con primitivas jsPDF
      // viewBox 0 0 100 50 → escala uniforme a 28x14mm (relación 2:1 exacta)
      // Origen: x=8, y=11 (centrado verticalmente en la banda de 40mm)
      const S = 0.28          // factor de escala uniforme (100px → 28mm)
      const lx = (px: number) => 8 + px * S
      const ly = (py: number) => 11 + py * S   // Y base = 11mm

      doc.setDrawColor(...C.naranja)
      doc.setLineWidth(1.0)
      doc.setLineCap('round')

      // Techo a 2 aguas: M 10 16 L 35 6 L 90 22
      doc.line(lx(10), ly(16), lx(35), ly(6))
      doc.line(lx(35), ly(6), lx(90), ly(22))

        // Columnas verticales
        ;[
          [10, 16, 10, 45],
          [35, 6, 35, 45],
          [53, 11.5, 53, 45],
          [71, 16.8, 71, 45],
          [90, 22, 90, 45],
        ].forEach(([x1, y1, x2, y2]) => {
          doc.line(lx(x1), ly(y1), lx(x2), ly(y2))
        })

      doc.setLineWidth(0.2)
      doc.setLineCap('butt')

      // Nombre empresa (junto al ícono)
      const nameX = 42
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(20)
      doc.setTextColor(...C.naranja)
      doc.text('SANSER METALÚRGICA', nameX, 17)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      doc.setTextColor(200, 205, 215)
      doc.text('Ecuador 811, Jardin America, Misiones', nameX, 23)
      doc.text('Tel: 03743-487728 | CUIT: 27-24674999-5 | sansermetalurgica@gmail.com', nameX, 28)

      // "PRESUPUESTO" a la derecha, dentro de la banda
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(...C.blanco)
      doc.text('PRESUPUESTO', W - 10, 17, { align: 'right' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.naranja)
      doc.text(`Fecha: ${date}`, W - 10, 24, { align: 'right' })
      doc.setTextColor(200, 205, 215)
      doc.text(
        numero ? `Nº Presupuesto: ${numero}` : 'BORRADOR — sujeto a confirmación',
        W - 10, 29, { align: 'right' },
      )

      y = headerH + 6

      // ═════════════════════════════════════════════════════════
      // 2. TARJETA DE CLIENTE Y DESCRIPCIÓN
      // ═════════════════════════════════════════════════════════
      // Tarjeta cliente (borde fino, fondo muy claro)
      const cardH = 22
      doc.setFillColor(...C.grisClaro)
      doc.setDrawColor(...C.grisBorde)
      doc.roundedRect(10, y, W - 20, cardH, 2, 2, 'FD')

      // Pequeño acento naranja a la izquierda
      doc.setFillColor(...C.naranja)
      doc.rect(10, y, 3, cardH, 'F')

      // Contenido tarjeta
      const cx = 17
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(...C.grisTexto)
      doc.text('CLIENTE', cx, y + 5)
      doc.text('CUIT', cx + 55, y + 5)
      doc.text('TELÉFONO', cx + 105, y + 5)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.oscuro2)
      doc.text(clientName || (cuit ? 'Ver CUIT' : 'Consumidor Final'), cx, y + 11)
      doc.text(cuit || '—', cx + 55, y + 11)
      doc.text(phone || '—', cx + 105, y + 11)

      // Título del trabajo
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...C.grisTexto)
      doc.text('OBRA / TRABAJO', cx, y + 18)
      doc.setFontSize(8)
      doc.setTextColor(...C.oscuro2)
      doc.text((title || 'Tinglado').toUpperCase(), cx + 32, y + 18)

      y += cardH + 5

      // Dimensiones y materiales
      doc.setFillColor(...C.naranja)
      doc.rect(10, y, 3, 4, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.naranja)
      doc.text('DESCRIPCIÓN DEL TRABAJO', 16, y + 3)

      y += 12
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...C.texto)
      const matLineas = doc.splitTextToSize(`Materiales: ${materials || 'No especificado'}`, W - 24)
      doc.text(matLineas, 12, y)

      y += matLineas.length * 4.5 + 6

      // ═════════════════════════════════════════════════════════
      // 3. RENDERS / FOTOS (1–3 imágenes, layout adaptativo)
      // ═════════════════════════════════════════════════════════
      const imgCount = imgSlots.filter(Boolean).length
      if (imgCount > 0) {
        if (y > 180) { doc.addPage(); y = 15 }

        // Título sección renders
        doc.setFillColor(...C.naranja)
        doc.rect(10, y, 3, 4, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...C.naranja)
        const lblImg = tieneCapturasManual
          ? 'RENDERS 3D DEL TRABAJO (Vistas seleccionadas)'
          : 'RENDERS 3D DEL TRABAJO'
        doc.text(lblImg, 16, y + 3)
        y += 8

        const addImg = (src: string, x: number, imgY: number, iW: number, iH: number) => {
          doc.setDrawColor(...C.grisBorde)
          doc.setFillColor(...C.grisClaro)
          doc.rect(x, imgY, iW, iH, 'FD')
          if (src.length > 50) {
            try {
              const fmt = src.startsWith('data:image/png') ? 'PNG' : 'JPEG'
              doc.addImage(src, fmt, x, imgY, iW, iH)
            } catch { /* imagen no disponible */ }
          }
          doc.setDrawColor(...C.oscuro)
          doc.setLineWidth(0.4)
          doc.rect(x, imgY, iW, iH)
          doc.setLineWidth(0.2)
        }

        const dimLabel = `${config.width}m × ${config.length}m × ${config.height}m`
        const vistas = tieneCapturasManual
          ? imgSlots.map((_, i) => `Vista ${i + 1}`)
          : ['Vista Frontal Isométrica', 'Vista Posterior / Lateral', 'Vista Lateral']

        if (imgCount === 1) {
          // Una sola imagen centrada y grande
          const iW = 140
          const iH = 72
          const x1 = (W - iW) / 2
          addImg(imgSlots[0]!, x1, y, iW, iH)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...C.oscuro)
          doc.text(`DIMENSIONES: ${dimLabel}`, x1 + iW / 2, y + iH + 4, { align: 'center' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...C.grisTexto)
          doc.text(vistas[0], x1 + iW / 2, y + iH + 8, { align: 'center' })
          y += iH + 12

        } else if (imgCount === 2) {
          // Dos imágenes lado a lado
          const iW = 88
          const iH = 50
          const gap = 6
          const x1 = 10
          const x2 = x1 + iW + gap
          addImg(imgSlots[0]!, x1, y, iW, iH)
          addImg(imgSlots[1]!, x2, y, iW, iH)
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...C.oscuro)
          doc.text(`DIMENSIONES: ${dimLabel}`, x1 + iW / 2, y + iH + 4, { align: 'center' })
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...C.grisTexto)
          doc.text(vistas[0], x1 + iW / 2, y + iH + 8, { align: 'center' })
          doc.text(vistas[1], x2 + iW / 2, y + iH + 8, { align: 'center' })
          y += iH + 12

        } else {
          // Tres imágenes: dos arriba, una abajo centrada (o las 3 en fila si caben)
          const iW = 57
          const iH = 38
          const gap = 5
          const totalW = iW * 3 + gap * 2
          const startX = (W - totalW) / 2
          for (let i = 0; i < 3; i++) {
            const img = imgSlots[i]
            if (!img) continue
            const xPos = startX + i * (iW + gap)
            addImg(img, xPos, y, iW, iH)
            doc.setFont('helvetica', 'normal')
            doc.setFontSize(6)
            doc.setTextColor(...C.grisTexto)
            doc.text(vistas[i] ?? `Vista ${i + 1}`, xPos + iW / 2, y + iH + 4, { align: 'center' })
          }
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...C.oscuro)
          doc.text(`DIMENSIONES: ${dimLabel}`, W / 2, y + iH + 9, { align: 'center' })
          y += iH + 14
        }
      }

      // ═════════════════════════════════════════════════════════
      // 4. TABLA DE PRESUPUESTO
      // ═════════════════════════════════════════════════════════
      if (y > 220) { doc.addPage(); y = 15 }

      doc.setFillColor(...C.naranja)
      doc.rect(10, y, 3, 4, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(...C.naranja)
      doc.text('DETALLE DE PRESUPUESTO', 16, y + 3)
      y += 7

      const tBody = items.map((item, i) => [
        String(i + 1),
        item.description,
        item.unit,
        String(item.quantity),
        `$ ${item.price.toLocaleString('es-AR')}`,
        `$ ${(item.price * item.quantity).toLocaleString('es-AR')}`
      ])

      autoTable(doc, {
        startY: y,
        head: [['#', 'DESCRIPCIÓN DEL ÍTEM', 'UNIDAD', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
        body: tBody.length > 0 ? tBody : [['—', 'Sin ítems', '', '', '', '']],
        theme: 'grid',
        headStyles: {
          fillColor: C.oscuro,
          textColor: C.blanco,
          fontStyle: 'bold',
          fontSize: 8.5,
          cellPadding: 3,
        },
        bodyStyles: {
          fontSize: 8.5,
          textColor: C.texto,
          cellPadding: 2.5,
        },
        alternateRowStyles: { fillColor: C.grisClaro },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center', fontStyle: 'bold' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 32, halign: 'right' },
          5: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        },
        margin: { left: 10, right: 10 },
      })

      // ═══════════════════════════════════════════════════════
      // 5. CAJA TOTAL FINAL
      // ═══════════════════════════════════════════════════════
      const tFinalY = (doc as DocWithAutoTable).lastAutoTable.finalY + 6
      const W2 = doc.internal.pageSize.getWidth()
      const H2 = doc.internal.pageSize.getHeight()
      const boxW = 88
      const boxH = 20
      const boxX = W2 - 10 - boxW

      doc.setFillColor(...C.grisClaro)
      doc.setDrawColor(...C.naranja)
      doc.setLineWidth(0.8)
      doc.roundedRect(boxX, tFinalY, boxW, boxH, 2, 2, 'FD')
      doc.setLineWidth(0.2)

      doc.setFillColor(...C.naranja)
      doc.roundedRect(boxX, tFinalY, 4, boxH, 2, 0, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(...C.grisTexto)
      doc.text('TOTAL ESTIMATIVO GLOBAL', boxX + boxW - 4, tFinalY + 7, { align: 'right' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(...C.naranja)
      doc.text(
        `$ ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        boxX + boxW - 4, tFinalY + 16, { align: 'right' }
      )

      // ═══════════════════════════════════════════════════════
      // 6. PIE DE PÁGINA INSTITUCIONAL
      // ═══════════════════════════════════════════════════════
      const footerY = H2 - 14
      doc.setDrawColor(...C.grisBorde)
      doc.setLineWidth(0.3)
      doc.line(10, footerY, W2 - 10, footerY)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(...C.grisTexto)
      doc.text(
        numero
          ? 'Presupuesto válido por 7 días. Precios sujetos a variación de materiales.'
          : 'Borrador interno — no válido como presupuesto hasta su confirmación.',
        W2 / 2, footerY + 5, { align: 'center' }
      )
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.naranja)
      doc.text(
        'SANSER Metalúrgica — Estructuras de acero que aguantan.',
        W2 / 2, footerY + 10, { align: 'center' }
      )

      const safeTitle = (title || 'Presupuesto').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')
      doc.save(`${numero ? numero + '_' : 'BORRADOR_'}SANSER_${safeTitle}.pdf`)

      return doc.output("datauristring").split(",")[1]
    } catch (error) {
      console.error('Error al generar el PDF', error)
      alert(`Error al generar el PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`)
      return null
    }
  }

  // Validación de contacto para evitar leads fantasma. El correo es
  // obligatorio para el visitante: si el teléfono viene mal, es la única vía.
  const problemaCliente = problemaDeContacto({
    name: clientName,
    phone,
    email,
    exigirEmail: !interno,
  })
  const faltanDatosCliente = problemaCliente !== null

  const datosDelPresupuesto = () => ({
    kind: "presupuesto" as const,
    name: clientName || null,
    phone: phone || null,
    email: email.trim() || null,
    cuit: cuit || null,
    quoteTitle: title,
    quoteTotal: total,
    quoteConfig: { ...config, items, materials },
  })

  /** Deja el presupuesto guardado como borrador y devuelve su id. */
  const guardarBorrador = async (): Promise<string | null> => {
    if (leadId) return leadId
    const registrado = await registrarLead(datosDelPresupuesto())
    if (registrado?.leadId) setLeadId(registrado.leadId)
    return registrado?.leadId ?? null
  }

  /** Lo que hace el visitante: pedir el presupuesto, sin llevarse ningún papel. */
  const pedirPresupuesto = async () => {
    if (problemaCliente) {
      setErrorEnvio(problemaCliente)
      return
    }

    setIsGenerating(true)
    setErrorEnvio(null)
    try {
      const registrado = await registrarLead(datosDelPresupuesto())
      if (registrado?.error) {
        setErrorEnvio(registrado.error)
        return
      }
      reportarSolicitudPresupuesto()
      setPedidoEnviado(true)
    } finally {
      setIsGenerating(false)
    }
  }

  /** Santi descarga el borrador para revisarlo; no se guarda en el CRM. */
  const descargarBorrador = async () => {
    if (faltanDatosCliente) {
      alert(problemaCliente)
      return
    }
    setIsGenerating(true)
    try {
      await guardarBorrador()
      // Si ya está confirmado, lo que se descarga es el documento con su número.
      await construirPDF(numeroPresupuesto)
    } finally {
      setIsGenerating(false)
    }
  }

  /**
   * Confirmar es el acto que convierte el borrador en documento: la base le da
   * su número correlativo y recién ahí se genera y guarda el PDF definitivo.
   */
  const confirmarPresupuesto = async () => {
    if (faltanDatosCliente) {
      alert(problemaCliente)
      return
    }

    setIsGenerating(true)
    try {
      const id = await guardarBorrador()
      if (!id) {
        alert("No se pudo guardar el presupuesto. Probá de nuevo.")
        return
      }

      const confirmacion = await fetch("/api/admin/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...datosDelPresupuesto() }),
      })
      if (!confirmacion.ok) {
        alert("No se pudo confirmar el presupuesto.")
        return
      }

      const { lead } = await confirmacion.json()
      setNumeroPresupuesto(lead.quote_number)

      const pdfBase64 = await construirPDF(lead.quote_number)
      if (!pdfBase64) return

      const guardado = await fetch(`/api/admin/leads/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pdfBase64 }),
      })
      if (guardado.ok) {
        const { pdfUrl, pdfToken } = await guardado.json()
        if (pdfUrl && pdfToken) setPdfCompartido({ url: pdfUrl, token: pdfToken, title })
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const sendToWhatsApp = () => {
    if (problemaCliente) {
      alert(problemaCliente)
      return
    }

    const totalStr = total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })

    const enlacePdf = pdfCompartido?.title === title ? pdfCompartido.url : null
    const bloquePdf = enlacePdf ? `\n\nPodés descargarlo acá:\n${enlacePdf}` : ""

    const { supTotalCerramientos } = getSuperficies(config)
    const doorsCount = config.doorsCount || 0

    const desgloseItems = items
      .filter(i => (i.price * i.quantity > 0) || !i.description.includes("Transporte"))
      .map(i => `• ${i.description}: $ ${(i.price * i.quantity).toLocaleString("es-AR")}`)
      .join("\n")

    const message = interno
      ? `Hola! Te adjuntamos el presupuesto de tu proyecto: *${title}*.\n\n*Detalle del presupuesto:*\n${desgloseItems}\n\n*Total estimado: $ ${totalStr}*${bloquePdf}\n\nCualquier consulta estamos a disposición.\n\nSaludos,\nSANSER Metalúrgica.`
      : `Hola! Soy ${clientName}. Coticé en la web un *${title}* (${config.width}x${config.length}m, alto ${config.height}m${supTotalCerramientos > 0 ? `, con ${supTotalCerramientos} m² de cerramientos` : ""}${doorsCount > 0 ? `, ${doorsCount} puerta(s) de acceso` : ""}${config.gate ? ", con portón frontal" : ""}${config.gateBack ? ", con portón trasero" : ""}) y quiero consultar.${bloquePdf}`
    const encodedMessage = encodeURIComponent(message)

    // Si el presupuesto ya está en el CRM, enviarlo lo marca como contactado en
    // lugar de crear otro registro del mismo cliente.
    if (enlacePdf && pdfCompartido) {
      trackLead({
        kind: "whatsapp",
        pdfToken: pdfCompartido.token,
        origen: interno ? "interno" : "cliente",
      })
    } else {
      trackLead({
        kind: "whatsapp",
        name: clientName || null,
        phone,
        email: email.trim() || null,
        cuit: cuit || null,
        message: `Envío de presupuesto: ${title}`,
        quoteTitle: title,
        quoteTotal: total,
      })
    }

    if (!interno) reportarSolicitudPresupuesto()

    // El vendedor le escribe al cliente; el visitante nos escribe a nosotros.
    const destino = interno
      ? `https://wa.me/${phone.replace(/\D/g, '')}`
      : CONTACT.whatsappBase

    window.open(`${destino}?text=${encodedMessage}`, '_blank')
  }

  const { supLateral, supGable, supTotalCerramientos } = getSuperficies(config)

  const toggleAmbosLaterales = () => {
    const ambosActivos = Boolean(config.wallLeft && config.wallRight)
    const nuevo = !ambosActivos
    setConfig(prev => ({
      ...prev,
      wallLeft: nuevo,
      wallRight: nuevo,
      walls: nuevo,
    }))
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <FileText className="size-6" />
            {interno ? "Cotizador Interno" : "Cotizá tu tinglado"}
          </h1>
          <p className="text-muted-foreground">
            {interno
              ? "Genera presupuestos institucionales en PDF para enviar a los clientes."
              : "Elegí las medidas, mirá tu estructura en 3D y descargá el presupuesto en PDF al instante."}
          </p>
        </div>

        {/* 3D Visualizer */}
        <div className="space-y-3">
          <div className="h-[460px] md:h-[500px] w-full bg-[#12141a] rounded-xl overflow-hidden border border-border shadow-sm relative">
            <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
              {interno ? "Vista Previa 3D" : "Tu estructura en 3D — giralo con el mouse"}
            </div>
            {/* Botones overlay: Capturar + Compartir */}
            {interno && (
              <div className="absolute top-4 right-4 z-20 flex gap-2">
                <Button
                  id="btn-capturar-vista-3d"
                  size="sm"
                  onClick={capturarVista}
                  disabled={capturas3D.length >= 3}
                  variant="outline"
                  title={capturas3D.length >= 3 ? "Máximo 3 vistas guardadas" : "Capturar la vista actual para el PDF"}
                  className="gap-2 bg-black/60 hover:bg-black/80 text-white border-white/20 backdrop-blur-sm text-xs shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="size-3.5" />
                  Capturar vista{capturas3D.length > 0 ? ` (${capturas3D.length}/3)` : ""}
                </Button>
                <Button
                  id="btn-copiar-link-3d-header"
                  size="sm"
                  onClick={copiarLink3D}
                  variant="outline"
                  title="Copiar link del visor 3D interactivo para compartir por WhatsApp"
                  className="gap-2 bg-black/60 hover:bg-black/80 text-white border-white/20 backdrop-blur-sm text-xs shadow-md cursor-pointer"
                >
                  <Share2 className="size-3.5" />
                  {link3DCopied ? "¡Link copiado!" : "Copiar Link 3D"}
                </Button>
              </div>
            )}
            <ConfigScene config={config} onReady={onSceneReady} etapaMontaje={etapaMontaje} />
            {sceneReady && (
              <BarraSecuencia
                pasos={pasosMontaje}
                etapa={etapaMontaje}
                onEtapa={setEtapaMontaje}
              />
            )}
          </div>

          {/* Thumbnails de vistas capturadas (solo modo interno) */}
          {interno && capturas3D.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground/70 uppercase tracking-wider">
                  Vistas para el PDF
                  <span className="ml-2 font-normal text-muted-foreground">({capturas3D.length}/3) — estas imágenes se incluirán en el presupuesto</span>
                </p>
                <button
                  onClick={() => setCapturas3D([])}
                  className="text-xs text-red-500 hover:underline"
                >
                  Borrar todas
                </button>
              </div>
              <div className="flex gap-3 flex-wrap">
                {capturas3D.map((src, idx) => (
                  <div key={idx} className="relative group rounded-lg overflow-hidden border border-border shadow-sm" style={{ width: 120, height: 72 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`Vista ${idx + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={() => eliminarCaptura(idx)}
                        className="bg-red-600 hover:bg-red-500 rounded-full p-1 text-white transition-colors"
                        title="Eliminar esta vista"
                      >
                        <X className="size-3" />
                      </button>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] text-center py-0.5">
                      Vista {idx + 1}
                    </div>
                  </div>
                ))}
                {capturas3D.length < 3 && (
                  <button
                    onClick={capturarVista}
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border hover:border-primary/60 bg-background/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-colors text-xs gap-1"
                    style={{ width: 120, height: 72 }}
                    title="Agregar otra vista"
                  >
                    <Camera className="size-5" />
                    Agregar vista
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Aviso cuando no hay capturas manuales (solo modo interno) */}
          {interno && capturas3D.length === 0 && (
            <p className="text-xs text-muted-foreground">
              💡 Orientá el modelo y presioná <strong className="text-foreground/70">Capturar vista</strong> para elegir qué ángulos aparecen en el PDF. Sin capturas, se usará la vista actual automáticamente.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Panel Form */}
          <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold border-b border-border pb-2">Dimensiones del Tinglado</h2>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-foreground/80">Tipo de Estructura</label>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(TYPE_LABEL) as [ShedType, string][]).map(([typeVal, label]) => (
                  <button
                    key={typeVal}
                    onClick={() => setConfig({ ...config, type: typeVal })}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors border ${config.type === typeVal
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background hover:bg-muted border-input text-foreground'
                      }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-foreground/80">Ancho (m)</label>
                <input
                  type="number"
                  min="3" max="50" step="1"
                  value={config.width === EMPTY_NUMBER ? "" : config.width}
                  onChange={e => setConfig({ ...config, width: e.target.value === "" ? EMPTY_NUMBER : parseFloat(e.target.value) })}
                  onFocus={e => e.target.select()}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-foreground/80">Largo (m)</label>
                <input
                  type="number"
                  min="3" max="100" step="1"
                  value={config.length === EMPTY_NUMBER ? "" : config.length}
                  onChange={e => setConfig({ ...config, length: e.target.value === "" ? EMPTY_NUMBER : parseFloat(e.target.value) })}
                  onFocus={e => e.target.select()}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-foreground/80">Alto (m)</label>
                <input
                  type="number"
                  min="2" max="20" step="0.5"
                  value={config.height === EMPTY_NUMBER ? "" : config.height}
                  onChange={e => setConfig({ ...config, height: e.target.value === "" ? EMPTY_NUMBER : parseFloat(e.target.value) })}
                  onFocus={e => e.target.select()}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-mono"
                />
              </div>
            </div>

            {config.type === "shed" && (
              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="centralColumns"
                  checked={!!config.centralColumns}
                  onChange={e => setConfig({ ...config, centralColumns: e.target.checked })}
                  className="size-4 rounded border-input bg-background text-primary focus:ring-primary"
                />
                <label htmlFor="centralColumns" className="text-sm font-medium text-foreground/80 cursor-pointer">
                  Columnas intermedias de apoyo
                </label>
              </div>
            )}

            {/* Cerramientos y Aberturas */}
            <div className="space-y-4 pt-4 border-t border-border">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    Cerramientos y Aberturas
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Elegí qué laterales cerrar y agregá puertas de acceso
                  </p>
                </div>
                {supTotalCerramientos > 0 && (
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary border border-primary/20">
                    Total: {supTotalCerramientos} m²
                  </span>
                )}
              </div>

              {/* Cerramientos Laterales (Izquierdo y Derecho) */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase text-foreground/80">
                    Laterales (Largo: {config.length || 0}m × Alto: {config.height || 0}m)
                  </span>
                  <button
                    type="button"
                    onClick={toggleAmbosLaterales}
                    className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                  >
                    {config.wallLeft && config.wallRight ? "Desmarcar ambos" : "Marcar ambos"}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Lateral Izquierdo */}
                  <label
                    htmlFor="wall-left"
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer select-none",
                      config.wallLeft
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-background/60 border-input hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Lat. Izquierdo</span>
                      <input
                        id="wall-left"
                        type="checkbox"
                        checked={!!config.wallLeft}
                        onChange={e => setConfig({ ...config, wallLeft: e.target.checked, walls: e.target.checked || !!config.wallRight })}
                        className="size-4 rounded border-input text-primary focus:ring-primary accent-[#F97316]"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Superficie: <strong className="text-foreground">{supLateral} m²</strong>
                    </span>
                  </label>

                  {/* Lateral Derecho */}
                  <label
                    htmlFor="wall-right"
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer select-none",
                      config.wallRight
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-background/60 border-input hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Lat. Derecho</span>
                      <input
                        id="wall-right"
                        type="checkbox"
                        checked={!!config.wallRight}
                        onChange={e => setConfig({ ...config, wallRight: e.target.checked, walls: !!config.wallLeft || e.target.checked })}
                        className="size-4 rounded border-input text-primary focus:ring-primary accent-[#F97316]"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Superficie: <strong className="text-foreground">{supLateral} m²</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Cerramientos Frontal y Trasero (Tímpanos) */}
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase text-foreground/80">
                  Frente y Fondo (Ancho: {config.width || 0}m + Tímpano)
                </span>

                <div className="grid grid-cols-2 gap-3">
                  {/* Frontal */}
                  <label
                    htmlFor="wall-front"
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer select-none",
                      config.wallFront
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-background/60 border-input hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Frente / Frontal</span>
                      <input
                        id="wall-front"
                        type="checkbox"
                        checked={!!config.wallFront}
                        onChange={e => setConfig({ ...config, wallFront: e.target.checked })}
                        className="size-4 rounded border-input text-primary focus:ring-primary accent-[#F97316]"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Superficie: <strong className="text-foreground">{supGable} m²</strong>
                    </span>
                  </label>

                  {/* Trasero */}
                  <label
                    htmlFor="wall-back"
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer select-none",
                      config.wallBack
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-background/60 border-input hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Fondo / Trasero</span>
                      <input
                        id="wall-back"
                        type="checkbox"
                        checked={!!config.wallBack}
                        onChange={e => setConfig({ ...config, wallBack: e.target.checked })}
                        className="size-4 rounded border-input text-primary focus:ring-primary accent-[#F97316]"
                      />
                    </div>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      Superficie: <strong className="text-foreground">{supGable} m²</strong>
                    </span>
                  </label>
                </div>
              </div>

              {/* Puertas de Acceso Peatonal */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-xs font-bold uppercase text-foreground/80 block">
                      Puertas de Acceso Peatonal
                    </label>
                    <span className="text-[11px] text-muted-foreground">
                      0.90 × 2.05 m con marco reforzado y cerradura de seguridad
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, doorsCount: Math.max(0, (config.doorsCount || 0) - 1) })}
                      disabled={!config.doorsCount || config.doorsCount <= 0}
                      className="size-8 rounded border border-input bg-background flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Quitar puerta"
                    >
                      -
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-sm text-foreground">
                      {config.doorsCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => setConfig({ ...config, doorsCount: Math.min(10, (config.doorsCount || 0) + 1) })}
                      className="size-8 rounded border border-input bg-background flex items-center justify-center font-bold text-sm text-foreground hover:bg-muted transition-colors cursor-pointer"
                      title="Agregar puerta"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Portones de Acceso Vehicular */}
              <div className="space-y-2 pt-2 border-t border-border/60">
                <span className="text-xs font-bold uppercase text-foreground/80 block">
                  Portones
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {/* Portón Frontal */}
                  <label
                    htmlFor="gate-front"
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer select-none",
                      config.gate
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-background/60 border-input hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Portón Frontal</span>
                      <input
                        id="gate-front"
                        type="checkbox"
                        checked={!!config.gate}
                        onChange={e => setConfig({ ...config, gate: e.target.checked })}
                        className="size-4 rounded border-input text-primary focus:ring-primary accent-[#F97316]"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Abertura delantera para acceso vehicular
                    </span>
                  </label>

                  {/* Portón Trasero */}
                  <label
                    htmlFor="gate-back"
                    className={cn(
                      "flex flex-col gap-1 p-3 rounded-lg border transition-all cursor-pointer select-none",
                      config.gateBack
                        ? "bg-primary/10 border-primary shadow-sm"
                        : "bg-background/60 border-input hover:border-primary/40 hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-foreground">Portón Trasero</span>
                      <input
                        id="gate-back"
                        type="checkbox"
                        checked={!!config.gateBack}
                        onChange={e => setConfig({ ...config, gateBack: e.target.checked })}
                        className="size-4 rounded border-input text-primary focus:ring-primary accent-[#F97316]"
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      Abertura posterior (galpón pasante)
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <h2 className="text-xl font-bold border-b border-border pb-2 mt-6">
              {interno ? "Datos y Descripción" : "Tus datos"}
            </h2>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/80">
                {interno ? "Nombre del Cliente" : "Tu nombre"}{" "}
                <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={e => setClientName(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                placeholder="Ej: Marta Gómez"
              />
            </div>

            {interno && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-foreground/80">Fecha</label>
                  <input
                    type="text"
                    value={date}
                    onChange={e => setDate(e.target.value)}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-foreground/80">CUIT Cliente</label>
                  <input
                    type="text"
                    value={cuit}
                    onChange={e => setCuit(e.target.value)}
                    className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
                    placeholder="Opcional"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/80">
                {interno ? "Teléfono Cliente (WhatsApp)" : "Tu teléfono (WhatsApp)"}{" "}
                <span className="text-primary">*</span>
              </label>
              <CampoTelefono
                value={phone}
                onChange={setPhone}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/80">
                {interno ? "Email Cliente (Opcional)" : "Tu correo electrónico"}{" "}
                {!interno && <span className="text-primary">*</span>}
              </label>
              <CampoEmail
                value={email}
                onChange={setEmail}
                opcional={interno}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/80">
                {interno ? "Título del Trabajo" : "Tu presupuesto"}
              </label>
              {interno ? (
                <input
                  type="text"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-bold"
                />
              ) : (
                <p className="rounded-md border border-border bg-background/50 px-3 py-2 text-sm font-bold">
                  {title}
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold uppercase text-foreground/80">
                {interno ? "Detalle de Materiales" : "Qué incluye"}
              </label>
              {interno ? (
                <textarea
                  value={materials}
                  onChange={e => setMaterials(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[100px]"
                />
              ) : (
                <p className="rounded-md border border-border bg-background/50 px-3 py-2 text-xs leading-relaxed text-foreground/80 font-medium">
                  {materials}
                </p>
              )}
            </div>

            {interno && (
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-foreground/80">Imágenes Adicionales Opcionales</label>
                <div className="flex items-center gap-4">
                  <label className="cursor-pointer bg-muted hover:bg-muted/80 text-foreground px-4 py-2 rounded-md text-sm flex items-center gap-2 border border-border transition-colors">
                    <ImageIcon className="size-4" />
                    Subir Fotos
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </label>
                  <span className="text-xs text-muted-foreground">{images.length} foto(s) cargadas</span>
                  {images.length > 0 && (
                    <button onClick={() => setImages([])} className="text-xs text-red-500 hover:underline">
                      Borrar
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>

          {/* Table Form */}
          <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h2 className="text-xl font-bold">
                {interno ? "Ítems de Presupuesto" : "Tu presupuesto"}
              </h2>
              {interno && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => fetchCSV(true)}
                    variant="outline"
                    size="sm"
                    className="h-8 gap-2 text-xs"
                    disabled={isLoadingPrices}
                  >
                    <RefreshCw className={isLoadingPrices ? "size-3 animate-spin" : "size-3"} />
                    <span className="hidden sm:inline">Actualizar Precios</span>
                  </Button>
                  <Button onClick={addItem} size="sm" variant="outline" className="h-8 gap-1">
                    <Plus className="size-3" /> Agregar
                  </Button>
                </div>
              )}
            </div>

            {!interno && (
              <div className="space-y-3">
                {items.map(item => {
                  const isTransporte = item.description.includes("Transporte / Flete / Instalación")
                  const isCero = item.quantity * item.price === 0

                  return (
                    <div
                      key={item.id}
                      className="flex items-baseline justify-between gap-4 border-b border-border/60 pb-3 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium">{item.description}</p>
                        <p className="text-xs font-medium text-foreground/80">
                          {item.quantity} {item.unit}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-sm">
                        {interno ? (
                          `$ ${(item.quantity * item.price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                        ) : (
                          <span className="inline-flex items-center rounded-sm bg-[#F97316]/10 px-2 py-0.5 text-xs font-bold text-[#F97316] ring-1 ring-inset ring-[#F97316]/20">
                            A cotizar sin cargo
                          </span>
                        )}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {interno && (
              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div key={item.id} className="p-3 border border-border rounded-lg space-y-3 bg-background/50 relative group">
                    <button
                      onClick={() => removeItem(item.id)}
                      className="absolute right-2 top-2 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="size-4" />
                    </button>

                    <div className="pr-6">
                      <input
                        type="text"
                        value={item.description}
                        onChange={e => updateItem(item.id, 'description', e.target.value)}
                        placeholder="Descripción del ítem"
                        className="w-full bg-transparent border-b border-border pb-1 text-sm focus:outline-none focus:border-primary"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase text-foreground/90">Unidad</label>
                        <input
                          type="text"
                          value={item.unit}
                          onChange={e => updateItem(item.id, 'unit', e.target.value)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-foreground/90">Cant.</label>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase text-foreground/90">Precio Unit.</label>
                        <input
                          type="number"
                          value={item.price}
                          onChange={e => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-4 border-t border-border flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg text-foreground/90">
                  {interno ? "TOTAL ESTIMADO:" : "PRESUPUESTO:"}
                </span>
                <span className="font-bold text-2xl text-primary">
                  {isLoadingPrices && interno ? (
                    <span className="text-sm font-normal text-muted-foreground italic flex items-center gap-2">
                      <RefreshCw className="size-4 animate-spin" /> Calculando...
                    </span>
                  ) : interno ? (
                    `$ ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
                  ) : (
                    <span className="text-lg">Cotización personalizada</span>
                  )}
                </span>
              </div>
              {!interno && (
                <p className="text-xs text-muted-foreground leading-relaxed text-right">
                  El monto corresponde a la estructura base. <br className="hidden sm:block" />
                  <strong className="text-foreground/80">El flete y la instalación se cotizan según la ubicación de entrega.</strong>
                </p>
              )}
            </div>

            {/* Módulo de Video Explicativo de Montaje Paso a Paso */}
            <div className="pt-5 border-t border-border space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                    <Video className="size-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                      Video Explicativo de Montaje
                    </h3>
                    <p className="text-[11px] text-muted-foreground">
                      Paso a paso de armado e instalación ({videoMontaje.label})
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono font-bold text-primary border border-primary/20 whitespace-nowrap">
                  {videoMontaje.filename}
                </span>
              </div>

              {/* Reproductor de Video */}
              <div className="relative overflow-hidden rounded-lg border border-border bg-black/60 shadow-inner">
                <video
                  key={videoMontaje.src}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full aspect-video object-cover"
                >
                  <source src={videoMontaje.src} type="video/mp4" />
                  Tu navegador no soporta la reproducción de video HTML5.
                </video>
              </div>

              {/* Botones de acción directa */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <a
                  href={videoMontaje.src}
                  download={videoMontaje.filename}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background/80 hover:bg-muted hover:border-primary/40 px-3 py-2 text-xs font-bold text-foreground transition-all shadow-sm"
                  title={`Descargar archivo ${videoMontaje.filename}`}
                >
                  <Download className="size-3.5 text-primary shrink-0" />
                  <span>Descargar video</span>
                </a>

                <button
                  type="button"
                  onClick={copiarLinkVideo}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-xs font-bold transition-all shadow-sm cursor-pointer",
                    videoLinkCopied
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      : "border-input bg-background/80 hover:bg-muted hover:border-primary/40 text-foreground"
                  )}
                  title="Copiar enlace directo del video para enviar por WhatsApp"
                >
                  {videoLinkCopied ? (
                    <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                  ) : (
                    <Copy className="size-3.5 text-primary shrink-0" />
                  )}
                  <span>{videoLinkCopied ? "¡Enlace copiado!" : "Copiar enlace del video"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {(errorEnvio || problemaCliente) && !pedidoEnviado && (
          <p className="pt-4 text-right text-xs text-primary">{errorEnvio || problemaCliente}</p>
        )}

        {interno ? (
          <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
            <div className="flex flex-col items-end gap-1">
              <Button
                onClick={sendToWhatsApp}
                variant="outline"
                disabled={faltanDatosCliente || !numeroPresupuesto}
                className="gap-2 border-green-600 text-green-500 hover:bg-green-600/10 hover:text-green-400 w-full sm:w-auto"
              >
                <Send className="size-4" /> Enviar al cliente
              </Button>
              <span className="text-[10px] text-muted-foreground">
                {numeroPresupuesto
                  ? "(El mensaje incluye el enlace al PDF)"
                  : "(Confirmá el presupuesto para poder enviarlo)"}
              </span>
            </div>

            <Button
              onClick={descargarBorrador}
              variant="outline"
              disabled={isGenerating || faltanDatosCliente}
              className="gap-2"
            >
              <Download className="size-4" />
              {numeroPresupuesto ? "Descargar PDF" : "Descargar borrador"}
            </Button>

            <Button
              id="btn-compartir-3d-whatsapp"
              onClick={copiarLink3D}
              variant="outline"
              className="gap-2 border-emerald-600 text-emerald-400 hover:bg-emerald-600/10 hover:text-emerald-300"
              title="Copia el link del visor 3D interactivo para compartir por WhatsApp"
            >
              {link3DCopied ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Share2 className="size-4" />
              )}
              {link3DCopied ? "¡Link copiado!" : "Compartir 3D por WhatsApp"}
            </Button>

            <Button
              onClick={confirmarPresupuesto}
              disabled={isGenerating || faltanDatosCliente || Boolean(numeroPresupuesto)}
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isGenerating ? (
                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <CheckCircle2 className="size-4" />
              )}
              {numeroPresupuesto ? `Confirmado ${numeroPresupuesto}` : "Confirmar presupuesto"}
            </Button>
          </div>
        ) : pedidoEnviado ? (
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/5 p-6 text-center">
            <CheckCircle2 className="mx-auto mb-3 size-8 text-primary" />
            <h2 className="text-lg font-bold">
              Listo{clientName ? `, ${clientName.split(" ")[0]}` : ""}. Recibimos tu pedido.
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-foreground/80 font-medium">
              Estamos preparando el presupuesto de tu <strong>{title}</strong>. Te lo
              confirmamos por WhatsApp al {phone}, revisado por nuestro equipo.
            </p>
            <button
              onClick={sendToWhatsApp}
              className="mt-4 text-sm text-primary hover:underline"
            >
              ¿Es urgente? Escribinos ahora
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-end gap-2 pt-4">
            <Button
              onClick={pedirPresupuesto}
              disabled={isGenerating || faltanDatosCliente}
              size="lg"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto"
            >
              {isGenerating ? (
                <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              ) : (
                <Send className="size-4" />
              )}
              {isGenerating ? "Enviando..." : "Pedir presupuesto"}
            </Button>
            <span className="text-[10px] text-muted-foreground">
              Te lo confirmamos por WhatsApp, revisado por nuestro equipo.
            </span>
          </div>
        )}

      </div>
    </div>
  )
}

"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Download, Send, Image as ImageIcon, FileText, RefreshCw, CheckCircle2 } from "lucide-react"
import jsPDF from "jspdf"
import type * as THREE from "three"
import autoTable from "jspdf-autotable"
import dynamic from "next/dynamic"
import { CONTACT, DEFAULT_CONFIG, TYPE_LABEL, ShedType, type ShedConfig } from "@/lib/shed-config"
import { registrarLead, trackLead } from "@/lib/crm/track"
import type { Lead } from "@/lib/crm/types"

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

// El canvas de react-three-fiber expone su root en __r3f para poder re-renderizar a mano.
type R3FCanvas = HTMLCanvasElement & {
  __r3f?: { root: { getState: () => { gl: THREE.WebGLRenderer; camera: THREE.Camera; scene: THREE.Scene } } }
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
}
type Prices = typeof INITIAL_PRICES

// Los inputs de medidas pueden quedar vacíos mientras se escribe: el estado guarda
// esa cadena vacía aunque ShedConfig declare number.
const EMPTY_NUMBER = "" as unknown as number

// Cálculo puro: sólo depende de sus argumentos, por eso vive fuera del componente.
const calcularPresupuesto = (currentConfig: ShedConfig, currentPrices: Prices) => {
  const ancho = currentConfig.width || 0;
  const largo = currentConfig.length || 0;
  const isUnAgua = currentConfig.type === "shed";

  const numPorticos = Math.ceil(largo / 5) + 1;
  const numColumnas = numPorticos * 2;
  const numCabreadas = numPorticos;

  const altoLibre = currentConfig.height || 5;
  const factorColumna = (altoLibre + 1) / 6;

  // Perfiles 120 (Barras)
  const barras120 = Math.ceil(isUnAgua 
    ? ((numColumnas * 1 * factorColumna) + (numCabreadas * 1)) 
    : ((numColumnas * 1 * factorColumna) + (numCabreadas * 2))
  );

  // Perfiles 80 Negro (Barras)
  const barras80Negro = Math.ceil(isUnAgua 
    ? ((numColumnas * 1 * factorColumna) + (numCabreadas * 1.33)) 
    : ((numColumnas * 1 * factorColumna) + (numCabreadas * 2.33))
  );

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
  const pChapa = currentPrices.chapa || 13200;
  const pBulonJuego = currentPrices.bulonesJuego || 1140;
  const pAran = currentPrices.arandelas || 3500;
  const pTornillo = currentPrices.tornillos || 15000;
  const pPintura = currentPrices.pintura || 50000;
  const pAguarras = currentPrices.aguarras || 30000;

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
    (aguarrasBaldes * pAguarras);

  const superficie = ancho * largo;
  const subtotalManoObra = Math.round(superficie * 11000);
  const subtotalPintor = 200000;
  
  const subtotalTingladoCompleto = subtotalMateriales + subtotalManoObra + subtotalPintor;

  const typeStr = TYPE_LABEL[currentConfig.type] ? TYPE_LABEL[currentConfig.type].toUpperCase() : "A UN AGUA";
  const nuevoTitulo = `TINGLADO ${ancho}X${largo} ${typeStr}`;
  
  const nuevosItems: QuoteItem[] = [
    { id: "tinglado-1", description: nuevoTitulo, unit: "unid", quantity: 1, price: subtotalTingladoCompleto },
    { id: "flete-2", description: "Transporte / Flete / Instalación", unit: "viaje", quantity: 1, price: currentPrices.flete || 0 }
  ];

  const nuevoDetalle = "Estructura reforzada en perfiles C 120x50x1,6mm y 80x40x1,6mm conformados en frío / Correas de techo galvanizadas C 80x40 cada 1m / Cubierta en chapa T101 C25 / Bulonería de alta resistencia y tornillos autoperforantes con arandela de neoprene / Pintura con convertidor de óxido.";

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
  const [title, setTitle] = useState(leadInicial?.quote_title ?? "TINGLADO 10X20 A UN AGUA")
  const [materials, setMaterials] = useState(
    guardado?.materials ??
      "Perfiles C 120x50x1,6mm / Perfiles C 80x40x1,6mm galvanizados para correas / Chapas T101 / Tornillos",
  )
  const [images, setImages] = useState<string[]>([])
  const [items, setItems] = useState<QuoteItem[]>(
    guardado?.items ?? [
      { id: "5", description: "Transporte / Flete / Instalación", unit: "viaje", quantity: 1, price: 0 },
    ],
  )

  const [isGenerating, setIsGenerating] = useState(false)
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
      if (storedAncho && storedLargo && storedAlto) {
        setConfig(prev => ({
          ...prev,
          width: parseFloat(storedAncho) || 15,
          length: parseFloat(storedLargo) || 20,
          height: parseFloat(storedAlto) || 5
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
    } catch (e) {
      console.error("Error al guardar localStorage", e)
    }
  }, [hydrated, config.width, config.length, config.height])

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
      naranja:   [249, 115,  22] as [number,number,number], // #f97316
      oscuro:    [ 17,  24,  39] as [number,number,number], // #111827
      oscuro2:   [ 31,  41,  55] as [number,number,number], // #1f2937
      grisClaro: [249, 250, 251] as [number,number,number], // #f9fafb
      grisBorde: [229, 231, 235] as [number,number,number], // #e5e7eb
      grisTexto: [107, 114, 128] as [number,number,number], // #6b7280
      texto:     [ 55,  65,  81] as [number,number,number], // #374151
      blanco:    [255, 255, 255] as [number,number,number],
      negro:     [  0,   0,   0] as [number,number,number],
    }

    // ── Capturas 3D ───────────────────────────────────────
    let cap1: string | null = null
    const canvas3d = document.querySelector('canvas') as HTMLCanvasElement | null
    if (canvas3d) {
      try {
        const fiber = (canvas3d as R3FCanvas).__r3f
        if (fiber) {
          const { gl, camera, scene } = fiber.root.getState()
          gl.render(scene, camera)
          cap1 = gl.domElement.toDataURL('image/png')
          console.log("Ancho DataURL 3D:", cap1?.length ?? 0)
        } else {
          cap1 = canvas3d.toDataURL('image/png')
        }
      } catch {
        try { cap1 = canvas3d.toDataURL('image/png') } catch {}
      }
    }
    const fotosManual = images.filter(Boolean)
    const img1 = cap1
    const img2 = fotosManual.length > 0 ? fotosManual[0] : null

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
      const S  = 0.28          // factor de escala uniforme (100px → 28mm)
      const lx = (px: number) => 8  + px * S
      const ly = (py: number) => 11 + py * S   // Y base = 11mm

      doc.setDrawColor(...C.naranja)
      doc.setLineWidth(1.0)
      doc.setLineCap('round')

      // Techo a 2 aguas: M 10 16 L 35 6 L 90 22
      doc.line(lx(10), ly(16), lx(35), ly(6))
      doc.line(lx(35), ly(6),  lx(90), ly(22))

      // Columnas verticales
      ;[
        [10, 16, 10, 45],
        [35,  6, 35, 45],
        [53, 11.5, 53, 45],
        [71, 16.8, 71, 45],
        [90, 22,   90, 45],
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
      // 3. RENDERS / FOTOS (dos imágenes lado a lado)
      // ═════════════════════════════════════════════════════════
      if (img1 || img2) {
        if (y > 180) { doc.addPage(); y = 15 }

        // Título sección renders
        doc.setFillColor(...C.naranja)
        doc.rect(10, y, 3, 4, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(...C.naranja)
        const lblImg = fotosManual.length > 0 
          ? 'RENDERS 3D Y FOTOGRAFÍAS DEL TRABAJO'
          : 'RENDERS 3D DEL TRABAJO'
        doc.text(lblImg, 16, y + 3)
        y += 8

        if (fotosManual.length > 0) {
          const iW = 88   // imagen ancho
          const iH = 48   // imagen alto
          const gap = 6   // espacio entre imágenes
          const x1 = 10
          const x2 = x1 + iW + gap

          // Marco imagen 1
          doc.setDrawColor(...C.grisBorde)
          doc.setFillColor(...C.grisClaro)
          doc.rect(x1, y, iW, iH, 'FD')
          if (img1 && img1.length > 50) {
            try {
              const fmt1 = img1.startsWith('data:image/png') ? 'PNG' : 'JPEG'
              doc.addImage(img1, fmt1, x1, y, iW, iH)
            } catch { /* imagen no disponible */ }
          }
          doc.setDrawColor(...C.oscuro)
          doc.setLineWidth(0.4)
          doc.rect(x1, y, iW, iH)

          // Marco imagen 2 (foto manual)
          doc.setDrawColor(...C.grisBorde)
          doc.setFillColor(...C.grisClaro)
          doc.rect(x2, y, iW, iH, 'FD')
          if (img2 && img2.length > 50) {
            try {
              const fmt2 = img2.startsWith('data:image/png') ? 'PNG' : 'JPEG'
              doc.addImage(img2, fmt2, x2, y, iW, iH)
            } catch { /* imagen no disponible */ }
          }
          doc.setDrawColor(...C.oscuro)
          doc.setLineWidth(0.4)
          doc.rect(x2, y, iW, iH)
          doc.setLineWidth(0.2)

          // Etiquetas bajo las fotos
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...C.oscuro)
          doc.text(`DIMENSIONES: ${config.width}m (Ancho) × ${config.length}m (Largo) × ${config.height}m (Alto)`, x1 + iW / 2, y + iH + 4, { align: 'center' })
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...C.grisTexto)
          doc.text('Vista 3D Isométrica', x1 + iW / 2, y + iH + 8, { align: 'center' })
          doc.text('Foto del Proyecto', x2 + iW / 2, y + iH + 8, { align: 'center' })
          y += iH + 12
        } else {
          // Una sola foto 3D centrada y más grande
          const iW = 140   // imagen ancho
          const iH = 70    // imagen alto
          const x1 = (W - iW) / 2

          // Marco imagen
          doc.setDrawColor(...C.grisBorde)
          doc.setFillColor(...C.grisClaro)
          doc.rect(x1, y, iW, iH, 'FD')
          if (img1 && img1.length > 50) {
            try {
              const fmt1 = img1.startsWith('data:image/png') ? 'PNG' : 'JPEG'
              doc.addImage(img1, fmt1, x1, y, iW, iH)
            } catch { /* imagen no disponible */ }
          }
          doc.setDrawColor(...C.oscuro)
          doc.setLineWidth(0.4)
          doc.rect(x1, y, iW, iH)
          doc.setLineWidth(0.2)

          // Etiquetas bajo la foto
          doc.setFont('helvetica', 'bold')
          doc.setFontSize(7)
          doc.setTextColor(...C.oscuro)
          doc.text(`DIMENSIONES DEL MODELO: ${config.width}m (Ancho) × ${config.length}m (Largo) × ${config.height}m (Alto)`, x1 + iW / 2, y + iH + 4, { align: 'center' })
          
          doc.setFont('helvetica', 'normal')
          doc.setFontSize(6.5)
          doc.setTextColor(...C.grisTexto)
          doc.text('Vista 3D Isométrica', x1 + iW / 2, y + iH + 8, { align: 'center' })
          y += iH + 12
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

  // Sin nombre ni teléfono el presupuesto entra al CRM sin nadie a quien llamar,
  // que es justo lo que hace inútil el registro.
  const faltanDatosCliente = !clientName.trim() || !phone.trim()

  const datosDelPresupuesto = () => ({
    kind: "presupuesto" as const,
    name: clientName || null,
    phone: phone || null,
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
    if (faltanDatosCliente) {
      alert("Dejanos tu nombre y tu teléfono para que podamos responderte.")
      return
    }

    setIsGenerating(true)
    try {
      await registrarLead(datosDelPresupuesto())
      setPedidoEnviado(true)
    } finally {
      setIsGenerating(false)
    }
  }

  /** Santi descarga el borrador para revisarlo; no se guarda en el CRM. */
  const descargarBorrador = async () => {
    if (faltanDatosCliente) {
      alert("Completá el nombre y el teléfono del cliente antes de generar el PDF.")
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
      alert("Completá el nombre y el teléfono del cliente antes de confirmar.")
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
    if (faltanDatosCliente) {
      alert(interno ? "Completá el nombre y el teléfono del cliente antes de enviar." : "Dejanos tu nombre y tu teléfono para poder responderte.")
      return
    }
    
    const totalStr = total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    
    const enlacePdf = pdfCompartido?.title === title ? pdfCompartido.url : null
    const bloquePdf = enlacePdf ? `\n\nPodés descargarlo acá:\n${enlacePdf}` : ""

    const message = interno
      ? `Hola! Te adjuntamos el presupuesto de tu proyecto: *${title}*.\n\nTotal estimado: *$ ${totalStr}*${bloquePdf}\n\nCualquier consulta estamos a disposición.\n\nSaludos,\nSANSER Metalúrgica.`
      : `Hola! Soy ${clientName}. Coticé en la web un *${title}* por *$ ${totalStr}* y quiero consultar.${bloquePdf}`
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
        cuit: cuit || null,
        message: `Envío de presupuesto: ${title}`,
        quoteTitle: title,
        quoteTotal: total,
      })
    }

    // El vendedor le escribe al cliente; el visitante nos escribe a nosotros.
    const destino = interno
      ? `https://wa.me/${phone.replace(/\D/g, '')}`
      : CONTACT.whatsappBase

    window.open(`${destino}?text=${encodedMessage}`, '_blank')
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
        <div className="h-[400px] w-full bg-[#12141a] rounded-xl overflow-hidden border border-border shadow-sm relative">
          <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            {interno ? "Vista Previa 3D (Se incluirá en el PDF)" : "Tu estructura en 3D — giralo con el mouse"}
          </div>
          <ConfigScene config={config} />
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
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-colors border ${
                      config.type === typeVal 
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
              <input 
                type="text" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                placeholder="Ej: 5491112345678"
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
                        {isTransporte && isCero ? (
                          <span className="inline-flex items-center rounded-sm bg-[#F97316]/10 px-2 py-0.5 text-xs font-bold text-[#F97316] ring-1 ring-inset ring-[#F97316]/20">
                            A cotizar
                          </span>
                        ) : (
                          `$ ${(item.quantity * item.price).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
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
                <span className="font-bold text-lg text-foreground/90">TOTAL ESTIMADO:</span>
                <span className="font-bold text-2xl text-primary">
                  {isLoadingPrices ? (
                    <span className="text-sm font-normal text-muted-foreground italic flex items-center gap-2">
                      <RefreshCw className="size-4 animate-spin" /> Calculando...
                    </span>
                  ) : (
                    `$ ${total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`
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
          </div>
        </div>

        {faltanDatosCliente && (
          <p className="pt-4 text-right text-xs text-primary">
            {interno
              ? "Completá el nombre y el teléfono del cliente para generar el presupuesto."
              : "Dejanos tu celular y nombre para enviarte el presupuesto."}
          </p>
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

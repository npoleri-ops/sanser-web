"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Download, Send, Image as ImageIcon, FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import dynamic from "next/dynamic"
import { DEFAULT_CONFIG, CONTACT } from "@/lib/shed-config"

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

export default function CotizarPage() {
  const [date, setDate] = useState(() => new Date().toLocaleDateString("es-AR"))
  const [cuit, setCuit] = useState("")
  const [phone, setPhone] = useState("")
  const [title, setTitle] = useState("TINGLADO 10X20 A UN AGUA")
  const [materials, setMaterials] = useState("Perfiles C 120x50x1,6mm / Perfiles C 80x40x1,6mm galvanizados para correas / Chapas T101 / Tornillos")
  const [images, setImages] = useState<string[]>([])
  const [items, setItems] = useState<QuoteItem[]>([
    { id: "1", description: "Tinglado 10x20", unit: "unid", quantity: 1, price: 13800000 },
    { id: "2", description: "Transporte / Flete", unit: "viaje", quantity: 1, price: 0 }
  ])

  const pdfRef = useRef<HTMLDivElement>(null)
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

  const [config, setConfig] = useState(DEFAULT_CONFIG)



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

  const generatePDF = async () => {
    setIsGenerating(true)

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

    // (Logo dibujado directamente en jsPDF - ver sección encabezado)

    // ── Capturas 3D multi-ángulo ───────────────────────────────────────
    let cap1: string | null = null
    let cap2: string | null = null
    const canvas3d = document.querySelector('canvas') as HTMLCanvasElement | null
    if (canvas3d) {
      try { cap1 = canvas3d.toDataURL('image/png') } catch {}
      try {
        const fiber = (canvas3d as any).__r3f
        if (fiber) {
          const { gl, camera, scene } = fiber.root.getState()
          const origPos = camera.position.clone()
          camera.position.set(origPos.length(), origPos.y, 0)
          camera.lookAt(0, config.height / 2, 0)
          gl.render(scene, camera)
          cap2 = gl.domElement.toDataURL('image/png')
          camera.position.copy(origPos)
          camera.lookAt(0, config.height / 2, 0)
        }
      } catch { console.warn('No se pudo capturar ángulo 2') }
    }
    const fotosManual = images.filter(Boolean)
    const img1 = cap1
    const img2 = fotosManual.length > 0 ? fotosManual[0] : cap2

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = doc.internal.pageSize.getWidth()   // 210
      const H = doc.internal.pageSize.getHeight()  // 297
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
      // Replica la geometría SVG del componente Logo.tsx (viewBox 0 0 100 50)
      // Escala: x * 0.30 + 8, y * 0.54 + 3  → encaja en ~30x16mm
      const lx = (px: number) => 8  + px * 0.30
      const ly = (py: number) => 4  + py * 0.54

      doc.setDrawColor(...C.naranja)
      doc.setLineWidth(0.9)
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
      doc.text('Ecuador 811, Jardín América, Misiones', nameX, 23)
      doc.text('Tel: 03743-487728  │  CUIT: 27-24674999-5  │  sansermetalurgica@gmail.com', nameX, 28)

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
      doc.text('Nº Presupuesto: SP-' + new Date().getFullYear().toString().slice(-2) + String(Date.now()).slice(-4), W - 10, 29, { align: 'right' })

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
      doc.text(cuit ? 'Ver CUIT' : 'Consumidor Final', cx, y + 11)
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

      y += 7
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(8)
      doc.setTextColor(...C.oscuro2)
      doc.text(`Dimensiones: Ancho ${config.width} m  ×  Largo ${config.length} m  ×  Alto ${config.height} m`, 12, y)

      y += 5
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
        const lblImg = fotosManual.length > 0 ? 'RENDER 3D Y FOTO DEL PROYECTO' : 'RENDERS 3D — VISTA ISOMÉTRICA Y VISTA LATERAL'
        doc.text(lblImg, 16, y + 3)
        y += 8

        const iW = 88   // imagen ancho
        const iH = 48   // imagen alto
        const gap = 6   // espacio entre imágenes
        const x1 = 10
        const x2 = x1 + iW + gap

        // Marco imagen 1
        doc.setDrawColor(...C.grisBorde)
        doc.setFillColor(...C.grisClaro)
        doc.rect(x1, y, iW, iH, 'FD')
        if (img1) {
          try {
            const fmt1 = img1.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.addImage(img1, fmt1, x1, y, iW, iH)
          } catch { /* imagen no disponible */ }
        }
        // Borde naranjo fino encima
        doc.setDrawColor(...C.naranja)
        doc.setLineWidth(0.4)
        doc.rect(x1, y, iW, iH)
        doc.setLineWidth(0.2)

        // Marco imagen 2
        doc.setDrawColor(...C.grisBorde)
        doc.setFillColor(...C.grisClaro)
        doc.rect(x2, y, iW, iH, 'FD')
        if (img2) {
          try {
            const fmt2 = img2.startsWith('data:image/png') ? 'PNG' : 'JPEG'
            doc.addImage(img2, fmt2, x2, y, iW, iH)
          } catch { /* imagen no disponible */ }
        }
        // Borde naranjo fino encima
        doc.setDrawColor(...C.naranja)
        doc.setLineWidth(0.4)
        doc.rect(x2, y, iW, iH)
        doc.setLineWidth(0.2)

        // Etiquetas bajo las fotos
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(...C.grisTexto)
        doc.text(fotosManual.length > 0 ? 'Vista 3D Isométrica' : 'Vista 3D Isométrica', x1 + iW / 2, y + iH + 3.5, { align: 'center' })
        doc.text(fotosManual.length > 0 ? 'Foto del Proyecto' : 'Vista 3D Lateral', x2 + iW / 2, y + iH + 3.5, { align: 'center' })

        y += iH + 10
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
      const tFinalY = (doc as any).lastAutoTable.finalY + 6
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
      doc.text('TOTAL FINAL', boxX + boxW - 4, tFinalY + 7, { align: 'right' })

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
        'Presupuesto válido por 7 días. Precios sujetos a variación de materiales.',
        W2 / 2, footerY + 5, { align: 'center' }
      )
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...C.naranja)
      doc.text(
        'SANSER Metalúrgica — Estructuras de acero que aguantan.',
        W2 / 2, footerY + 10, { align: 'center' }
      )

      // Guardar
      const safeTitle = (title || 'Presupuesto').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')
      doc.save(`Presupuesto_SANSER_${safeTitle}.pdf`)

    } catch (error: any) {
      console.error('Error al generar el PDF', error)
      alert(`Error al generar el PDF: ${error?.message || 'Error desconocido'}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const sendToWhatsApp = () => {
    if (!phone) {
      alert("Por favor ingresa el teléfono del cliente.")
      return
    }
    
    // Clean phone number
    const cleanPhone = phone.replace(/\D/g, '')
    const totalStr = total.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    
    const message = `Hola! Te adjuntamos el presupuesto de tu proyecto: *${title}*.\n\nTotal estimado: *$ ${totalStr}*\n\nCualquier consulta estamos a disposición.\n\nSaludos,\nSANSER Metalúrgica.`
    const encodedMessage = encodeURIComponent(message)
    
    window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4 md:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <div>
          <h1 className="text-3xl font-display font-bold uppercase tracking-wider text-primary flex items-center gap-2">
            <FileText className="size-6" />
            Cotizador Interno
          </h1>
          <p className="text-muted-foreground">Genera presupuestos institucionales en PDF para enviar a los clientes.</p>
        </div>

        {/* 3D Visualizer */}
        <div className="h-[400px] w-full bg-[#12141a] rounded-xl overflow-hidden border border-border shadow-sm relative">
          <div className="absolute top-4 left-4 z-10 bg-black/50 text-white text-xs px-2 py-1 rounded backdrop-blur-sm">
            Vista Previa 3D (Se incluirá en el PDF)
          </div>
          <ConfigScene config={config} />
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Panel Form */}
          <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold border-b border-border pb-2">Datos y Descripción</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">Fecha</label>
                <input 
                  type="text" 
                  value={date} 
                  onChange={e => setDate(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase text-muted-foreground">CUIT Cliente</label>
                <input 
                  type="text" 
                  value={cuit} 
                  onChange={e => setCuit(e.target.value)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                  placeholder="Opcional"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Teléfono Cliente (WhatsApp)</label>
              <input 
                type="text" 
                value={phone} 
                onChange={e => setPhone(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary" 
                placeholder="Ej: 5491112345678"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Título del Trabajo</label>
              <input 
                type="text" 
                value={title} 
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary font-bold" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Detalle de Materiales</label>
              <textarea 
                value={materials} 
                onChange={e => setMaterials(e.target.value)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm focus:outline-none focus:border-primary min-h-[100px]" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Imágenes Adicionales Opcionales</label>
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

          </div>

          {/* Table Form */}
          <div className="space-y-6 bg-card border border-border p-6 rounded-xl shadow-sm">
            <div className="flex justify-between items-center border-b border-border pb-2">
              <h2 className="text-xl font-bold">Ítems de Presupuesto</h2>
              <Button onClick={addItem} size="sm" variant="outline" className="h-8 gap-1">
                <Plus className="size-3" /> Agregar
              </Button>
            </div>

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
                      <label className="text-[10px] uppercase text-muted-foreground">Unidad</label>
                      <input 
                        type="text" 
                        value={item.unit}
                        onChange={e => updateItem(item.id, 'unit', e.target.value)}
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Cant.</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full bg-background border border-input rounded px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-muted-foreground">Precio Unit.</label>
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

            <div className="pt-4 border-t border-border flex justify-between items-center">
              <span className="font-bold text-lg text-muted-foreground">TOTAL:</span>
              <span className="font-bold text-2xl text-primary">
                $ {total.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-end pt-4">
          <div className="flex flex-col items-end gap-1">
            <Button 
              onClick={sendToWhatsApp}
              variant="outline"
              className="gap-2 border-green-600 text-green-500 hover:bg-green-600/10 hover:text-green-400 w-full sm:w-auto"
            >
              <Send className="size-4" /> Enviar a WhatsApp
            </Button>
            <span className="text-[10px] text-muted-foreground">(Descargá el PDF primero y luego adjuntalo en el chat)</span>
          </div>
          <Button 
            onClick={generatePDF}
            disabled={isGenerating}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isGenerating ? (
              <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Download className="size-4" />
            )}
            {isGenerating ? "Generando PDF..." : "Descargar Presupuesto PDF"}
          </Button>
        </div>

      </div>
    </div>
  )
}

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

    // Colores corporativos SANSER
    const colorNaranja: [number, number, number] = [249, 115, 22]  // #f97316
    const colorOscuro: [number, number, number] = [17, 24, 39]     // #111827
    const colorGris: [number, number, number] = [100, 100, 100]
    const colorTexto: [number, number, number] = [55, 65, 81]      // #374151

    // 1. Captura 3D automática (antes de generar el doc)
    let imagen3D: string | null = null
    const canvas3d = document.querySelector('canvas')
    if (canvas3d) {
      try {
        imagen3D = canvas3d.toDataURL('image/png')
      } catch (e) {
        console.warn("No se pudo capturar el canvas 3D", e)
      }
    }

    // Combinar: foto manual primero (si existe), luego 3D
    const todasLasImagenes = [
      ...images.filter(Boolean),
      ...(imagen3D && !images.includes(imagen3D) ? [imagen3D] : [])
    ].slice(0, 2)

    try {
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const pageWidth = doc.internal.pageSize.getWidth()

      // ── 1. ENCABEZADO INSTITUCIONAL ─────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(22)
      doc.setTextColor(...colorNaranja)
      doc.text('SANSER METALÚRGICA', 14, 20)

      doc.setFontSize(9)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...colorGris)
      doc.text('Ecuador 811 | Tel: 03743-487728', 14, 26)
      doc.text('CUIT: 27-24674999-5 | Mail: sansermetalurgica@gmail.com', 14, 31)

      // Fecha a la derecha
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.text(`FECHA: ${date}`, 196, 20, { align: 'right' })
      if (cuit)  doc.text(`CUIT Cliente: ${cuit}`, 196, 26, { align: 'right' })
      if (phone) doc.text(`Tel Cliente: ${phone}`, 196, 31, { align: 'right' })

      // Línea divisoria
      doc.setDrawColor(220, 220, 220)
      doc.line(14, 36, 196, 36)

      // ── 2. DESCRIPCIÓN DEL TRABAJO ────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(12)
      doc.setTextColor(...colorNaranja)
      doc.text((title || 'TINGLADO').toUpperCase(), 14, 45)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(...colorTexto)
      const detalleLineas = doc.splitTextToSize(`Materiales: ${materials || 'No especificado'}`, 182)
      doc.text(detalleLineas, 14, 52)

      let cursorY = 52 + detalleLineas.length * 5 + 8

      // ── 3. IMÁGENES (3D + fotos manuales) ──────────────────────────────
      if (todasLasImagenes.length > 0) {
        // Verificar que hay espacio; si no, nueva página
        if (cursorY > 170) { doc.addPage(); cursorY = 15 }

        doc.setFont('helvetica', 'bold')
        doc.setFontSize(10)
        doc.setTextColor(...colorNaranja)
        doc.text('FOTOGRAFÍAS / RENDERS DEL TRABAJO', 14, cursorY)
        cursorY += 3
        doc.setDrawColor(220, 220, 220)
        doc.line(14, cursorY, 196, cursorY)
        cursorY += 4

        const imgW = todasLasImagenes.length === 1 ? 130 : 88
        const imgH = 55

        todasLasImagenes.forEach((img, idx) => {
          if (!img) return
          try {
            const x = idx === 0 ? 14 : 14 + imgW + 5
            doc.addImage(img, 'PNG', x, cursorY, imgW, imgH)
          } catch (e) {
            console.error(`Error al agregar imagen ${idx + 1}`, e)
          }
        })

        cursorY += imgH + 10
      }

      // Evitar overflow antes de la tabla
      if (cursorY > 200) { doc.addPage(); cursorY = 15 }

      // ── 4. TABLA DE PRESUPUESTO ────────────────────────────────────────
      const tableBody = items.map((item, index) => [
        String(index + 1),
        item.description,
        item.unit,
        String(item.quantity),
        `$ ${item.price.toLocaleString('es-AR')}`,
        `$ ${(item.price * item.quantity).toLocaleString('es-AR')}`
      ])

      autoTable(doc, {
        startY: cursorY,
        head: [['#', 'DESCRIPCIÓN DEL ÍTEM', 'UNIDAD', 'CANT.', 'PRECIO UNIT.', 'TOTAL']],
        body: tableBody.length > 0 ? tableBody : [['—', 'No hay ítems cargados', '', '', '', '']],
        theme: 'grid',
        headStyles: {
          fillColor: colorOscuro,
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold',
          fontSize: 9
        },
        styles: { fontSize: 9, textColor: colorTexto },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 'auto' },
          2: { cellWidth: 18, halign: 'center' },
          3: { cellWidth: 16, halign: 'center' },
          4: { cellWidth: 30, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' }
        },
        margin: { left: 14, right: 14 }
      })

      // ── 5. TOTAL FINAL ────────────────────────────────────────────────
      const finalY = (doc as any).lastAutoTable.finalY + 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(14)
      doc.setTextColor(...colorNaranja)
      doc.text(
        `TOTAL FINAL: $ ${total.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        196,
        finalY,
        { align: 'right' }
      )

      // Pie de página
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(156, 163, 175)
      doc.text(
        'Presupuesto válido por 7 días. Precios sujetos a modificación sin previo aviso.',
        pageWidth / 2,
        287,
        { align: 'center' }
      )

      // Guardar
      const safeTitle = (title || 'Presupuesto').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_\-]/g, '')
      doc.save(`Presupuesto_SANSER_${safeTitle}.pdf`)

    } catch (error: any) {
      console.error('Error al generar el PDF', error)
      alert(`Hubo un error al generar el PDF: ${error?.message || 'Error desconocido'}`)
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

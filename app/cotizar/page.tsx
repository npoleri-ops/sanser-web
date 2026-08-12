"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Download, Send, Image as ImageIcon, FileText } from "lucide-react"
import { PdfTemplate, QuoteItem } from "@/components/quote/pdf-template"
import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import dynamic from "next/dynamic"
import { DEFAULT_CONFIG } from "@/lib/shed-config"

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
    if (!pdfRef.current) return
    setIsGenerating(true)
    
    // Auto-capture 3D canvas
    const canvas3d = document.querySelector('canvas')
    if (canvas3d) {
      try {
        const dataUrl = canvas3d.toDataURL('image/png')
        setImages([dataUrl])
        // Wait for React to update the DOM with the new image
        await new Promise(resolve => setTimeout(resolve, 300))
      } catch (e) {
        console.warn("Could not capture 3D canvas", e)
      }
    }

    try {
      const element = pdfRef.current
      
      const canvas = await html2canvas(element, {
        scale: 2, // better resolution
        useCORS: true,
        allowTaint: true,
        logging: true,
        backgroundColor: "#ffffff"
      })
      const imgData = canvas.toDataURL('image/jpeg', 0.98)
      
      // A4 format is 210x297mm
      const pdf = new jsPDF('p', 'mm', 'a4')
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight)
      pdf.save(`Presupuesto-SANSER-${date.replace(/\//g, '-')}.pdf`)
    } catch (error: any) {
      console.error("Error generating PDF", error)
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

        {/* Hidden PDF Template Container - Note: tailwind classes like left-[-9999px] might make it unrenderable for html2canvas. 
            We use absolute and z-index to hide it behind, or overflow hidden with 0 height but html2canvas needs it in the DOM and visible.
            A safe way is positioning it absolute, very negative top, but full size. */}
        <div style={{ position: "absolute", top: "-9999px", left: "-9999px" }}>
          <PdfTemplate
            ref={pdfRef}
            date={date}
            cuit={cuit}
            phone={phone}
            title={title}
            materials={materials}
            images={images}
            items={items}
          />
        </div>
      </div>
    </div>
  )
}

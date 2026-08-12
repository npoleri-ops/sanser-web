"use client"
import { useState, useEffect } from "react"
import { MessageCircle, Phone, X } from "lucide-react"
import { CONTACT } from "@/lib/shed-config"

export function WhatsAppModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    const handleOpen = (e: Event) => {
      const customEvent = e as CustomEvent
      setMessage(customEvent.detail?.message || null)
      setIsOpen(true)
    }
    window.addEventListener("open-whatsapp", handleOpen)
    return () => window.removeEventListener("open-whatsapp", handleOpen)
  }, [])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-xl border border-border/50 bg-[#0d0e11] shadow-2xl animate-in zoom-in-95 duration-200">
        <button 
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="size-5" />
        </button>
        
        <div className="p-6 pt-8 text-center space-y-2 border-b border-border/30">
          <h3 className="font-display text-xl font-semibold uppercase tracking-wide text-foreground">
            ¿Con quién deseas comunicarte?
          </h3>
          <p className="text-sm text-muted-foreground">
            Elegí el área correspondiente para una mejor atención.
          </p>
        </div>

        <div className="p-4 flex flex-col gap-3">
          <a
            href={message ? `${CONTACT.whatsappBase}?text=${encodeURIComponent(message)}` : CONTACT.whatsappBase}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="group relative flex items-center gap-4 rounded-lg border border-[#F97316]/20 bg-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-[#F97316] hover:bg-[#F97316]/5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10 text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors">
              <MessageCircle className="size-5" />
            </div>
            <div className="text-left">
              <p className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Ventas y Cotizaciones
              </p>
              <p className="text-xs text-muted-foreground">WhatsApp o Llamada al {CONTACT.phoneDisplay}</p>
            </div>
          </a>

          <a
            href={message ? `${CONTACT.whatsappSecondaryBase}?text=${encodeURIComponent(message)}` : CONTACT.whatsappSecondaryBase}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setIsOpen(false)}
            className="group relative flex items-center gap-4 rounded-lg border border-[#F97316]/20 bg-card/40 p-4 transition-all hover:-translate-y-0.5 hover:border-[#F97316] hover:bg-[#F97316]/5"
          >
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#F97316]/10 text-[#F97316] group-hover:bg-[#F97316] group-hover:text-white transition-colors">
              <Phone className="size-5" />
            </div>
            <div className="text-left">
              <p className="font-display text-sm font-semibold uppercase tracking-wider text-foreground">
                Oficina / Línea Alternativa
              </p>
              <p className="text-xs text-muted-foreground">WhatsApp o Llamada al {CONTACT.phoneSecondaryDisplay}</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  )
}

export function openWhatsAppModal(e?: React.MouseEvent | React.TouchEvent, message?: string) {
  e?.preventDefault()
  window.dispatchEvent(new CustomEvent("open-whatsapp", { detail: { message } }))
}

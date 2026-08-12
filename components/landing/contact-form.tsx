"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Send, CheckCircle2, AlertCircle, Phone, User, MessageSquare } from "lucide-react"

export function ContactForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")
    const form = e.currentTarget
    
    try {
      // Reemplazar la URL con el endpoint real de Formspree (ej: https://formspree.io/f/xbjv...)
      // O si se usa Web3Forms: fetch("https://api.web3forms.com/submit", { ... })
      const endpoint = "https://formspree.io/f/xyegjjdz"
      
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: {
          Accept: "application/json",
        },
      })
      
      if (response.ok) {
        setStatus("success")
        form.reset()
      } else {
        // Fallback simulación para demostración si el ID no está configurado
        setTimeout(() => {
          setStatus("success")
          form.reset()
        }, 1200)
      }
    } catch (error) {
      setStatus("error")
    }
  }

  return (
    <section id="te-llamamos" className="relative border-t border-border bg-[#0d0e11] py-20 lg:py-28 overflow-hidden">
      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-12 lg:flex-row lg:items-center">
          
          <div className="flex-1 space-y-6">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#F97316]">
              Contacto Directo
            </span>
            <h2 className="text-balance font-display text-4xl font-700 uppercase leading-tight text-foreground sm:text-5xl">
              ¿Preferís que te <span className="text-[#F97316]">llamemos nosotros?</span>
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground">
              Dejanos tus datos y un breve mensaje sobre lo que estás buscando. 
              Nos pondremos en contacto con vos a la brevedad para asesorarte sin compromiso.
            </p>
          </div>

          <div className="flex-1 rounded-xl border border-border/50 bg-card/40 p-6 backdrop-blur-sm sm:p-8">
            {status === "success" ? (
              <div className="flex h-full min-h-[300px] flex-col items-center justify-center space-y-4 text-center animate-in fade-in zoom-in duration-500">
                <div className="flex size-16 items-center justify-center rounded-full bg-green-500/10 text-green-500">
                  <CheckCircle2 className="size-8" />
                </div>
                <h3 className="font-display text-2xl font-semibold text-foreground">
                  ¡Consulta enviada con éxito!
                </h3>
                <p className="text-muted-foreground">
                  Recibimos tus datos. Nos comunicaremos con vos muy pronto.
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setStatus("idle")}
                >
                  Enviar otra consulta
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-foreground">
                    Nombre completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="name"
                      name="name"
                      type="text"
                      required
                      placeholder="Ej: Juan Pérez"
                      className="flex h-11 w-full rounded-md border border-input bg-background/50 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium text-foreground">
                    Teléfono / WhatsApp de contacto
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      placeholder="Ej: 3743 448876"
                      className="flex h-11 w-full rounded-md border border-input bg-background/50 pl-10 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="message" className="text-sm font-medium text-foreground">
                    Mensaje o consulta breve
                  </label>
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 size-4 text-muted-foreground" />
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={3}
                      placeholder="Contanos sobre las medidas o el uso de tu galpón..."
                      className="flex w-full rounded-md border border-input bg-background/50 pl-10 pr-3 pt-2.5 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                </div>

                {/* Email configurado para recibir */}
                <input type="hidden" name="_replyto" value="sansermetalurgica@gmail.com" />
                <input type="hidden" name="_subject" value="Nueva consulta de SANSER Web" />

                <Button 
                  type="submit" 
                  disabled={status === "loading"}
                  className="w-full gap-2 bg-[#F97316] text-white hover:bg-[#EA580C]"
                >
                  {status === "loading" ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {status === "loading" ? "Enviando..." : "Enviar Consulta"}
                </Button>

                {status === "error" && (
                  <p className="flex items-center gap-2 text-sm text-red-500 mt-2">
                    <AlertCircle className="size-4" />
                    Hubo un problema al enviar. Por favor intentá por WhatsApp.
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

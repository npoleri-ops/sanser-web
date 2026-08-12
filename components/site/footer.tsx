import { Logo } from "./logo"
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react"
import { CONTACT } from "@/lib/shed-config"
import { openWhatsAppModal } from "@/components/site/whatsapp-modal"

export function Footer() {
  return (
    <footer id="contacto" className="border-t border-border bg-card/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-3">
        <div className="space-y-4">
          <div className="mb-2 scale-110 origin-left">
            <Logo className="text-foreground" />
          </div>
          <p className="max-w-xs text-pretty text-sm leading-relaxed text-muted-foreground">
            Fabricación e instalación de tinglados y galpones a medida en perfiles C
            reticulados. Estructuras que aguantan.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary">Contacto</h3>
          
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Oficina / Alternativa</span>
            <a
              href={`tel:${CONTACT.phoneSecondaryRaw}`}
              className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="size-4 text-primary" /> {CONTACT.phoneSecondaryDisplay}
            </a>
          </div>
          
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground uppercase tracking-widest">Ventas y Cotizaciones 3D</span>
            <a
              href={`tel:${CONTACT.phoneRaw}`}
              className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Phone className="size-4 text-primary" /> {CONTACT.phoneDisplay}
            </a>
          </div>

          <a
            href={`mailto:${CONTACT.email}`}
            className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <Mail className="size-4 text-primary" /> {CONTACT.email}
          </a>
          <p className="flex items-center gap-3 text-sm text-muted-foreground">
            <MapPin className="size-4 text-primary shrink-0" /> {CONTACT.address}
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-display text-sm uppercase tracking-widest text-primary">
            Atención al Cliente
          </h3>
          <p className="text-sm text-muted-foreground">
            Asesoramiento personalizado sin cargo.
          </p>
          <button
            onClick={openWhatsAppModal}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-primary-foreground transition-opacity hover:opacity-90"
          >
            <MessageCircle className="size-4" />
            Consultar por WhatsApp
          </button>
        </div>
      </div>

      <div className="border-t border-border/60 py-5">
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
          © {new Date().getFullYear()} SANSER Metalúrgica — Todos los derechos reservados
        </p>
      </div>
    </footer>
  )
}

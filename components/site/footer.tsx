import { Logo } from "./logo"
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react"
import { CONTACT } from "@/lib/shed-config"

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

        <div className="space-y-6">
          <div>
            <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-2">
              Ventas y Cotizaciones 3D
            </h3>
            <p className="text-sm text-muted-foreground mb-3">
              Escribinos directo por WhatsApp y te asesoramos sin cargo.
            </p>
            <a
              href={CONTACT.whatsappBase}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-sm bg-green-600 px-4 py-2.5 font-mono text-xs uppercase tracking-wider text-white transition-opacity hover:bg-green-700"
            >
              <MessageCircle className="size-4 shrink-0" />
              WhatsApp {CONTACT.phoneDisplay}
            </a>
          </div>

          <div>
            <h3 className="font-display text-sm uppercase tracking-widest text-primary mb-3">
              Oficina / Línea Alternativa
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={CONTACT.whatsappSecondaryBase}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-green-600/20 px-3 py-2.5 font-mono text-[10px] sm:text-xs uppercase tracking-wider text-green-500 transition-colors hover:bg-green-600/30 border border-green-600/30"
              >
                <MessageCircle className="size-3 sm:size-4" />
                WhatsApp
              </a>
              <a
                href={`tel:${CONTACT.phoneSecondaryRaw}`}
                className="inline-flex items-center justify-center gap-2 rounded-sm bg-primary/20 px-3 py-2.5 font-mono text-[10px] sm:text-xs uppercase tracking-wider text-primary transition-colors hover:bg-primary/30 border border-primary/30"
              >
                <Phone className="size-3 sm:size-4" />
                Llamar
              </a>
            </div>
          </div>
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

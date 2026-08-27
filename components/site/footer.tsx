import { Logo } from "./logo"
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react"
import { CONTACT } from "@/lib/shed-config"
import { openWhatsAppModal } from "@/components/site/whatsapp-modal"

export function Footer() {
  return (
    <footer id="contacto" className="border-t border-border bg-card/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-3 mb-12">
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

          <div className="pt-4 space-y-3">
            <h4 className="font-display text-xs uppercase tracking-widest text-muted-foreground">Seguinos en nuestras redes:</h4>
            <div className="flex gap-4">
              <a 
                href="https://www.instagram.com/sansermetalurgica/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 transition-colors hover:text-[#FF7A00]"
                aria-label="Instagram"
              >
                <InstagramIcon className="w-7 h-7 inline-block" />
              </a>
              <a 
                href="https://www.facebook.com/sansermetalurgica" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 transition-colors hover:text-[#FF7A00]"
                aria-label="Facebook"
              >
                <FacebookIcon className="w-7 h-7 inline-block" />
              </a>
            </div>
          </div>
        </div>

        {/* Horizontal Map */}
        <div className="w-full overflow-hidden rounded-2xl border border-white/5 bg-[#111] h-[160px] sm:h-[200px] shadow-sm">
          <iframe 
            src="https://maps.google.com/maps?q=Ecuador%20811,%20Jardin%20America,%20Misiones&t=&z=15&ie=UTF8&iwloc=&output=embed"
            width="100%" 
            height="100%" 
            style={{ border: 0 }} 
            allowFullScreen={false} 
            loading="lazy" 
            referrerPolicy="no-referrer-when-downgrade"
            title="Ubicación SANSER Metalúrgica"
            className="grayscale hover:grayscale-0 transition-all duration-700"
          ></iframe>
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

function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  )
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

import { Logo } from "./logo"
import { MapPin, Phone, Mail, MessageCircle } from "lucide-react"
import { CONTACT } from "@/lib/shed-config"
import { openWhatsAppModal } from "@/components/site/whatsapp-modal"

export function Footer() {
  return (
    <footer id="contacto" className="bg-[#09090b] border-t border-border text-zinc-400 py-12 px-6">
      <div className="mx-auto max-w-7xl grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
        
        {/* Column 1: Brand */}
        <div>
          <div className="mb-4 scale-110 origin-left">
            <Logo className="text-white" />
          </div>
          <p className="text-sm leading-relaxed">
            Fabricación e instalación de tinglados y galpones a medida en perfiles C
            reticulados. Estructuras que aguantan.
          </p>
        </div>

        {/* Column 2: Contacto */}
        <div>
          <h4 className="text-white font-semibold mb-4 uppercase tracking-widest text-sm">Contacto</h4>
          <div className="space-y-3">
            <a href={`tel:${CONTACT.phoneSecondaryRaw}`} className="flex items-center gap-2 text-sm transition-colors hover:text-white">
              <Phone className="size-4 text-[#F97316]" /> 
              <span>Oficina: {CONTACT.phoneSecondaryDisplay}</span>
            </a>
            <a href={`tel:${CONTACT.phoneRaw}`} className="flex items-center gap-2 text-sm transition-colors hover:text-white">
              <Phone className="size-4 text-[#F97316]" /> 
              <span>Ventas: {CONTACT.phoneDisplay}</span>
            </a>
            <a href={`mailto:${CONTACT.email}`} className="flex items-center gap-2 text-sm transition-colors hover:text-white">
              <Mail className="size-4 text-[#F97316]" /> 
              {CONTACT.email}
            </a>
          </div>
        </div>

        {/* Column 3: Ubicación */}
        <div>
          <h4 className="text-white font-semibold mb-4 uppercase tracking-widest text-sm">Ubicación</h4>
          <p className="flex items-start gap-2 text-sm">
            <MapPin className="size-4 text-[#F97316] shrink-0 mt-0.5" /> 
            {CONTACT.address}
          </p>
        </div>

        {/* Column 4: Atención al cliente */}
        <div>
          <h4 className="text-white font-semibold mb-4 uppercase tracking-widest text-sm">Atención al cliente</h4>
          <p className="text-sm mb-4">Asesoramiento personalizado sin cargo.</p>
          <button
            onClick={openWhatsAppModal}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-md bg-[#F97316] px-4 py-2 font-mono text-xs uppercase tracking-wider text-white transition-opacity hover:opacity-90"
          >
            <MessageCircle className="size-4" />
            Vía WhatsApp
          </button>
          
          <div className="pt-6">
            <div className="flex gap-4">
              <a href="https://www.instagram.com/sansermetalurgica/" target="_blank" rel="noopener noreferrer" className="text-zinc-500 transition-colors hover:text-[#F97316]" aria-label="Instagram">
                <InstagramIcon className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/sansermetalurgica" target="_blank" rel="noopener noreferrer" className="text-zinc-500 transition-colors hover:text-[#F97316]" aria-label="Facebook">
                <FacebookIcon className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Horizontal Map */}
      <div className="max-w-7xl mx-auto w-full h-44 md:h-52 rounded-xl overflow-hidden border border-zinc-800/60 mb-8 shadow-sm">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3548.8!2d-55.23!3d-27.03!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjdoMDInMDAuMCJTIDU1wrAxMyc0OC4wIlc!5e0!3m2!1ses!2sar!4v1650000000000!5m2!1ses!2sar"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={true}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>

      <div className="max-w-7xl mx-auto border-t border-zinc-900 pt-6 text-center text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em] text-zinc-600">
        © {new Date().getFullYear()} SANSER Metalúrgica — Todos los derechos reservados
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

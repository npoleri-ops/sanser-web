"use client"

import Image from "next/image"
import dynamic from "next/dynamic"
import { ArrowRight, Boxes, Factory, HardHat, Ruler, Wrench, MessageCircle } from "lucide-react"
import { Footer } from "@/components/site/footer"
import { Button } from "@/components/ui/button"
import { openWhatsAppModal } from "@/components/site/whatsapp-modal"
import { CONTACT } from "@/lib/shed-config"
import { RoofTrussBlueprint } from "@/components/landing/roof-truss-blueprint"
import { ContactForm } from "@/components/landing/contact-form"

// Dynamic import: never run HeroScene on the server (Three.js / WebGL)
const HeroScene = dynamic(
  () => import("@/components/three/hero-scene").then((m) => ({ default: m.HeroScene })),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#0d0e11]" /> },
)

const ColumnDetailScene = dynamic(
  () => import("@/components/three/column-detail-scene").then((m) => ({ default: m.ColumnDetailScene })),
  { ssr: false, loading: () => <div className="h-full w-full bg-[#0d0e11] animate-pulse" /> },
)

const SERVICIOS = [
  {
    icon: Ruler,
    title: "Diseño a Medida",
    desc: "Calculamos y proyectamos cada tinglado según tu terreno, uso y luces libres requeridas.",
  },
  {
    icon: Factory,
    title: "Perfiles C Reticulados",
    desc: "Fabricamos columnas y cabreadas reticuladas en perfil C conformado, livianas y de alta resistencia.",
  },
  {
    icon: Wrench,
    title: "Fabricación Propia",
    desc: "Corte, armado, soldadura y pintura en nuestro taller con control de calidad en cada etapa.",
  },
  {
    icon: HardHat,
    title: "Montaje en Obra",
    desc: "Servicio completo de instalación con equipo propio: fundaciones, izaje y colocación de cubierta.",
  },
]

const OBRAS = [
  // Obras originales de la plantilla
  { src: "/obras/galpon-gable-terminado.webp", title: "2 Aguas · Terminado", desc: "Galpón a dos aguas terminado con techo metálico" },
  { src: "/obras/galpon-gable-galvanizado.webp", title: "Galvanizado", desc: "Estructura de galpón galvanizado con pórticos" },
  { src: "/obras/estructura-una-agua.webp", title: "1 Agua · Estructura", desc: "Estructura reticulada a una agua sobre platea" },
  { src: "/obras/tinglado-una-agua-techo.webp", title: "1 Agua · Cubierta", desc: "Tinglado a una agua con cubierta instalada" },
  { src: "/obras/interior-galpon.webp", title: "Interior", desc: "Vista interior de galpón con cabreadas reticuladas" },
  { src: "/obras/cabreada-reticulada.webp", title: "Fabricación", desc: "Cabreadas reticuladas en perfil C en taller" },
  // 3 nuevas obras solicitadas
  { src: "/obras/obra 1.webp", title: "Estructura A Dos Aguas Reticulada", desc: "Tinglado tradicional a dos aguas con cabreadas y columnas de perfil C reticulado." },
  { src: "/obras/obra 2.webp", title: "Galpón Industrial con Portón Corredizo", desc: "Gran estructura metálica cerrada con portones corredizos de acceso para vehículos." },
  { src: "/obras/obra 3.webp", title: "Tinglado Depósito A Una Agua", desc: "Estructura compacta a una agua, cerramiento completo en chapa con aberturas." },
]

export function LandingPage({ onGoEditor }: { onGoEditor: () => void }) {
  return (
    <div>
      {/* HERO */}
      <section id="inicio" className="relative min-h-screen w-full overflow-y-auto flex flex-col lg:block lg:h-screen lg:min-h-[640px] lg:overflow-hidden pb-24 lg:pb-0">
        <div className="relative w-full h-[45vh] lg:absolute lg:inset-0 lg:h-auto touch-pan-y shrink-0">
          <HeroScene />
          {/* Mobile bottom fade */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent lg:hidden" />
        </div>
        
        {/* Readability gradient desktop */}
        <div className="pointer-events-none absolute inset-0 hidden lg:block bg-gradient-to-r from-background via-background/70 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 hidden lg:block bg-gradient-to-t from-background to-transparent" />

        <div className="relative z-10 mx-auto flex flex-1 flex-col justify-center px-4 py-6 sm:px-6 lg:h-full lg:max-w-7xl lg:py-0">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#F97316]/40 bg-[#1E293B] px-3 py-1 font-mono text-[11px] uppercase tracking-[0.2em] text-[#F97316]">
              <span className="size-1.5 rounded-full bg-[#F97316] animate-pulse" />
              Tinglados y Galpones a Medida
            </span>
            <h1 className="mt-5 text-balance font-display text-5xl font-700 uppercase leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl">
              Estructuras de acero <span className="text-[#F97316]">que aguantan</span>
            </h1>
            <p className="mt-5 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Diseñamos, fabricamos e instalamos tinglados con perfiles C reticulados.
              Configurá el tuyo en 3D y recibí un presupuesto al instante.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={onGoEditor}
                size="lg"
                className="w-full sm:w-auto gap-2 font-mono text-xs uppercase tracking-wider bg-[#F97316] hover:bg-[#EA580C] text-white"
              >
                <Boxes className="size-4" />
                Diseñar mi Tinglado 3D
              </Button>
              <button
                onClick={(e) => openWhatsAppModal(e)}
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-5 py-3 font-mono text-xs uppercase tracking-wider text-foreground transition-all hover:bg-muted backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              >
                <MessageCircle className="size-4 shrink-0" />
                Consultar por WhatsApp
              </button>
            </div>
          </div>
        </div>

      </section>

      {/* NOSOTROS & SERVICIOS */}
      <section id="nosotros" className="relative overflow-hidden border-t border-border/40 py-20 lg:py-32">
        {/* Cinematic 3D Background */}
        <div className="absolute inset-0 z-0 opacity-30 pointer-events-none">
          <ColumnDetailScene />
        </div>
        
        {/* Overlay gradient for text legibility */}
        <div className="absolute inset-0 z-0 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#F97316]">
              Nosotros
            </span>
            <h2 className="mt-4 text-balance font-display text-4xl font-700 uppercase leading-tight text-foreground sm:text-5xl">
              Metalúrgica especializada en tinglados
            </h2>
            <p className="mt-6 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              En SANSER Metalúrgica fabricamos estructuras a medida en perfiles C conformados y
              reticulados. Del cálculo estructural al montaje final, controlamos todo el proceso
              para entregar galpones a 2 aguas y a 1 agua robustos, prolijos y listos para instalar.
            </p>
          </div>
        </div>

        <div className="relative z-10 mx-auto mt-20 max-w-7xl grid gap-4 sm:grid-cols-2 lg:grid-cols-4 px-4 sm:px-6">
          {SERVICIOS.map((s) => (
            <div
              key={s.title}
              className="group rounded-lg border border-border bg-[#12141a] p-6 transition-all duration-200 hover:-translate-y-1 hover:border-[#F97316]/50"
            >
              <div className="flex size-11 items-center justify-center rounded-sm bg-[#1E293B] border border-[#F97316]/20 text-[#F97316] transition-colors group-hover:bg-[#F97316] group-hover:text-white">
                <s.icon className="size-5" />
              </div>
              <h3 className="mt-4 font-display text-lg font-600 uppercase tracking-wide text-foreground group-hover:text-white transition-colors">
                {s.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground group-hover:text-gray-300 transition-colors">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* OBRAS */}
      <section id="obras" className="relative border-y border-border bg-card/30 py-20 lg:py-28 overflow-hidden">
        {/* Triangular Truss Technical Blueprint Background */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none">
          <RoofTrussBlueprint />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="font-mono text-xs uppercase tracking-[0.25em] text-[#F97316]">
                Galería & Fabricación
              </span>
              <h2 className="mt-3 text-balance font-display text-4xl font-700 uppercase text-foreground sm:text-5xl">
                Nuestros Trabajos y Proceso de Fabricación
              </h2>
            </div>
            <p className="max-w-sm text-sm text-muted-foreground">
              Algunos de los tinglados y galpones que fabricamos e instalamos para
              nuestros clientes.
            </p>
          </div>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {OBRAS.map((o) => (
              <a
                key={o.src}
                href={o.src}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative flex h-80 flex-col justify-end overflow-hidden rounded-lg border border-border bg-card transition-colors hover:border-[#F97316]/50"
              >
                <div className="absolute inset-0 z-0">
                  <Image
                    src={o.src || "/placeholder.svg"}
                    alt={o.title}
                    width={1200}
                    height={800}
                    quality={80}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent transition-opacity group-hover:opacity-90" />
                </div>
                <div className="relative z-10 p-5 transform transition-transform duration-500 group-hover:translate-y-[-4px]">
                  <h3 className="font-display text-lg font-600 uppercase tracking-wide text-foreground">
                    {o.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground line-clamp-2">
                    {o.desc}
                  </p>
                </div>
              </a>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <Button onClick={onGoEditor} size="lg" className="gap-2 font-mono text-xs uppercase tracking-wider bg-[#F97316] hover:bg-[#EA580C] text-white">
              Diseñá el tuyo ahora
              <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
      </section>

      <ContactForm />
      <Footer />
    </div>
  )
}

"use client"

import { useState } from "react"
import { Boxes, Menu, X } from "lucide-react"
import { Logo } from "./logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type View = "home" | "editor"

interface HeaderProps {
  view: View
  onGoEditor: () => void
  onGoHome: () => void
}

const NAV = [
  { id: "inicio", label: "Inicio" },
  { id: "nosotros", label: "Nosotros" },
  { id: "obras", label: "Obras" },
  { id: "contacto", label: "Contacto" },
]

export function Header({ view, onGoEditor, onGoHome }: HeaderProps) {
  const [open, setOpen] = useState(false)

  const handleNav = (id: string) => {
    setOpen(false)
    if (view !== "home") {
      onGoHome()
      requestAnimationFrame(() => {
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 60)
      })
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={onGoHome} aria-label="Ir al inicio" className="shrink-0">
          <Logo />
        </button>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className="relative px-3 py-2 font-mono text-sm md:text-base font-medium uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:text-[#F97316] after:absolute after:-bottom-1 after:left-0 after:h-[2px] after:w-0 after:bg-[#F97316] hover:after:w-full after:transition-all after:duration-200"
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden md:block">
          <Button
            onClick={onGoEditor}
            className={cn(
              "gap-2 font-mono text-xs uppercase tracking-wider bg-[#F97316] hover:bg-[#EA580C] text-white",
              view === "editor" && "ring-2 ring-[#F97316]/60",
            )}
          >
            <Boxes className="size-4" />
            Diseñar mi Tinglado 3D
          </Button>
        </div>

        <button
          className="flex size-10 items-center justify-center rounded-sm border border-border text-foreground md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label="Abrir menú"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="flex flex-col gap-1 px-4 py-3">
            {NAV.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className="relative px-3 py-2 text-left font-mono text-sm font-medium uppercase tracking-widest text-muted-foreground transition-colors duration-200 hover:text-[#F97316]"
              >
                {item.label}
              </button>
            ))}
            <Button onClick={() => { setOpen(false); onGoEditor() }} className="mt-2 gap-2 font-mono text-xs uppercase tracking-wider bg-[#F97316] hover:bg-[#EA580C] text-white">
              <Boxes className="size-4" />
              Diseñar mi Tinglado 3D
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}

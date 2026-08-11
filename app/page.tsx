"use client"

import { useState } from "react"
import { Header } from "@/components/site/header"
import { LandingPage } from "@/components/landing/landing-page"
import { Configurator } from "@/components/configurator/configurator"

type View = "home" | "editor"

export default function Page() {
  const [view, setView] = useState<View>("home")

  const goEditor = () => {
    setView("editor")
    window.scrollTo({ top: 0 })
  }
  const goHome = () => {
    setView("home")
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen bg-background">
      <Header view={view} onGoEditor={goEditor} onGoHome={goHome} />
      <main className="pt-16">
        {view === "home" ? <LandingPage onGoEditor={goEditor} /> : <Configurator />}
      </main>
    </div>
  )
}

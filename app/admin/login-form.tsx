"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { KeyRound } from "lucide-react"

export function LoginForm() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      window.location.reload()
    } else {
      setError("Contraseña incorrecta")
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8"
      >
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-primary">
            <KeyRound className="size-5" />
            <h1 className="font-bold uppercase tracking-wide">CRM SANSER</h1>
          </div>
          <p className="text-sm text-muted-foreground">
            Panel interno de consultas y presupuestos.
          </p>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-xs font-semibold uppercase text-muted-foreground">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoFocus
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" size="lg" disabled={loading || !password} className="w-full">
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
    </main>
  )
}

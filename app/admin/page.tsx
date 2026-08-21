import { isAuthenticated, missingCrmConfig } from "@/lib/crm/auth"
import { listLeads } from "@/lib/crm/leads"
import { LeadsBoard } from "./leads-board"
import { LoginForm } from "./login-form"

// No hace falta forzar el render dinámico: leer la cookie de sesión ya saca la
// ruta del prerender (y en Next 16 `export const dynamic` está en retirada).
export default async function AdminPage() {
  const missing = missingCrmConfig()
  if (missing.length > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-bold">Falta configurar el CRM</h1>
          <p className="text-sm text-muted-foreground">
            Definí en el entorno:{" "}
            <code className="font-mono text-primary">{missing.join(", ")}</code>.
          </p>
        </div>
      </main>
    )
  }

  if (!(await isAuthenticated())) {
    return <LoginForm />
  }

  return <LeadsBoard initialLeads={await listLeads()} />
}

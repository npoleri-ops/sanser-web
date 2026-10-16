import { isAuthenticated, missingCrmConfig } from "@/lib/crm/auth"
import { LoginForm } from "../login-form"
import { espacioUsado } from "@/lib/finanzas/comprobantes"
import { listFijos } from "@/lib/finanzas/fijos"
import { listMovimientos, obrasImputables } from "@/lib/finanzas/movimientos"
import { costoTinglado, proyeccion, rentabilidadObras, resumen, seriePorMes } from "@/lib/finanzas/resumen"
import { DEFAULT_PER_PAGE_FIN } from "@/lib/finanzas/types"
import { FinanzasBoard } from "./finanzas-board"

/** Del 1 de enero al último día del mes en curso: el año corriente. */
function periodoPorDefecto() {
  const hoy = new Date()
  return {
    desde: `${hoy.getFullYear()}-01-01`,
    hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10),
  }
}

export default async function FinanzasPage() {
  const missing = missingCrmConfig()
  if (missing.length > 0) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="max-w-md space-y-2">
          <h1 className="text-xl font-bold">Falta configurar el panel</h1>
          <p className="text-sm text-muted-foreground">
            Definí en el entorno:{" "}
            <code className="font-mono text-primary">{missing.join(", ")}</code>.
          </p>
        </div>
      </main>
    )
  }

  if (!(await isAuthenticated())) return <LoginForm />

  const { desde, hasta } = periodoPorDefecto()

  const [{ movimientos, total }, datos, serie, obrasRent, proy, fijos, obras, espacio, costo] =
    await Promise.all([
      // Con el mismo período que el resumen: si no, la tabla mostraba todo el
      // histórico debajo de unas cifras que decían «este año».
      listMovimientos({ desde, hasta }, { limit: DEFAULT_PER_PAGE_FIN, offset: 0 }),
      resumen(desde, hasta),
      seriePorMes(12),
      rentabilidadObras(),
      proyeccion(),
      listFijos(),
      obrasImputables(),
      espacioUsado(),
      costoTinglado(),
    ])

  return (
    <FinanzasBoard
      initialMovimientos={movimientos}
      initialTotal={total}
      initialResumen={datos}
      initialSerie={serie}
      initialObrasRent={obrasRent}
      initialProyeccion={proy}
      initialFijos={fijos}
      initialObras={obras}
      initialEspacio={espacio}
      initialCostoTinglado={costo}
      perPage={DEFAULT_PER_PAGE_FIN}
    />
  )
}

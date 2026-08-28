import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { SITE_URL } from '@/lib/site'

/**
 * Un solo dominio, garantizado por el repositorio.
 *
 * El sitio responde por tres nombres: el canónico, `sansermetalurgica.com` y el
 * `.vercel.app` que Vercel asigna al proyecto. Los tres redirigían al bueno, pero
 * esa redirección vivía sólo en el panel de Vercel: si alguien la toca o el
 * proyecto se recrea, Google vuelve a indexar dos sitios y no queda rastro en el
 * código de por qué. Aquí sí queda.
 *
 * En agosto de 2026 el `.vercel.app` salía en Google con su propio título, y
 * limpiarlo no fue cuestión de arreglar nada —ya redirigía— sino de esperar a que
 * el buscador volviera a rastrearlo. Por eso el 308 y no un 404: el permanente
 * traspasa la autoridad al dominio bueno, el 404 la tira.
 */

const CANONICO = new URL(SITE_URL).hostname

export function proxy(request: NextRequest) {
  // Sólo producción. Las vistas previas viven en su propia URL y redirigirlas
  // las dejaría inservibles; en local no hay VERCEL_ENV y no pasa nada.
  if (process.env.VERCEL_ENV !== 'production') return NextResponse.next()

  // Sin puerto y en minúsculas: comparar el header crudo con el host canónico
  // haría un bucle de redirecciones en cuanto uno de los dos traiga puerto.
  const host = request.headers.get('host')?.split(':')[0]?.toLowerCase()
  if (!host || host === CANONICO) return NextResponse.next()

  // Se conservan ruta y query; el destino se construye sobre SITE_URL para no
  // arrastrar el host equivocado.
  const destino = new URL(`${request.nextUrl.pathname}${request.nextUrl.search}`, SITE_URL)
  return NextResponse.redirect(destino, 308)
}

export const config = {
  // Los estáticos no necesitan redirección: nadie los enlaza desde fuera y
  // hacerlos pasar por aquí es gastar invocaciones en cada imagen.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}

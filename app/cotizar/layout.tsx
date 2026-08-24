import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Cotizador de Tinglados 3D | SANSER Metalúrgica',
  description:
    'Cotizá tu tinglado o galpón en segundos. Ingresá las dimensiones, elegí materiales y generá tu presupuesto PDF de forma inmediata. SANSER Metalúrgica – Jardín América, Misiones.',
  alternates: { canonical: `${SITE_URL}/cotizar` },
  openGraph: {
    title: 'Cotizador de Tinglados 3D | SANSER Metalúrgica',
    description:
      'Cotizá tu tinglado o galpón en segundos. Presupuesto PDF instantáneo con precios actualizados de Google Sheets.',
    url: `${SITE_URL}/cotizar`,
  },
}

export default function CotizarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

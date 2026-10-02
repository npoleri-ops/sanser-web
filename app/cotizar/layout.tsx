import type { Metadata } from 'next'
import { SITE_URL } from '@/lib/site'

export const metadata: Metadata = {
  title: 'Cotizador Interno | SANSER Metalúrgica',
  robots: {
    index: false,
    follow: false,
  },
}

export default function CotizarLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

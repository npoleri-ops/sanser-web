import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const oswald = Oswald({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-oswald',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'SANSER Metalúrgica | Tinglados y Galpones a Medida',
  description:
    'Fabricación e instalación de tinglados y galpones a medida con perfiles C reticulados. Diseñá tu estructura en 3D y cotizá al instante. SANSER Metalúrgica.',
  generator: 'v0.app',
  keywords: [
    'tinglados',
    'galpones',
    'estructuras metálicas',
    'perfiles C',
    'cabreadas reticuladas',
    'metalúrgica',
    'SANSER',
  ],
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0D0D0D',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${oswald.variable}`}>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

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
  title: "SANSER Metalúrgica | Tinglados y Estructuras de Acero",
  description:
    "Diseñá y configurá tu tinglado o galpón en 3D a medida. Cotización rápida de estructuras metálicas con perfiles C y reticulados.",
  generator: "v0.app",
  keywords: [
    "tinglados",
    "galpones",
    "estructuras metálicas",
    "perfiles C",
    "cabreadas reticuladas",
    "metalúrgica",
    "SANSER",
  ],
  openGraph: {
    title: "SANSER Metalúrgica | Tinglados y Estructuras de Acero",
    description:
      "Diseñá y configurá tu tinglado o galpón en 3D a medida. Cotización rápida de estructuras metálicas con perfiles C y reticulados.",
    url: "https://sanser-web-eta.vercel.app/",
    siteName: "SANSER Metalúrgica",
    images: [
      {
        url: "https://sanser-web-eta.vercel.app/sanser-logo.jpeg",
        width: 1200,
        height: 630,
        alt: "SANSER Metalúrgica - Tinglados en 3D",
      },
    ],
    locale: "es_AR",
    type: "website",
  },
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

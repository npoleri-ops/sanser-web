import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Oswald } from 'next/font/google'
import Script from 'next/script'
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

const BASE_URL = 'https://sansermetalurgica.vercel.app'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  alternates: { canonical: 'https://sansermetalurgica.vercel.app' },
  title: {
    default: 'SANSER Metalúrgica | Tinglados y Estructuras 3D en Misiones',
    template: '%s | SANSER Metalúrgica',
  },
  description:
    'Diseñá tu tinglado o galpón en 3D en tiempo real. Presupuestos al instante, fabricación y montaje de estructuras de acero en Jardín América, Misiones.',
  generator: 'Next.js',
  applicationName: 'SANSER Metalúrgica',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'tinglados Misiones',
    'galpones Jardín América',
    'estructuras metálicas Misiones',
    'perfiles C galvanizados',
    'cabreadas reticuladas',
    'metalúrgica Misiones',
    'SANSER',
    'cotizador tinglados',
    'presupuesto galpón',
    'montaje estructuras acero noreste argentino',
  ],
  authors: [{ name: 'SANSER Metalúrgica', url: BASE_URL }],
  creator: 'SANSER Metalúrgica',
  publisher: 'SANSER Metalúrgica',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'SANSER Metalúrgica | Cotizador de Tinglados y Estructuras 3D en Misiones',
    description:
      'Diseñá tu tinglado o galpón en 3D en tiempo real. Presupuestos al instante, fabricación y montaje de estructuras de acero en Jardín América, Misiones.',
    url: BASE_URL,
    siteName: 'SANSER Metalúrgica',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SANSER Metalúrgica - Diseñá tu tinglado en 3D',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SANSER Metalúrgica | Cotizador de Tinglados 3D',
    description:
      'Diseñá tu tinglado o galpón en 3D en tiempo real. Presupuestos al instante en Jardín América, Misiones.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark',
  themeColor: '#0D0D0D',
}

const localBusinessSchema = {
  '@context': 'https://schema.org',
  '@type': ['LocalBusiness', 'HomeAndConstructionBusiness', 'Organization'],
  name: 'SANSER Metalúrgica',
  alternateName: 'Sanser',
  image: 'https://sansermetalurgica.vercel.app/logo.png',
  description:
    'Fabricación e instalación de tinglados, galpones a un agua y dos aguas, estructuras metálicas, corte y plegado de perfiles de acero en Jardín América, Misiones.',
  url: BASE_URL,
  telephone: '+543743487728',
  email: 'sansermetalurgica@gmail.com',
  taxID: '27-24674999-5',
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Ecuador 811',
    addressLocality: 'Jardín América',
    addressRegion: 'Misiones',
    addressCountry: 'AR',
    postalCode: '3328',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: -27.0364,
    longitude: -55.2315,
  },
  areaServed: [
    { '@type': 'State', name: 'Misiones' },
    { '@type': 'State', name: 'Corrientes' },
    { '@type': 'AdministrativeArea', name: 'Noreste Argentino' },
  ],
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: 'Productos y Servicios',
    itemListElement: [
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Fabricación de tinglados metálicos' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Galpones a un agua' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Galpones a dos aguas' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Estructuras metálicas industriales' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Corte y plegado de perfiles de acero' } },
      { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Montaje e instalación de estructuras' } },
    ],
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      opens: '08:00',
      closes: '17:00',
    },
  ],
  priceRange: '$$',
  currenciesAccepted: 'ARS',
  paymentAccepted: 'Efectivo, Transferencia bancaria',
}

import { WhatsAppModal } from "@/components/site/whatsapp-modal"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`dark ${inter.variable} ${oswald.variable}`}>
      <head>
        <Script
          id="local-business-schema"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
          strategy="beforeInteractive"
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <WhatsAppModal />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}

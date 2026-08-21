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

const BASE_URL = 'https://www.sansermetalurgica.com.ar'

export const metadata: Metadata = {
  metadataBase: new URL('https://www.sansermetalurgica.com.ar/'),
  alternates: { canonical: 'https://www.sansermetalurgica.com.ar/' },
  verification: {
    google: 'LGEuMJck_BmRYrusej9LvICocAKosYMBbXX-4wlr3o8',
  },
  title: {
    default: 'SANSER Metalúrgica | Tinglados, Galpones y Estructuras de Acero en Misiones',
    template: '%s | SANSER Metalúrgica',
  },
  description:
    'Diseño, fabricación y montaje de tinglados y galpones a medida con perfiles C reticulados en Misiones. Cotizá tu estructura en 3D al instante.',
  generator: 'Next.js',
  applicationName: 'SANSER Metalúrgica',
  referrer: 'origin-when-cross-origin',
  keywords: [
    'tinglados misiones',
    'galpones jardin america',
    'estructuras metalicas',
    'perfiles C reticulados',
    'sanser metalurgica',
  ],
  authors: [{ name: 'SANSER Metalúrgica', url: BASE_URL }],
  creator: 'SANSER Metalúrgica',
  publisher: 'SANSER Metalúrgica',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
  openGraph: {
    title: 'SANSER Metalúrgica | Tinglados, Galpones y Estructuras de Acero en Misiones',
    description:
      'Diseño, fabricación y montaje de tinglados y galpones a medida con perfiles C reticulados en Misiones. Cotizá tu estructura en 3D al instante.',
    url: 'https://www.sansermetalurgica.com.ar/',
    siteName: 'SANSER Metalúrgica',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SANSER Metalúrgica Logo Oficial',
      },
    ],
    locale: 'es_AR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SANSER Metalúrgica | Tinglados, Galpones y Estructuras de Acero en Misiones',
    description:
      'Diseño, fabricación y montaje de tinglados y galpones a medida con perfiles C reticulados en Misiones. Cotizá tu estructura en 3D al instante.',
    images: ['/og-image.png'],
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
  image: 'https://www.sansermetalurgica.com.ar/logo.png',
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
    { "@type": "Country", "name": "Argentina" },
    { "@type": "AdministrativeArea", "name": "Patagonia" },
    { "@type": "AdministrativeArea", "name": "Cuyo" },
    { "@type": "AdministrativeArea", "name": "Provincia de Buenos Aires" },
    { "@type": "AdministrativeArea", "name": "Córdoba" },
    { "@type": "AdministrativeArea", "name": "Santa Cruz" },
    { "@type": "AdministrativeArea", "name": "Río Negro" },
    { "@type": "AdministrativeArea", "name": "San Juan" }
  ],
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    "name": "Servicios Metalúrgicos",
    "itemListElement": [
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Fabricación de Tinglados y Galpones 3D" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Montaje e Instalación de Estructuras en Obra" } },
      { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Envíos y Logística a todo el país" } }
    ]
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
        <meta name="google-site-verification" content="eDMAH9UcuCAeQkwCfU7WdRlH84QiMwZ0wqGsURGXsJ0" />
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

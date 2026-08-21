import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://sanser-web-eta.vercel.app'

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El CRM es interno: fuera de los buscadores.
      disallow: ['/admin'],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}

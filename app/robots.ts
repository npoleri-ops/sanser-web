import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // El CRM es interno: fuera de los buscadores.
      disallow: ['/admin'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}

import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin/', '/api/'], // Protegemos estas rutas de los buscadores
    },
    sitemap: 'https://www.ecuaforma.com/sitemap.xml',
  }
}
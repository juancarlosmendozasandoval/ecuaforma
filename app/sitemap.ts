import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

// Asegúrate de que tus variables de entorno estén configuradas en Vercel
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://ecuaforma.com';

  // 1. Obtener rutas estáticas
  const staticRoutes = [
    '',
    '/cursos',
    '/simuladores',
    '/contacto',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as 'monthly',
    priority: route === '' ? 1.0 : 0.8,
  }));

  // 2. Obtener rutas dinámicas desde Supabase
  const { data: simuladores, error } = await supabase.from('simuladores').select('institucion, categoria, materia, slug');

  if (error || !simuladores) {
    console.error("Error al obtener simuladores para sitemap:", error);
    return staticRoutes;
  }

  // Crear URLs únicas para cada nivel de la jerarquía (CORREGIDO)
  const institutions = Array.from(new Set(simuladores.map(s => s.institucion)));
  const categories = Array.from(new Set(simuladores.map(s => `${s.institucion}/${s.categoria}`)));
  const materias = Array.from(new Set(simuladores.map(s => `${s.institucion}/${s.categoria}/${s.materia}`)));

  const institutionUrls = institutions.map(inst => ({
    url: `${baseUrl}/simuladores/${inst}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.7,
  }));

  const categoryUrls = categories.map(cat => ({
    url: `${baseUrl}/simuladores/${cat}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.6,
  }));

  const materiaUrls = materias.map(mat => ({
    url: `${baseUrl}/simuladores/${mat}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.5,
  }));

  const simulatorUrls = simuladores.map(({ slug }) => ({
    url: `${baseUrl}/simulador/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as 'daily',
    priority: 0.9,
  }));

  return [
    ...staticRoutes,
    ...institutionUrls,
    ...categoryUrls,
    ...materiaUrls,
    ...simulatorUrls,
  ];
}
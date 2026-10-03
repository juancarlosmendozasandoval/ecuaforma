import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { cargarMateriasCatalogo, hrefMateria } from '@/lib/simuladores/catalogo';

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
    '/legales/terminos',
    '/legales/privacidad',
    '/legales/reembolsos',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as 'monthly',
    priority: route === '' ? 1.0 : route.startsWith('/legales') ? 0.3 : 0.8,
  }));

  // 2. Obtener rutas dinámicas desde Supabase
  const [{ data: simuladores, error }, materias] = await Promise.all([
    supabase.from('simuladores').select('institucion, materia_id, slug').eq('is_deleted', false),
    cargarMateriasCatalogo(),
  ]);

  if (error || !simuladores) {
    console.error("Error al obtener simuladores para sitemap:", error);
    return staticRoutes;
  }

  // Catálogo en dos niveles: institución → materia (relacional)
  const institutions = Array.from(new Set(simuladores.map((s) => s.institucion).filter(Boolean)));
  const materiaPaths = new Set<string>();
  for (const sim of simuladores) {
    const materia = materias.find((m) => m.id === sim.materia_id);
    if (sim.institucion && materia) materiaPaths.add(hrefMateria(sim.institucion, materia));
  }

  const institutionUrls = institutions.map(inst => ({
    url: `${baseUrl}/simuladores/${encodeURIComponent(inst || '')}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.7,
  }));

  const materiaUrls = Array.from(materiaPaths).map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as 'weekly',
    priority: 0.6,
  }));

  const simulatorUrls = simuladores.filter(({ slug }) => slug).map(({ slug }) => ({
    url: `${baseUrl}/simulador/${slug}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as 'daily',
    priority: 0.9,
  }));

  return [
    ...staticRoutes,
    ...institutionUrls,
    ...materiaUrls,
    ...simulatorUrls,
  ];
}

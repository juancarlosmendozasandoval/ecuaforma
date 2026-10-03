/**
 * Inyección masiva de preguntas al banco desde un archivo JSON.
 *
 * Uso (Node 24 ejecuta TypeScript directamente):
 *   npm run inyectar -- <archivo.json> [opciones]
 *
 * Opciones:
 *   --materia <slug>        Materia donde buscar (y crear) los temas.
 *   --crear-temas           Crea los temas que no existan (requiere --materia).
 *   --simulador "<nombre>"  Crea un micro-simulador con exactamente estas preguntas.
 *   --institucion, --categoria, --materia-sim   Datos de navegación del simulador.
 *   --publico               El simulador nace público (por defecto queda privado).
 *   --dry-run               Valida y muestra el resumen sin escribir nada.
 *
 * Formato: un arreglo de preguntas, o { "materia": "<slug>", "preguntas": [...] }.
 * Cada pregunta: enunciado, opciones (2 a 6), respuesta (texto exacto de una
 * opción o letra A-F), explicacion?, tema?, imagen_url?, youtube_url?.
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY de .env.local: solo para uso local del admin.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createClient } from '@supabase/supabase-js';

type Opcion = { type: 'text' | 'image'; value: string };

type PreguntaLista = {
  pregunta: string;
  opciones: Opcion[];
  respuesta: Opcion;
  feedback: string | null;
  pregunta_img_url: string | null;
  youtube_url: string | null;
  tema: string | null;
};

type Tema = { id: string; slug: string; nombre: string; materia_id: string };

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const LOTE = 100;

function slugify(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function esUrl(valor: string) {
  return /^https?:\/\/\S+$/i.test(valor);
}

function textoOpcional(valor: unknown) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

function salir(mensaje: string): never {
  console.error(`\n✖ ${mensaje}\n`);
  process.exit(1);
}

function normalizarOpcion(cruda: unknown): Opcion | null {
  if (typeof cruda === 'string' && cruda.trim()) return { type: 'text', value: cruda.trim() };
  if (cruda && typeof cruda === 'object') {
    const { type, value } = cruda as Record<string, unknown>;
    if ((type === 'text' || type === 'image') && typeof value === 'string' && value.trim()) {
      if (type === 'image' && !esUrl(value.trim())) return null;
      return { type, value: value.trim() };
    }
  }
  return null;
}

/** Devuelve la pregunta lista para insertar, o los errores encontrados. */
function validarPregunta(cruda: unknown, numero: number): { ok: PreguntaLista } | { errores: string[] } {
  const errores: string[] = [];
  const p = (cruda && typeof cruda === 'object' ? cruda : {}) as Record<string, unknown>;
  const prefijo = `Pregunta #${numero}`;

  const enunciado = textoOpcional(p.enunciado);
  if (!enunciado) errores.push(`${prefijo}: falta "enunciado".`);

  const opcionesCrudas = Array.isArray(p.opciones) ? p.opciones : [];
  const opciones = opcionesCrudas.map(normalizarOpcion);
  if (opcionesCrudas.length < 2 || opcionesCrudas.length > LETRAS.length) {
    errores.push(`${prefijo}: "opciones" debe tener entre 2 y ${LETRAS.length} elementos.`);
  }
  if (opciones.some((opcion) => !opcion)) errores.push(`${prefijo}: hay opciones vacías o con formato inválido.`);
  const validas = opciones.filter((opcion): opcion is Opcion => !!opcion);
  if (new Set(validas.map((opcion) => opcion.value)).size !== validas.length) {
    errores.push(`${prefijo}: hay opciones repetidas.`);
  }

  let respuesta: Opcion | undefined;
  const respuestaCruda = normalizarOpcion(p.respuesta);
  if (respuestaCruda) {
    respuesta = validas.find((opcion) => opcion.value === respuestaCruda.value);
    const indiceLetra = LETRAS.indexOf(respuestaCruda.value.toUpperCase());
    if (!respuesta && respuestaCruda.value.length === 1 && indiceLetra >= 0) respuesta = validas[indiceLetra];
  }
  if (!respuesta) errores.push(`${prefijo}: "respuesta" debe ser el texto exacto de una opción o su letra (A-${LETRAS[validas.length - 1] || 'D'}).`);

  const imagen = textoOpcional(p.imagen_url);
  if (imagen && !esUrl(imagen)) errores.push(`${prefijo}: "imagen_url" no es una URL http(s).`);
  const youtube = textoOpcional(p.youtube_url);
  if (youtube && !esUrl(youtube)) errores.push(`${prefijo}: "youtube_url" no es una URL http(s).`);

  if (errores.length > 0 || !enunciado || !respuesta) return { errores };
  return {
    ok: {
      pregunta: enunciado,
      opciones: validas,
      respuesta,
      feedback: textoOpcional(p.explicacion),
      pregunta_img_url: imagen,
      youtube_url: youtube,
      tema: textoOpcional(p.tema),
    },
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      materia: { type: 'string' },
      'crear-temas': { type: 'boolean', default: false },
      simulador: { type: 'string' },
      institucion: { type: 'string' },
      categoria: { type: 'string' },
      'materia-sim': { type: 'string' },
      publico: { type: 'boolean', default: false },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  const archivo = positionals[0];
  if (!archivo) salir('Indica el archivo JSON. Ej: npm run inyectar -- banco.json --simulador "Ecuaciones FAE"');
  const ruta = resolve(process.cwd(), archivo);
  if (!existsSync(ruta)) salir(`No existe el archivo ${ruta}`);

  let contenido: unknown;
  try {
    contenido = JSON.parse(readFileSync(ruta, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    salir(`El archivo no es JSON válido: ${error instanceof Error ? error.message : error}`);
  }

  const envoltura = (!Array.isArray(contenido) && contenido && typeof contenido === 'object' ? contenido : {}) as Record<string, unknown>;
  const crudas = Array.isArray(contenido) ? contenido : envoltura.preguntas;
  if (!Array.isArray(crudas) || crudas.length === 0) salir('El JSON debe ser un arreglo de preguntas o tener la clave "preguntas".');

  const materiaSlug = values.materia || textoOpcional(envoltura.materia);
  if (values['crear-temas'] && !materiaSlug) salir('--crear-temas necesita --materia <slug>.');

  // 1. Validar todo el archivo antes de tocar la base de datos.
  const lote: PreguntaLista[] = [];
  const errores: string[] = [];
  crudas.forEach((cruda, indice) => {
    const resultado = validarPregunta(cruda, indice + 1);
    if ('ok' in resultado) lote.push(resultado.ok);
    else errores.push(...resultado.errores);
  });
  if (errores.length > 0) salir(`El archivo tiene ${errores.length} error(es); no se insertó nada:\n  - ${errores.join('\n  - ')}`);

  // 2. Conectar con la service role (solo existe en el entorno local del admin).
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) salir('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
  const supabase = createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });

  // 3. Resolver cada "tema" (slug o nombre) a temas.id.
  let materia: { id: string; nombre: string } | null = null;
  if (materiaSlug) {
    const { data, error } = await supabase.from('materias').select('id, nombre').eq('slug', slugify(materiaSlug)).maybeSingle();
    if (error) salir(`No se pudo leer materias: ${error.message}`);
    if (!data) salir(`No existe la materia con slug "${slugify(materiaSlug)}".`);
    materia = data;
  }

  let consultaTemas = supabase.from('temas').select('id, slug, nombre, materia_id');
  if (materia) consultaTemas = consultaTemas.eq('materia_id', materia.id);
  const { data: temasData, error: errorTemas } = await consultaTemas;
  if (errorTemas) salir(`No se pudo leer temas: ${errorTemas.message}`);
  const temas = (temasData || []) as Tema[];

  const nombresTema = Array.from(new Set(lote.map((p) => p.tema).filter((t): t is string => !!t)));
  const temaIds = new Map<string, string>();
  const faltantes: string[] = [];
  for (const nombre of nombresTema) {
    const clave = slugify(nombre);
    const coincidencias = temas.filter((tema) => tema.slug === clave || slugify(tema.nombre) === clave);
    if (coincidencias.length > 1) salir(`El tema "${nombre}" existe en varias materias. Indica --materia <slug>.`);
    if (coincidencias[0]) temaIds.set(nombre, coincidencias[0].id);
    else faltantes.push(nombre);
  }
  if (faltantes.length > 0 && !values['crear-temas']) {
    salir(`Estos temas no existen${materia ? ` en ${materia.nombre}` : ''}: ${faltantes.join(', ')}.\n  Créalos en /admin/categorias o usa --materia <slug> --crear-temas.`);
  }

  const sinTema = lote.filter((p) => !p.tema).length;
  console.log(`\n📦 ${lote.length} preguntas válidas en ${archivo}`);
  console.log(`🏷️  Temas: ${nombresTema.length} (${faltantes.length} por crear)${sinTema ? ` · ⚠️ ${sinTema} sin tema: no entrarán a simuladores dinámicos` : ''}`);
  if (values.simulador) console.log(`🧪 Micro-simulador: "${values.simulador}" (${values.publico ? 'público' : 'privado'})`);
  if (values['dry-run']) {
    console.log('\n✔ Dry-run: validación correcta, no se escribió nada.\n');
    return;
  }

  // 4. Crear los temas faltantes.
  for (const nombre of faltantes) {
    const { data, error } = await supabase
      .from('temas')
      .insert({ nombre, slug: slugify(nombre), materia_id: materia!.id })
      .select('id')
      .single();
    if (error || !data) salir(`No se pudo crear el tema "${nombre}": ${error?.message}`);
    temaIds.set(nombre, data.id);
  }

  // 5. Insertar las preguntas por lotes; RETURNING conserva el orden del lote.
  const idsInsertados: number[] = [];
  for (let inicio = 0; inicio < lote.length; inicio += LOTE) {
    const filas = lote.slice(inicio, inicio + LOTE).map(({ tema, ...pregunta }) => ({
      ...pregunta,
      tema_id: tema ? temaIds.get(tema) || null : null,
    }));
    const { data, error } = await supabase.from('preguntas').insert(filas).select('id');
    if (error || !data) {
      salir(`Falló el lote que empieza en la pregunta #${inicio + 1}: ${error?.message}.` +
        (idsInsertados.length ? ` Ya se insertaron ${idsInsertados.length} (ids ${idsInsertados[0]}–${idsInsertados[idsInsertados.length - 1]}).` : ''));
    }
    idsInsertados.push(...data.map((fila) => fila.id as number));
  }
  console.log(`✔ ${idsInsertados.length} preguntas insertadas (ids ${idsInsertados[0]}–${idsInsertados[idsInsertados.length - 1]}).`);

  if (!values.simulador) return;

  // 6. Micro-simulador con exactamente estas preguntas, en el orden del archivo.
  const base = slugify(values.simulador) || 'simulador';
  const { data: existentes } = await supabase.from('simuladores').select('slug').like('slug', `${base}%`);
  const usados = new Set((existentes || []).map((fila) => fila.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n += 1) slug = `${base}-${n}`;

  const { data: sim, error: errorSim } = await supabase
    .from('simuladores')
    .insert({
      nombre: values.simulador,
      slug,
      institucion: values.institucion || null,
      categoria: values.categoria || null,
      materia: values['materia-sim'] || materia?.nombre || null,
      publico: values.publico,
      es_pago: false,
      is_deleted: false,
    })
    .select('id')
    .single();
  if (errorSim || !sim) salir(`Las preguntas quedaron en el banco, pero no se pudo crear el simulador: ${errorSim?.message}`);

  for (let inicio = 0; inicio < idsInsertados.length; inicio += LOTE) {
    const vinculos = idsInsertados.slice(inicio, inicio + LOTE).map((preguntaId, i) => ({
      simulador_id: sim.id,
      pregunta_id: preguntaId,
      orden: inicio + i + 1,
    }));
    const { error } = await supabase.from('simulador_preguntas').insert(vinculos);
    if (error) salir(`Simulador "${slug}" creado, pero falló el vínculo desde la pregunta #${inicio + 1}: ${error.message}`);
  }

  console.log(`✔ Simulador creado: /simulador/${slug} (${idsInsertados.length} preguntas).\n`);
}

main().catch((error) => salir(error instanceof Error ? error.message : String(error)));

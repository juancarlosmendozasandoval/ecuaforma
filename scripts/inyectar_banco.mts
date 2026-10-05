/**
 * Inyección masiva de preguntas al banco desde un archivo JSON, repartidas en
 * varios micro-simuladores de tamaño fijo.
 *
 * Uso (Node 24 ejecuta TypeScript directamente):
 *   npm run inyectar -- <archivo.json> [opciones]
 *
 * Opciones:
 *   --materia <slug>          Materia donde buscar (y crear) los temas.
 *   --crear-temas             Crea los temas que no existan (requiere --materia).
 *   --prefijo "<nombre>"      Divide el archivo en lotes y crea un simulador por lote:
 *                             "<prefijo> 1", "<prefijo> 2", ... Sin --prefijo solo se
 *                             cargan las preguntas al banco.
 *   --lote <n>                Preguntas por simulador (1-200, por defecto 20).
 *   --institucion "<nombre>"  Institución de los simuladores (ej. FAE). Requiere --materia.
 *   --publico                 Los simuladores nacen públicos (por defecto, privados).
 *   --leccion                 Crea además una lección tipo "simulador" en banco_lecciones por lote.
 *   --submodulo <uuid>        Agrega esas lecciones, en orden, al final de un submódulo
 *                             de un curso (implica --leccion).
 *   --numero-inicial <n>      Número del primer simulador. Por defecto continúa después
 *                             del mayor "<prefijo> N" que ya exista.
 *   --inicio-lote <n>         Reanuda desde el lote n (omite los anteriores del archivo).
 *   --pausa <ms>              Espera entre lotes para no saturar Supabase (por defecto 400).
 *   --dry-run                 Valida y muestra el plan sin escribir nada.
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
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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

/** Lo que un lote alcanzó a crear, para poder deshacerlo si falla a medias. */
type CreadoEnLote = {
  preguntaIds: number[];
  simuladorId: string | null;
  leccionId: string | null;
  contenidoId: string | null;
};

const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];
const LOTE_POR_DEFECTO = 20;
const LOTE_MAXIMO = 200;
const PAUSA_POR_DEFECTO_MS = 400;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

/** Error esperado: se imprime sin stack. */
class ErrorSalida extends Error {}

// process.exit() con sockets de fetch abiertos hace fallar a Node en Windows (UV_HANDLE_CLOSING).
function salir(mensaje: string): never {
  throw new ErrorSalida(mensaje);
}

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

function enteroOpcional(valor: string | undefined, nombre: string, minimo: number, maximo = Number.MAX_SAFE_INTEGER) {
  if (valor === undefined) return null;
  const numero = Number(valor);
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    salir(`--${nombre} debe ser un entero entre ${minimo} y ${maximo === Number.MAX_SAFE_INTEGER ? '∞' : maximo}.`);
  }
  return numero;
}

function dividirEnLotes<T>(elementos: T[], tamano: number): T[][] {
  const lotes: T[][] = [];
  for (let inicio = 0; inicio < elementos.length; inicio += tamano) lotes.push(elementos.slice(inicio, inicio + tamano));
  return lotes;
}

/** Escapa % y _ para usar el texto literal dentro de un LIKE. */
const literalLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

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

/** Deshace, en orden inverso, lo que un lote alcanzó a crear. Devuelve lo que no se pudo borrar. */
async function deshacerLote(supabase: SupabaseClient, creado: CreadoEnLote) {
  const pendientes: string[] = [];
  const borrar = async (descripcion: string, consulta: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await consulta;
    if (error) pendientes.push(`${descripcion}: ${error.message}`);
  };

  if (creado.contenidoId) {
    await borrar(`contenido_modulos ${creado.contenidoId}`, supabase.from('contenido_modulos').delete().eq('id', creado.contenidoId));
  }
  if (creado.leccionId) {
    await borrar(`banco_lecciones ${creado.leccionId}`, supabase.from('banco_lecciones').delete().eq('id', creado.leccionId));
  }
  if (creado.simuladorId) {
    await borrar('simulador_preguntas', supabase.from('simulador_preguntas').delete().eq('simulador_id', creado.simuladorId));
    await borrar(`simuladores ${creado.simuladorId}`, supabase.from('simuladores').delete().eq('id', creado.simuladorId));
  }
  if (creado.preguntaIds.length > 0) {
    await borrar(
      `preguntas ${creado.preguntaIds[0]}–${creado.preguntaIds[creado.preguntaIds.length - 1]}`,
      supabase.from('preguntas').delete().in('id', creado.preguntaIds)
    );
  }
  return pendientes;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      materia: { type: 'string' },
      'crear-temas': { type: 'boolean', default: false },
      prefijo: { type: 'string' },
      lote: { type: 'string' },
      simulador: { type: 'string' },
      institucion: { type: 'string' },
      publico: { type: 'boolean', default: false },
      leccion: { type: 'boolean', default: false },
      submodulo: { type: 'string' },
      'numero-inicial': { type: 'string' },
      'inicio-lote': { type: 'string' },
      pausa: { type: 'string' },
      'dry-run': { type: 'boolean', default: false },
    },
  });

  if (values.simulador) {
    salir(`--simulador fue reemplazado por --prefijo. Ej: --prefijo "${values.simulador}" --lote 20`);
  }

  const archivo = positionals[0];
  if (!archivo) salir('Indica el archivo JSON. Ej: npm run inyectar -- banco.json --prefijo "Simulador: Seguridad del Estado"');
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

  const prefijo = textoOpcional(values.prefijo);
  const tamanoLote = enteroOpcional(values.lote, 'lote', 1, LOTE_MAXIMO) ?? LOTE_POR_DEFECTO;
  const numeroInicialFijo = enteroOpcional(values['numero-inicial'], 'numero-inicial', 1);
  const inicioLote = enteroOpcional(values['inicio-lote'], 'inicio-lote', 1) ?? 1;
  const pausaMs = enteroOpcional(values.pausa, 'pausa', 0, 60_000) ?? PAUSA_POR_DEFECTO_MS;
  const submoduloId = textoOpcional(values.submodulo);
  const crearLeccion = values.leccion || !!submoduloId;

  const materiaSlug = values.materia || textoOpcional(envoltura.materia);
  if (values['crear-temas'] && !materiaSlug) salir('--crear-temas necesita --materia <slug>.');
  if (prefijo && (!materiaSlug || !values.institucion)) {
    salir('--prefijo necesita --materia <slug> y --institucion "<nombre>" para aparecer en el catálogo.');
  }
  if (!prefijo && (crearLeccion || values.lote || values['inicio-lote'] || values['numero-inicial'])) {
    salir('--lote, --leccion, --submodulo, --numero-inicial e --inicio-lote necesitan --prefijo "<nombre>".');
  }
  if (submoduloId && !UUID.test(submoduloId)) salir('--submodulo debe ser el id (uuid) de un submódulo.');

  // 1. Validar todo el archivo antes de tocar la base de datos.
  const preguntas: PreguntaLista[] = [];
  const errores: string[] = [];
  crudas.forEach((cruda, indice) => {
    const resultado = validarPregunta(cruda, indice + 1);
    if ('ok' in resultado) preguntas.push(resultado.ok);
    else errores.push(...resultado.errores);
  });
  if (errores.length > 0) salir(`El archivo tiene ${errores.length} error(es); no se insertó nada:\n  - ${errores.join('\n  - ')}`);

  // Sin --prefijo, las preguntas solo van al banco: se insertan en bloques grandes.
  const lotes = dividirEnLotes(preguntas, prefijo ? tamanoLote : 100);
  if (inicioLote > lotes.length) salir(`--inicio-lote ${inicioLote} supera los ${lotes.length} lotes del archivo.`);

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

  const nombresTema = Array.from(new Set(preguntas.map((p) => p.tema).filter((t): t is string => !!t)));
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

  // 4. Comprobar el submódulo destino: las lecciones solo pueden ir en el segundo nivel.
  let submodulo: { id: string; titulo: string } | null = null;
  if (submoduloId) {
    const { data, error } = await supabase
      .from('modulos_curso')
      .select('id, titulo, parent_id')
      .eq('id', submoduloId)
      .maybeSingle();
    if (error) salir(`No se pudo leer el submódulo: ${error.message}`);
    if (!data) salir(`No existe la carpeta ${submoduloId}.`);
    if (!data.parent_id) salir(`"${data.titulo}" es un módulo principal; las lecciones van en un submódulo.`);
    submodulo = { id: data.id, titulo: data.titulo };
  }

  // 5. Numeración: continúa después del mayor "<prefijo> N" existente, salvo --numero-inicial.
  let primerNumero = 1;
  const slugsUsados = new Set<string>();
  if (prefijo) {
    const { data: existentes, error } = await supabase
      .from('simuladores')
      .select('nombre, slug')
      .like('nombre', `${literalLike(prefijo)} %`);
    if (error) salir(`No se pudieron leer los simuladores existentes: ${error.message}`);

    const patron = new RegExp(`^${prefijo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`);
    const mayor = (existentes || []).reduce((max, fila) => {
      const coincidencia = patron.exec(fila.nombre || '');
      return coincidencia ? Math.max(max, Number(coincidencia[1])) : max;
    }, 0);
    primerNumero = numeroInicialFijo ?? mayor + 1;

    const { data: slugs, error: errorSlugs } = await supabase
      .from('simuladores')
      .select('slug')
      .like('slug', `${literalLike(slugify(prefijo) || 'simulador')}%`);
    if (errorSlugs) salir(`No se pudieron leer los slugs existentes: ${errorSlugs.message}`);
    for (const fila of slugs || []) if (fila.slug) slugsUsados.add(fila.slug);
  }

  const lotesPendientes = lotes.slice(inicioLote - 1);
  const nombreDe = (indicePendiente: number) => `${prefijo} ${primerNumero + indicePendiente}`;

  // Resumen del plan
  const sinTema = preguntas.filter((p) => !p.tema).length;
  console.log(`\n📦 ${preguntas.length} preguntas válidas en ${archivo}`);
  console.log(`🏷️  Temas: ${nombresTema.length} (${faltantes.length} por crear)${sinTema ? ` · ⚠️ ${sinTema} sin tema: no entrarán a simuladores dinámicos` : ''}`);
  if (prefijo) {
    const ultimo = lotesPendientes[lotesPendientes.length - 1];
    console.log(
      `🧪 ${lotesPendientes.length} simulador(es) de ${tamanoLote} preguntas (${values.publico ? 'públicos' : 'privados'})` +
        (inicioLote > 1 ? `, desde el lote ${inicioLote} de ${lotes.length}` : '') +
        (ultimo.length < tamanoLote ? ` · el último tendrá ${ultimo.length}` : '')
    );
    console.log(`   "${nombreDe(0)}"${lotesPendientes.length > 1 ? ` … "${nombreDe(lotesPendientes.length - 1)}"` : ''}`);
    if (primerNumero > 1 && numeroInicialFijo === null) console.log(`   (ya existen hasta "${prefijo} ${primerNumero - 1}": se continúa la numeración)`);
    if (crearLeccion) console.log(`📚 Una lección por simulador${submodulo ? `, agregadas al submódulo "${submodulo.titulo}"` : ' en el banco de lecciones'}`);
  }
  if (values['dry-run']) {
    console.log('\n✔ Dry-run: validación correcta, no se escribió nada.\n');
    return;
  }

  // 6. Crear los temas faltantes.
  for (const nombre of faltantes) {
    const { data, error } = await supabase
      .from('temas')
      .insert({ nombre, slug: slugify(nombre), materia_id: materia!.id })
      .select('id')
      .single();
    if (error || !data) salir(`No se pudo crear el tema "${nombre}": ${error?.message}`);
    temaIds.set(nombre, data.id);
  }

  const filasPregunta = (lote: PreguntaLista[]) =>
    lote.map(({ tema, ...pregunta }) => ({ ...pregunta, tema_id: tema ? temaIds.get(tema) || null : null }));

  // Sin prefijo: solo banco de preguntas.
  if (!prefijo) {
    const ids: number[] = [];
    for (const [indice, lote] of lotes.entries()) {
      const { data, error } = await supabase.from('preguntas').insert(filasPregunta(lote)).select('id');
      if (error || !data) {
        salir(`Falló el bloque ${indice + 1}: ${error?.message}.` + (ids.length ? ` Ya se insertaron ${ids.length} preguntas.` : ''));
      }
      ids.push(...data.map((fila) => fila.id as number));
      if (indice < lotes.length - 1 && pausaMs) await esperar(pausaMs);
    }
    console.log(`✔ ${ids.length} preguntas insertadas en el banco (ids ${ids[0]}–${ids[ids.length - 1]}).\n`);
    return;
  }

  // 7. Un lote a la vez: preguntas → simulador → vínculos → lección → submódulo.
  let ordenContenido = 0;
  if (submodulo) {
    const { data } = await supabase
      .from('contenido_modulos')
      .select('orden')
      .eq('modulo_id', submodulo.id)
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle();
    ordenContenido = data?.orden || 0;
  }

  const completados: string[] = [];
  for (const [indice, lote] of lotesPendientes.entries()) {
    const numeroLote = inicioLote + indice;
    const nombre = nombreDe(indice);
    const creado: CreadoEnLote = { preguntaIds: [], simuladorId: null, leccionId: null, contenidoId: null };

    const fallar = async (paso: string, mensaje: string | undefined): Promise<never> => {
      const pendientes = await deshacerLote(supabase, creado);
      salir(
        `Lote ${numeroLote} ("${nombre}") falló al ${paso}: ${mensaje || 'error desconocido'}.\n` +
          (pendientes.length
            ? `  ⚠️ No se pudo deshacer por completo; revisa a mano:\n    - ${pendientes.join('\n    - ')}\n`
            : `  Se deshizo todo lo de este lote.\n`) +
          (completados.length ? `  Lotes completos: ${completados.length} (${completados.join(', ')}).\n` : '') +
          `  Para reanudar: añade --inicio-lote ${numeroLote} al mismo comando.`
      );
    };

    // 7a. Preguntas del lote (RETURNING conserva el orden).
    const { data: insertadas, error: errorPreguntas } = await supabase
      .from('preguntas')
      .insert(filasPregunta(lote))
      .select('id');
    if (errorPreguntas || !insertadas) await fallar('insertar las preguntas', errorPreguntas?.message);
    creado.preguntaIds = insertadas!.map((fila) => fila.id as number);

    // 7b. Simulador con slug único.
    const base = slugify(nombre) || 'simulador';
    let slug = base;
    for (let n = 2; slugsUsados.has(slug); n += 1) slug = `${base}-${n}`;

    const { data: sim, error: errorSim } = await supabase
      .from('simuladores')
      .insert({
        nombre,
        slug,
        institucion: values.institucion || null,
        materia_id: materia!.id,
        materia: materia!.nombre,
        publico: values.publico,
        es_pago: false,
        is_deleted: false,
      })
      .select('id')
      .single();
    if (errorSim || !sim) await fallar('crear el simulador', errorSim?.message);
    creado.simuladorId = sim!.id;
    slugsUsados.add(slug);

    // 7c. Vínculos en el orden del archivo.
    const vinculos = creado.preguntaIds.map((preguntaId, i) => ({ simulador_id: sim!.id, pregunta_id: preguntaId, orden: i + 1 }));
    const { error: errorVinculos } = await supabase.from('simulador_preguntas').insert(vinculos);
    if (errorVinculos) await fallar('vincular las preguntas', errorVinculos.message);

    // 7d. Lección del banco (con el tema si todo el lote comparte uno) y su lugar en el submódulo.
    if (crearLeccion) {
      const temasDelLote = new Set(lote.map((p) => (p.tema ? temaIds.get(p.tema) || null : null)));
      const temaUnico = temasDelLote.size === 1 ? Array.from(temasDelLote)[0] : null;

      const { data: leccion, error: errorLeccion } = await supabase
        .from('banco_lecciones')
        .insert({ titulo_interno: nombre, tipo: 'simulador', simulador_id: sim!.id, tema_id: temaUnico })
        .select('id')
        .single();
      if (errorLeccion || !leccion) await fallar('crear la lección', errorLeccion?.message);
      creado.leccionId = leccion!.id;

      if (submodulo) {
        const { data: fila, error: errorContenido } = await supabase
          .from('contenido_modulos')
          .insert({ modulo_id: submodulo.id, leccion_id: leccion!.id, orden: ordenContenido + 1, is_preview: false })
          .select('id')
          .single();
        if (errorContenido || !fila) await fallar('agregar la lección al submódulo', errorContenido?.message);
        creado.contenidoId = fila!.id;
        ordenContenido += 1;
      }
    }

    completados.push(`"${nombre}"`);
    console.log(`✔ [${indice + 1}/${lotesPendientes.length}] ${nombre} → /simulador/${slug} (${lote.length} preguntas)`);
    if (indice < lotesPendientes.length - 1 && pausaMs) await esperar(pausaMs);
  }

  const totalPreguntas = lotesPendientes.reduce((total, lote) => total + lote.length, 0);
  console.log(`\n✔ Listo: ${completados.length} simuladores y ${totalPreguntas} preguntas.\n`);
}

main().catch((error) => {
  const mensaje = error instanceof Error ? error.message : String(error);
  console.error(`\n✖ ${mensaje}\n`);
  if (!(error instanceof ErrorSalida) && error instanceof Error && error.stack) console.error(error.stack);
  process.exitCode = 1;
});

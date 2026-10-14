/**
 * Publica un tema completo en un curso desde un JSON: tema → submódulo → por cada bloque,
 * cápsula de teoría (Markdown, video opcional) seguida de su práctica (simulador).
 *
 * Uso:
 *   npm run publicar-tema -- scripts/tema_actual.json [--dry-run] [--pausa <ms>]
 *
 * Formato:
 * {
 *   "cursoSlug": "curso-completo-essuna",
 *   "moduloPadreId": "<uuid del módulo principal>",
 *   "materiaSlug": "fisica",
 *   "institucion": "Armada",
 *   "publico": true,
 *   "tema": { "nombre": "1.1 Introducción...", "slug": "introduccion-naturaleza-fisica", "orden": 1 },
 *   "SubmoduloTitulo": "1.1 Introducción...",
 *   "bloques": [
 *     {
 *       "tituloCapsula": "📖 Cápsula 1: ...",
 *       "markdown": "### ...",
 *       "videoUrl": null,
 *       "tituloSimulador": "Simulador: Intro Física 1",
 *       "tituloLeccionSimulador": "🎯 Práctica 1: ...",
 *       "preguntas": [{ "enunciado": "...", "opciones": ["..."], "respuesta": "a", "explicacion": "..." }]
 *     }
 *   ]
 * }
 *
 * Es reanudable: el tema y el submódulo se reutilizan si ya existen, y los bloques cuya
 * cápsula (y práctica) ya están en el submódulo se omiten. Si un bloque falla, se deshace
 * solo ese bloque y basta con volver a ejecutar el mismo comando.
 *
 * Usa SUPABASE_SERVICE_ROLE_KEY de .env.local: solo para uso local del admin.
 */
import { parseArgs } from 'node:util';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  UUID,
  conectarSupabase,
  ejecutar,
  esUrl,
  esperar,
  leerJson,
  salir,
  slugify,
  textoOpcional,
  validarPregunta,
  type PreguntaLista,
} from './compartido/banco.mts';

type Bloque = {
  numero: number;
  tituloCapsula: string;
  markdown: string;
  videoUrl: string | null;
  tituloSimulador: string | null;
  tituloLeccionSimulador: string | null;
  preguntas: PreguntaLista[];
};

type Publicacion = {
  cursoSlug: string;
  moduloPadreId: string;
  materiaSlug: string;
  institucion: string;
  publico: boolean;
  tema: { nombre: string; slug: string; orden: number | null };
  submoduloTitulo: string;
  bloques: Bloque[];
};

/** Filas creadas por un bloque, para deshacerlo si falla a medias. */
type CreadoEnBloque = {
  contenidoIds: string[];
  leccionIds: string[];
  simuladorId: string | null;
  preguntaIds: number[];
};

const PAUSA_POR_DEFECTO_MS = 400;
const MAX_TITULO = 150;
const MAX_PREGUNTAS_POR_SIMULADOR = 200;

// ─── Paso 1: validación del JSON (sin red) ────────────────────────────────────

function validarPublicacion(contenido: unknown): Publicacion {
  const errores: string[] = [];
  const raiz = (contenido && typeof contenido === 'object' && !Array.isArray(contenido) ? contenido : {}) as Record<string, unknown>;

  const texto = (campo: string, valor: unknown, maximo = MAX_TITULO) => {
    const limpio = textoOpcional(valor);
    if (!limpio) errores.push(`Falta "${campo}".`);
    else if (limpio.length > maximo) errores.push(`"${campo}" supera ${maximo} caracteres.`);
    return limpio || '';
  };

  const cursoSlug = texto('cursoSlug', raiz.cursoSlug);
  const moduloPadreId = texto('moduloPadreId', raiz.moduloPadreId);
  if (moduloPadreId && !UUID.test(moduloPadreId)) errores.push('"moduloPadreId" debe ser un uuid.');
  const materiaSlug = texto('materiaSlug', raiz.materiaSlug);
  const institucion = texto('institucion', raiz.institucion);
  if (raiz.publico !== undefined && typeof raiz.publico !== 'boolean') errores.push('"publico" debe ser true o false.');
  const submoduloTitulo = texto('SubmoduloTitulo', raiz.SubmoduloTitulo ?? raiz.submoduloTitulo);

  const temaCrudo = (raiz.tema && typeof raiz.tema === 'object' ? raiz.tema : {}) as Record<string, unknown>;
  const temaNombre = texto('tema.nombre', temaCrudo.nombre);
  const temaSlug = slugify(textoOpcional(temaCrudo.slug) || temaNombre);
  if (!temaSlug) errores.push('"tema.slug" no es válido.');
  let temaOrden: number | null = null;
  if (temaCrudo.orden !== undefined && temaCrudo.orden !== null) {
    if (!Number.isInteger(temaCrudo.orden) || (temaCrudo.orden as number) < 0) errores.push('"tema.orden" debe ser un entero ≥ 0.');
    else temaOrden = temaCrudo.orden as number;
  }

  const bloquesCrudos = Array.isArray(raiz.bloques) ? raiz.bloques : [];
  if (bloquesCrudos.length === 0) errores.push('"bloques" debe tener al menos un bloque.');

  const bloques: Bloque[] = bloquesCrudos.map((crudo, indice) => {
    const numero = indice + 1;
    const etiqueta = `Bloque ${numero}`;
    const b = (crudo && typeof crudo === 'object' ? crudo : {}) as Record<string, unknown>;

    const tituloCapsula = textoOpcional(b.tituloCapsula) || '';
    if (!tituloCapsula) errores.push(`${etiqueta}: falta "tituloCapsula".`);
    else if (tituloCapsula.length > MAX_TITULO) errores.push(`${etiqueta}: "tituloCapsula" supera ${MAX_TITULO} caracteres.`);

    const markdown = typeof b.markdown === 'string' ? b.markdown.replace(/\r\n/g, '\n').trim() : '';
    if (!markdown) errores.push(`${etiqueta}: "markdown" está vacío.`);

    const videoUrl = textoOpcional(b.videoUrl);
    if (videoUrl && !esUrl(videoUrl)) errores.push(`${etiqueta}: "videoUrl" no es una URL http(s).`);

    const preguntasCrudas = b.preguntas === undefined || b.preguntas === null ? [] : b.preguntas;
    if (!Array.isArray(preguntasCrudas)) errores.push(`${etiqueta}: "preguntas" debe ser un arreglo.`);
    const lista = Array.isArray(preguntasCrudas) ? preguntasCrudas : [];
    if (lista.length > MAX_PREGUNTAS_POR_SIMULADOR) {
      errores.push(`${etiqueta}: un simulador admite hasta ${MAX_PREGUNTAS_POR_SIMULADOR} preguntas.`);
    }

    const preguntas: PreguntaLista[] = [];
    lista.forEach((pregunta, i) => {
      const resultado = validarPregunta(pregunta, `${etiqueta} · pregunta #${i + 1}`);
      if ('ok' in resultado) preguntas.push(resultado.ok);
      else errores.push(...resultado.errores);
    });

    const tituloSimulador = textoOpcional(b.tituloSimulador);
    const tituloLeccionSimulador = textoOpcional(b.tituloLeccionSimulador);
    if (lista.length > 0) {
      if (!tituloSimulador) errores.push(`${etiqueta}: trae preguntas pero falta "tituloSimulador".`);
      if (!tituloLeccionSimulador) errores.push(`${etiqueta}: trae preguntas pero falta "tituloLeccionSimulador".`);
    }
    for (const [campo, valor] of [['tituloSimulador', tituloSimulador], ['tituloLeccionSimulador', tituloLeccionSimulador]] as const) {
      if (valor && valor.length > MAX_TITULO) errores.push(`${etiqueta}: "${campo}" supera ${MAX_TITULO} caracteres.`);
    }

    return { numero, tituloCapsula, markdown, videoUrl, tituloSimulador, tituloLeccionSimulador, preguntas };
  });

  const repetidos = (valores: (string | null)[]) => {
    const vistos = new Set<string>();
    return Array.from(new Set(valores.filter((v): v is string => !!v).filter((v) => (vistos.has(v) ? true : (vistos.add(v), false)))));
  };
  const titulosRepetidos = repetidos(bloques.flatMap((b) => [b.tituloCapsula, b.tituloLeccionSimulador]));
  if (titulosRepetidos.length) errores.push(`Hay títulos de lección repetidos: ${titulosRepetidos.join(', ')}.`);
  const simuladoresRepetidos = repetidos(bloques.map((b) => (b.preguntas.length ? b.tituloSimulador : null)));
  if (simuladoresRepetidos.length) errores.push(`Hay simuladores repetidos: ${simuladoresRepetidos.join(', ')}.`);

  if (errores.length > 0) {
    salir(`El archivo tiene ${errores.length} error(es); no se tocó la base de datos:\n  - ${errores.join('\n  - ')}`);
  }

  return {
    cursoSlug,
    moduloPadreId,
    materiaSlug: slugify(materiaSlug),
    institucion,
    publico: raiz.publico === true,
    tema: { nombre: temaNombre, slug: temaSlug, orden: temaOrden },
    submoduloTitulo,
    bloques,
  };
}

// ─── Utilidades de escritura ──────────────────────────────────────────────────

/** Deshace, en orden inverso, lo que un bloque alcanzó a crear. Devuelve lo que no se pudo borrar. */
async function deshacerBloque(supabase: SupabaseClient, creado: CreadoEnBloque) {
  const pendientes: string[] = [];
  const borrar = async (descripcion: string, consulta: PromiseLike<{ error: { message: string } | null }>) => {
    const { error } = await consulta;
    if (error) pendientes.push(`${descripcion}: ${error.message}`);
  };

  if (creado.contenidoIds.length) {
    await borrar('contenido_modulos', supabase.from('contenido_modulos').delete().in('id', creado.contenidoIds));
  }
  if (creado.leccionIds.length) {
    await borrar('banco_lecciones', supabase.from('banco_lecciones').delete().in('id', creado.leccionIds));
  }
  if (creado.simuladorId) {
    await borrar('simulador_preguntas', supabase.from('simulador_preguntas').delete().eq('simulador_id', creado.simuladorId));
    await borrar(`simuladores ${creado.simuladorId}`, supabase.from('simuladores').delete().eq('id', creado.simuladorId));
  }
  if (creado.preguntaIds.length) {
    await borrar('preguntas', supabase.from('preguntas').delete().in('id', creado.preguntaIds));
  }
  return pendientes;
}

async function slugLibre(supabase: SupabaseClient, nombre: string) {
  const base = slugify(nombre) || 'simulador';
  const { data, error } = await supabase.from('simuladores').select('slug').like('slug', `${base}%`);
  if (error) throw new Error(`No se pudieron leer los slugs: ${error.message}`);
  const usados = new Set((data || []).map((fila) => fila.slug));
  let slug = base;
  for (let n = 2; usados.has(slug); n += 1) slug = `${base}-${n}`;
  return slug;
}

// ─── Programa ─────────────────────────────────────────────────────────────────

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      'dry-run': { type: 'boolean', default: false },
      pausa: { type: 'string' },
    },
  });

  const archivo = positionals[0];
  if (!archivo) salir('Indica el archivo JSON. Ej: npm run publicar-tema -- scripts/tema_actual.json --dry-run');

  const pausaMs = values.pausa === undefined ? PAUSA_POR_DEFECTO_MS : Number(values.pausa);
  if (!Number.isInteger(pausaMs) || pausaMs < 0 || pausaMs > 60_000) salir('--pausa debe ser un entero entre 0 y 60000.');
  const dryRun = values['dry-run'];

  // Paso 1: todo el JSON es válido o no se toca la base de datos.
  const pub = validarPublicacion(leerJson(archivo));
  const totalPreguntas = pub.bloques.reduce((total, b) => total + b.preguntas.length, 0);
  console.log(`\n📦 ${archivo}: ${pub.bloques.length} bloque(s), ${totalPreguntas} pregunta(s) válidas.`);

  const supabase = conectarSupabase();

  // Paso 2: materia y tema.
  const { data: materia, error: errorMateria } = await supabase
    .from('materias')
    .select('id, nombre')
    .eq('slug', pub.materiaSlug)
    .maybeSingle();
  if (errorMateria) salir(`No se pudo leer materias: ${errorMateria.message}`);
  if (!materia) salir(`No existe la materia con slug "${pub.materiaSlug}".`);

  const { data: temaExistente, error: errorTema } = await supabase
    .from('temas')
    .select('id, nombre, orden')
    .eq('materia_id', materia.id)
    .eq('slug', pub.tema.slug)
    .maybeSingle();
  if (errorTema) salir(`No se pudo leer temas: ${errorTema.message}`);

  // Paso 3: curso, módulo padre y submódulo.
  const { data: curso, error: errorCurso } = await supabase
    .from('cursos')
    .select('id, nombre')
    .eq('slug', pub.cursoSlug)
    .maybeSingle();
  if (errorCurso) salir(`No se pudo leer cursos: ${errorCurso.message}`);
  if (!curso) salir(`No existe el curso con slug "${pub.cursoSlug}".`);

  const { data: padre, error: errorPadre } = await supabase
    .from('modulos_curso')
    .select('id, titulo, curso_id, parent_id')
    .eq('id', pub.moduloPadreId)
    .maybeSingle();
  if (errorPadre) salir(`No se pudo leer el módulo padre: ${errorPadre.message}`);
  if (!padre) salir(`No existe la carpeta ${pub.moduloPadreId}.`);
  if (padre.curso_id !== curso.id) salir(`La carpeta "${padre.titulo}" no pertenece al curso "${curso.nombre}".`);
  if (padre.parent_id) salir(`"${padre.titulo}" es un submódulo; "moduloPadreId" debe ser un módulo principal.`);

  const { data: subsExistentes, error: errorSub } = await supabase
    .from('modulos_curso')
    .select('id, titulo')
    .eq('parent_id', padre.id)
    .eq('titulo', pub.submoduloTitulo);
  if (errorSub) salir(`No se pudo leer los submódulos: ${errorSub.message}`);
  if ((subsExistentes || []).length > 1) {
    salir(`Hay ${subsExistentes!.length} submódulos "${pub.submoduloTitulo}" dentro de "${padre.titulo}". Deja uno solo.`);
  }
  let submoduloId: string | null = subsExistentes?.[0]?.id || null;

  // Bloques ya publicados en el submódulo (reanudación) y choques de nombres de simulador.
  const titulosEnSubmodulo = new Set<string>();
  if (submoduloId) {
    const { data: contenido, error } = await supabase
      .from('contenido_modulos')
      .select('banco_lecciones ( titulo_interno )')
      .eq('modulo_id', submoduloId);
    if (error) salir(`No se pudo leer el contenido del submódulo: ${error.message}`);
    for (const fila of (contenido || []) as { banco_lecciones: { titulo_interno: string } | { titulo_interno: string }[] | null }[]) {
      const leccion = Array.isArray(fila.banco_lecciones) ? fila.banco_lecciones[0] : fila.banco_lecciones;
      if (leccion?.titulo_interno) titulosEnSubmodulo.add(leccion.titulo_interno);
    }
  }

  const estado = pub.bloques.map((bloque) => {
    const tienePractica = bloque.preguntas.length > 0;
    const capsula = titulosEnSubmodulo.has(bloque.tituloCapsula);
    const practica = tienePractica && titulosEnSubmodulo.has(bloque.tituloLeccionSimulador!);
    return { bloque, publicado: capsula && (!tienePractica || practica), parcial: (capsula || practica) && !(capsula && (!tienePractica || practica)) };
  });
  const parciales = estado.filter((e) => e.parcial);
  if (parciales.length) {
    salir(
      `Estos bloques están a medio publicar en "${pub.submoduloTitulo}": ${parciales.map((e) => e.bloque.numero).join(', ')}.\n` +
        '  Quita a mano la lección suelta del submódulo (o completa la que falta) y vuelve a ejecutar.'
    );
  }

  const pendientes = estado.filter((e) => !e.publicado).map((e) => e.bloque);
  const nombresSimulador = pendientes.map((b) => (b.preguntas.length ? b.tituloSimulador : null)).filter((n): n is string => !!n);
  if (nombresSimulador.length) {
    const { data: choques, error } = await supabase
      .from('simuladores')
      .select('nombre')
      .in('nombre', nombresSimulador)
      .eq('is_deleted', false);
    if (error) salir(`No se pudieron leer los simuladores: ${error.message}`);
    if ((choques || []).length) {
      salir(`Ya existen simuladores con estos nombres: ${choques!.map((s) => `"${s.nombre}"`).join(', ')}. Cambia "tituloSimulador".`);
    }
  }

  // Resumen del plan
  console.log(`🎓 Curso: ${curso.nombre}  ›  ${padre.titulo}  ›  ${pub.submoduloTitulo} ${submoduloId ? '(ya existe)' : '(se creará)'}`);
  console.log(`🏷️  Tema: ${pub.tema.nombre} [${materia.nombre}] ${temaExistente ? '(ya existe)' : '(se creará)'}`);
  for (const { bloque, publicado } of estado) {
    const practica = bloque.preguntas.length
      ? `🎯 "${bloque.tituloLeccionSimulador}" → simulador "${bloque.tituloSimulador}" (${bloque.preguntas.length} preguntas)`
      : 'sin práctica';
    console.log(
      `   ${publicado ? '⏭️ ' : '➕'} Bloque ${bloque.numero}: 📖 "${bloque.tituloCapsula}"${bloque.videoUrl ? ' 🎬' : ''} · ${practica}` +
        (publicado ? ' — ya publicado, se omite' : '')
    );
  }
  console.log(`   Simuladores ${pub.publico ? 'públicos' : 'privados'} · institución ${pub.institucion}`);

  if (dryRun) {
    console.log('\n✔ Dry-run: validación correcta, no se escribió nada.\n');
    return;
  }
  if (pendientes.length === 0) {
    console.log('\n✔ No hay nada nuevo que publicar.\n');
    return;
  }

  // Paso 2 (escritura): tema.
  let temaId = temaExistente?.id as string | undefined;
  if (!temaId) {
    const { data, error } = await supabase
      .from('temas')
      .insert({ nombre: pub.tema.nombre, slug: pub.tema.slug, materia_id: materia.id, ...(pub.tema.orden !== null ? { orden: pub.tema.orden } : {}) })
      .select('id')
      .single();
    if (error || !data) salir(`No se pudo crear el tema: ${error?.message}`);
    temaId = data.id as string;
    console.log(`✔ Tema creado: ${pub.tema.nombre}`);
  }

  // Paso 3 (escritura): submódulo al final de los hijos del módulo padre.
  if (!submoduloId) {
    const { data: ultimo } = await supabase
      .from('modulos_curso')
      .select('orden')
      .eq('parent_id', padre.id)
      .order('orden', { ascending: false })
      .limit(1)
      .maybeSingle();
    const { data, error } = await supabase
      .from('modulos_curso')
      .insert({ curso_id: curso.id, parent_id: padre.id, titulo: pub.submoduloTitulo, orden: (ultimo?.orden || 0) + 1 })
      .select('id')
      .single();
    if (error || !data) salir(`No se pudo crear el submódulo: ${error?.message}`);
    submoduloId = data.id as string;
    console.log(`✔ Submódulo creado: ${padre.titulo} › ${pub.submoduloTitulo}`);
  }

  const { data: ultimoContenido } = await supabase
    .from('contenido_modulos')
    .select('orden')
    .eq('modulo_id', submoduloId)
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle();
  let orden = ultimoContenido?.orden || 0;

  // Paso 4: un bloque a la vez. Cápsula y, justo después, su práctica.
  const completados: number[] = [];
  for (const [indice, bloque] of pendientes.entries()) {
    const creado: CreadoEnBloque = { contenidoIds: [], leccionIds: [], simuladorId: null, preguntaIds: [] };

    const fallar = async (paso: string, mensaje: string | undefined): Promise<never> => {
      const sinDeshacer = await deshacerBloque(supabase, creado);
      salir(
        `Bloque ${bloque.numero} falló al ${paso}: ${mensaje || 'error desconocido'}.\n` +
          (sinDeshacer.length
            ? `  ⚠️ No se pudo deshacer por completo; revisa a mano:\n    - ${sinDeshacer.join('\n    - ')}\n`
            : '  Se deshizo todo lo de este bloque.\n') +
          (completados.length ? `  Bloques publicados en esta corrida: ${completados.join(', ')}.\n` : '') +
          '  Vuelve a ejecutar el mismo comando: los bloques ya publicados se omiten.'
      );
    };

    const agregarAlSubmodulo = async (leccionId: string, paso: string) => {
      const { data, error } = await supabase
        .from('contenido_modulos')
        .insert({ modulo_id: submoduloId, leccion_id: leccionId, orden: orden + 1, is_preview: false })
        .select('id')
        .single();
      if (error || !data) await fallar(paso, error?.message);
      creado.contenidoIds.push(data!.id);
      orden += 1;
    };

    // 4a. Cápsula de teoría.
    const { data: capsula, error: errorCapsula } = await supabase
      .from('banco_lecciones')
      .insert({
        tipo: 'texto',
        titulo_interno: bloque.tituloCapsula,
        contenido_html: bloque.markdown,
        video_url: bloque.videoUrl,
        tema_id: temaId,
      })
      .select('id')
      .single();
    if (errorCapsula || !capsula) await fallar('crear la cápsula de teoría', errorCapsula?.message);
    creado.leccionIds.push(capsula!.id);
    await agregarAlSubmodulo(capsula!.id, 'agregar la cápsula al submódulo');

    // 4b. Práctica: preguntas → simulador → vínculos → lección → submódulo.
    if (bloque.preguntas.length) {
      const filas = bloque.preguntas.map(({ tema: _tema, ...pregunta }) => ({ ...pregunta, tema_id: temaId }));
      const { data: insertadas, error: errorPreguntas } = await supabase.from('preguntas').insert(filas).select('id');
      if (errorPreguntas || !insertadas) await fallar('insertar las preguntas', errorPreguntas?.message);
      creado.preguntaIds = insertadas!.map((fila) => fila.id as number);

      let slug = '';
      try {
        slug = await slugLibre(supabase, bloque.tituloSimulador!);
      } catch (error) {
        await fallar('calcular el slug del simulador', error instanceof Error ? error.message : String(error));
      }

      const { data: sim, error: errorSim } = await supabase
        .from('simuladores')
        .insert({
          nombre: bloque.tituloSimulador,
          slug,
          institucion: pub.institucion,
          materia_id: materia.id,
          materia: materia.nombre,
          publico: pub.publico,
          es_pago: false,
          is_deleted: false,
        })
        .select('id')
        .single();
      if (errorSim || !sim) await fallar('crear el simulador', errorSim?.message);
      creado.simuladorId = sim!.id;

      const vinculos = creado.preguntaIds.map((preguntaId, i) => ({ simulador_id: sim!.id, pregunta_id: preguntaId, orden: i + 1 }));
      const { error: errorVinculos } = await supabase.from('simulador_preguntas').insert(vinculos);
      if (errorVinculos) await fallar('vincular las preguntas', errorVinculos.message);

      const { data: leccionSim, error: errorLeccionSim } = await supabase
        .from('banco_lecciones')
        .insert({ tipo: 'simulador', titulo_interno: bloque.tituloLeccionSimulador, simulador_id: sim!.id, tema_id: temaId })
        .select('id')
        .single();
      if (errorLeccionSim || !leccionSim) await fallar('crear la lección del simulador', errorLeccionSim?.message);
      creado.leccionIds.push(leccionSim!.id);
      await agregarAlSubmodulo(leccionSim!.id, 'agregar la práctica al submódulo');

      console.log(`✔ Bloque ${bloque.numero}: cápsula + práctica → /simulador/${slug} (${bloque.preguntas.length} preguntas)`);
    } else {
      console.log(`✔ Bloque ${bloque.numero}: cápsula de teoría`);
    }

    completados.push(bloque.numero);
    if (indice < pendientes.length - 1 && pausaMs) await esperar(pausaMs);
  }

  console.log(`\n✔ Publicado: ${completados.length} bloque(s) en ${curso.nombre} › ${padre.titulo} › ${pub.submoduloTitulo}.\n`);
}

ejecutar(main);

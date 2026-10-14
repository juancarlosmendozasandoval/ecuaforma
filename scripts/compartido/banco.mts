/**
 * Utilidades comunes de los scripts de carga (inyectar_banco, publicar_tema):
 * validación de preguntas, lectura de JSON, conexión con la service role y salida de errores.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Opcion = { type: 'text' | 'image'; value: string };

export type PreguntaLista = {
  pregunta: string;
  opciones: Opcion[];
  respuesta: Opcion;
  feedback: string | null;
  pregunta_img_url: string | null;
  youtube_url: string | null;
  tema: string | null;
};

export const LETRAS = ['A', 'B', 'C', 'D', 'E', 'F'];
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function slugify(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function esUrl(valor: string) {
  return /^https?:\/\/\S+$/i.test(valor);
}

export function textoOpcional(valor: unknown) {
  return typeof valor === 'string' && valor.trim() ? valor.trim() : null;
}

/** Error esperado: se imprime sin stack. */
export class ErrorSalida extends Error {}

// process.exit() con sockets de fetch abiertos hace fallar a Node en Windows (UV_HANDLE_CLOSING).
export function salir(mensaje: string): never {
  throw new ErrorSalida(mensaje);
}

export const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

/** Escapa % y _ para usar el texto literal dentro de un LIKE. */
export const literalLike = (texto: string) => texto.replace(/[\\%_]/g, (c) => `\\${c}`);

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

/**
 * Devuelve la pregunta lista para insertar, o los errores encontrados.
 * `etiqueta` encabeza cada mensaje (ej. "Pregunta #3" o "Bloque 2 · pregunta #3").
 */
export function validarPregunta(cruda: unknown, etiqueta: string): { ok: PreguntaLista } | { errores: string[] } {
  const errores: string[] = [];
  const p = (cruda && typeof cruda === 'object' ? cruda : {}) as Record<string, unknown>;

  const enunciado = textoOpcional(p.enunciado);
  if (!enunciado) errores.push(`${etiqueta}: falta "enunciado".`);

  const opcionesCrudas = Array.isArray(p.opciones) ? p.opciones : [];
  const opciones = opcionesCrudas.map(normalizarOpcion);
  if (opcionesCrudas.length < 2 || opcionesCrudas.length > LETRAS.length) {
    errores.push(`${etiqueta}: "opciones" debe tener entre 2 y ${LETRAS.length} elementos.`);
  }
  if (opciones.some((opcion) => !opcion)) errores.push(`${etiqueta}: hay opciones vacías o con formato inválido.`);
  const validas = opciones.filter((opcion): opcion is Opcion => !!opcion);
  if (new Set(validas.map((opcion) => opcion.value)).size !== validas.length) {
    errores.push(`${etiqueta}: hay opciones repetidas.`);
  }

  let respuesta: Opcion | undefined;
  const respuestaCruda = normalizarOpcion(p.respuesta);
  if (respuestaCruda) {
    respuesta = validas.find((opcion) => opcion.value === respuestaCruda.value);
    const indiceLetra = LETRAS.indexOf(respuestaCruda.value.toUpperCase());
    if (!respuesta && respuestaCruda.value.length === 1 && indiceLetra >= 0) respuesta = validas[indiceLetra];
  }
  if (!respuesta) {
    errores.push(`${etiqueta}: "respuesta" debe ser el texto exacto de una opción o su letra (A-${LETRAS[validas.length - 1] || 'D'}).`);
  }

  const imagen = textoOpcional(p.imagen_url);
  if (imagen && !esUrl(imagen)) errores.push(`${etiqueta}: "imagen_url" no es una URL http(s).`);
  const youtube = textoOpcional(p.youtube_url);
  if (youtube && !esUrl(youtube)) errores.push(`${etiqueta}: "youtube_url" no es una URL http(s).`);

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

/** Lee un JSON relativo al directorio actual, tolerando BOM. */
export function leerJson(archivo: string): unknown {
  const ruta = resolve(process.cwd(), archivo);
  if (!existsSync(ruta)) salir(`No existe el archivo ${ruta}`);
  try {
    return JSON.parse(readFileSync(ruta, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    salir(`El archivo no es JSON válido: ${error instanceof Error ? error.message : error}`);
  }
}

/** Cliente con la service role de .env.local: solo para uso local del admin. */
export function conectarSupabase(): SupabaseClient {
  if (existsSync('.env.local')) process.loadEnvFile('.env.local');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const llave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !llave) salir('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local.');
  return createClient(url, llave, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Ejecuta `main` e imprime los errores esperados sin stack; termina con código 1 si falla. */
export function ejecutar(main: () => Promise<void>) {
  main().catch((error) => {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error(`\n✖ ${mensaje}\n`);
    if (!(error instanceof ErrorSalida) && error instanceof Error && error.stack) console.error(error.stack);
    process.exitCode = 1;
  });
}

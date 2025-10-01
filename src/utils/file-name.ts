// src/utils/file-name.ts

/**
 * Obtiene el nombre base a partir del nombre de un archivo.
 *
 * Se eliminan rutas y la extensión final, manteniendo el resto del nombre tal
 * como fue escrito en el archivo original. Si el nombre no contiene
 * información útil, se retorna una cadena vacía para que quien lo utilice
 * defina el valor por defecto apropiado.
 */
export function getFileNameWithoutExtension(fileName: string): string {
  if (!fileName) return '';
  const trimmed = fileName.trim();
  if (!trimmed) return '';
  const segments = trimmed.split(/[\\/]/);
  const lastSegment = segments.at(-1) ?? '';
  if (!lastSegment) return '';
  const withoutExtension = lastSegment.replace(/\.[^.]+$/, '');
  return withoutExtension.trim();
}
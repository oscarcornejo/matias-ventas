/**
 * Redimensiona y comprime una imagen en el navegador antes de subirla.
 *
 * Se hace aquí y no en el servidor por dos razones: Matías sube desde el colegio
 * con mala señal y mandar 4 MB sería lento, y así el servidor no necesita depender
 * de una librería nativa de imágenes para funcionar.
 */

const MAX_SIDE = 1000;
const QUALITY = 0.82;

export interface PreparedImage {
  type: string;
  /** Contenido en base64, sin el prefijo "data:". */
  data: string;
  bytes: number;
}

export class ImageError extends Error {}

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith('image/')) {
    throw new ImageError('Ese archivo no es una imagen.');
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new ImageError('No pudimos leer esa imagen. Prueba con otra.');
  });

  const escala = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const ancho = Math.max(1, Math.round(bitmap.width * escala));
  const alto = Math.max(1, Math.round(bitmap.height * escala));

  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new ImageError('Tu navegador no pudo procesar la imagen.');
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  bitmap.close();

  // WebP pesa bastante menos; si el navegador no lo soporta, cae a JPEG.
  const webp = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', QUALITY));
  const final =
    webp ?? (await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY)));
  if (!final) throw new ImageError('No pudimos preparar la imagen. Inténtalo de nuevo.');

  const buffer = await final.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binario = '';
  for (let i = 0; i < bytes.length; i += 1) binario += String.fromCharCode(bytes[i] as number);

  return { type: final.type, data: btoa(binario), bytes: final.size };
}

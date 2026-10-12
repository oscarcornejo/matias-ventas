import { useEffect, useRef, useState } from 'react';
import { api, ApiError } from '../../api/client';
import { ImageError, prepareImage } from '../../lib/image';
import { imageUrl } from '../../../shared/products';
import { Icon } from '../Icon/Icon';
import styles from './ImageManager.module.scss';

export const MAX_IMAGES = 8;

/**
 * Galería de fotos de un producto o de un combo.
 *
 * Acepta varios archivos de una vez y desde cualquier dispositivo: no se fuerza
 * la cámara. Cada foto se redimensiona en el navegador antes de subirla.
 */
export function ImageManager({
  kind,
  itemId,
  images,
  onChanged,
}: {
  kind: 'producto' | 'combo';
  itemId: string;
  images: string[];
  onChanged: () => Promise<void>;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /**
   * Vistas previas locales de lo que se está subiendo en este momento.
   *
   * Se dibujan de inmediato con la imagen del propio archivo, sin esperar al
   * servidor: con mala señal una foto puede tardar varios segundos y, sin esto,
   * el administrador no veía nada de lo que acababa de elegir.
   */
  const [subiendo, setSubiendo] = useState<{ url: string; nombre: string }[]>([]);
  const lleno = images.length + subiendo.length >= MAX_IMAGES;

  // Las URL locales ocupan memoria hasta que se liberan.
  useEffect(() => {
    return () => subiendo.forEach((p) => URL.revokeObjectURL(p.url));
  }, [subiendo]);

  async function subir(files: File[]) {
    setBusy(true);
    setError(null);

    const cupo = MAX_IMAGES - images.length;
    const aSubir = files.slice(0, cupo);
    const previas = aSubir.map((file) => ({ url: URL.createObjectURL(file), nombre: file.name }));
    setSubiendo(previas);

    try {
      for (const file of aSubir) {
        const lista = await prepareImage(file);
        await api.uploadImage(kind, itemId, lista.type, lista.data);
      }
      if (files.length > cupo) setError(`Solo caben ${MAX_IMAGES} fotos: se subieron las primeras.`);
      await onChanged();
    } catch (err) {
      if (err instanceof ImageError || err instanceof ApiError) setError(err.message);
      else setError('No pudimos subir la foto. Inténtalo de nuevo.');
    } finally {
      previas.forEach((p) => URL.revokeObjectURL(p.url));
      setSubiendo([]);
      setBusy(false);
    }
  }

  async function accion(hacer: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await hacer();
      await onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Algo salió mal.');
    } finally {
      setBusy(false);
    }
  }

  function moverFoto(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= images.length) return;
    const copia = [...images];
    const [sacada] = copia.splice(desde, 1);
    if (!sacada) return;
    copia.splice(hasta, 0, sacada);
    void accion(() => api.reorderImages(copia));
  }

  return (
    <div className={styles.galeria}>
      <p className={styles.titulo}>
        Fotos{' '}
        <span className={styles.cuenta}>
          {images.length} de {MAX_IMAGES}
        </span>
      </p>
      {images.length > 0 && <p className={styles.ayuda}>La primera es la que se ve en la tienda.</p>}

      {(images.length > 0 || subiendo.length > 0) && (
        <ul role="list" className={styles.tiras}>
          {images.map((id, index) => (
            <li key={id} className={styles.tira}>
              <img src={imageUrl(id)} alt="" className={styles.miniatura} />
              {index === 0 && <span className={styles.principal}>Principal</span>}

              <div className={styles.controles}>
                <button
                  type="button"
                  className={styles.control}
                  disabled={busy || index === 0}
                  onClick={() => moverFoto(index, index - 1)}
                >
                  <Icon name="subir" size={14} />
                  <span className="visually-hidden">Adelantar foto {index + 1}</span>
                </button>
                <button
                  type="button"
                  className={styles.control}
                  disabled={busy || index === images.length - 1}
                  onClick={() => moverFoto(index, index + 1)}
                >
                  <Icon name="bajar" size={14} />
                  <span className="visually-hidden">Atrasar foto {index + 1}</span>
                </button>
                <button
                  type="button"
                  className={styles.control}
                  disabled={busy}
                  onClick={() => void accion(() => api.deleteImage(id))}
                >
                  <Icon name="basurero" size={14} />
                  <span className="visually-hidden">Quitar foto {index + 1}</span>
                </button>
              </div>
            </li>
          ))}

          {/* Lo que se está subiendo ahora, con la foto real ya a la vista. */}
          {subiendo.map((previa) => (
            <li key={previa.url} className={styles.tira} data-subiendo="true">
              <img src={previa.url} alt="" className={styles.miniatura} />
              <span className={styles.subiendoAviso}>
                <span className={styles.puntos} aria-hidden="true" />
                Subiendo
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="visually-hidden" role="status" aria-live="polite">
        {subiendo.length > 0 ? `Subiendo ${subiendo.length} ${subiendo.length === 1 ? 'foto' : 'fotos'}…` : ''}
      </p>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="visually-hidden"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          // Se copian los archivos ANTES de limpiar el campo. `e.target.files` es
          // una referencia viva: al poner value = '' esa misma lista queda vacía,
          // así que leerla después daba cero archivos y la subida no ocurría nunca,
          // en silencio y sin error.
          const files = [...(e.target.files ?? [])];
          e.target.value = '';
          if (files.length > 0) void subir(files);
        }}
      />
      <button
        type="button"
        className={styles.subir}
        disabled={busy || lleno}
        onClick={() => fileRef.current?.click()}
      >
        <Icon name="mas" size={16} />
        {busy ? 'Subiendo…' : lleno ? `Máximo ${MAX_IMAGES} fotos` : 'Agregar fotos'}
      </button>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

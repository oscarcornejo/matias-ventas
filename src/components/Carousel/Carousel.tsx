import { useEffect, useId, useRef, useState } from 'react';
import { Icon } from '../Icon/Icon';
import { imageUrl } from '../../../shared/products';
import styles from './Carousel.module.scss';

/**
 * Carrusel de fotos de un producto o combo.
 *
 * Se desplaza con scroll nativo y `scroll-snap`: así el gesto táctil es el del
 * sistema, no uno reimplementado con eventos de puntero, que es donde los
 * carruseles suelen fallar en el celular. Las flechas y los puntos son para
 * mouse y teclado.
 */
export function Carousel({ images, label }: { images: string[]; label: string }) {
  const pistaRef = useRef<HTMLUListElement>(null);
  const [actual, setActual] = useState(0);
  const id = useId();

  // La foto visible se deduce del scroll real, no de un estado que haya que
  // mantener sincronizado a mano.
  useEffect(() => {
    const pista = pistaRef.current;
    if (!pista) return;
    const onScroll = () => {
      const indice = Math.round(pista.scrollLeft / pista.clientWidth);
      setActual(Math.min(images.length - 1, Math.max(0, indice)));
    };
    pista.addEventListener('scroll', onScroll, { passive: true });
    return () => pista.removeEventListener('scroll', onScroll);
  }, [images.length]);

  function irA(indice: number) {
    const pista = pistaRef.current;
    if (!pista) return;
    pista.scrollTo({ left: indice * pista.clientWidth, behavior: 'smooth' });
  }

  if (images.length === 0) return null;

  return (
    <div className={styles.carousel} role="group" aria-roledescription="carrusel" aria-label={`Fotos de ${label}`}>
      <ul ref={pistaRef} className={styles.pista} role="list">
        {images.map((imageId, indice) => (
          <li key={imageId} className={styles.slide}>
            <img
              src={imageUrl(imageId)}
              alt={`${label}, foto ${indice + 1} de ${images.length}`}
              className={styles.foto}
              loading={indice === 0 ? 'eager' : 'lazy'}
              decoding="async"
            />
          </li>
        ))}
      </ul>

      {images.length > 1 && (
        <>
          <button
            type="button"
            className={`${styles.flecha} ${styles.anterior}`}
            onClick={() => irA(Math.max(0, actual - 1))}
            disabled={actual === 0}
          >
            <Icon name="flecha" size={20} />
            <span className="visually-hidden">Foto anterior</span>
          </button>

          <button
            type="button"
            className={`${styles.flecha} ${styles.siguiente}`}
            onClick={() => irA(Math.min(images.length - 1, actual + 1))}
            disabled={actual === images.length - 1}
          >
            <Icon name="flecha" size={20} />
            <span className="visually-hidden">Foto siguiente</span>
          </button>

          <ul className={styles.puntos} role="list">
            {images.map((imageId, indice) => (
              <li key={imageId}>
                <button
                  type="button"
                  className={styles.punto}
                  aria-current={indice === actual ? 'true' : undefined}
                  aria-controls={id}
                  onClick={() => irA(indice)}
                >
                  <span className="visually-hidden">Ir a la foto {indice + 1}</span>
                </button>
              </li>
            ))}
          </ul>

          <p className="visually-hidden" role="status" aria-live="polite">
            Foto {actual + 1} de {images.length}
          </p>
        </>
      )}
    </div>
  );
}

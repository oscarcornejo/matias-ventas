import { useRef, useState, type ReactNode } from 'react';
import { Icon } from '../Icon/Icon';
import styles from './Reorderable.module.scss';

/**
 * Lista reordenable por arrastre.
 *
 * El arrastre nunca es el único camino: cada fila trae botones de subir y bajar.
 * Arrastrar no funciona con teclado ni con lectores de pantalla, y dejar el orden
 * del catálogo detrás de un gesto exclusivo del mouse dejaría fuera a quien no
 * puede hacerlo.
 *
 * Los ítems se identifican por su id: lo que viaja al servidor es la lista de ids
 * en su nuevo orden, así que reordenar nunca pierde la referencia de cada cosa.
 */
export function Reorderable<T extends { id: string }>({
  items,
  onReorder,
  disabled,
  children,
}: {
  items: T[];
  onReorder: (idsOrdenados: string[]) => void;
  disabled?: boolean;
  children: (item: T, index: number) => ReactNode;
}) {
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [encima, setEncima] = useState<string | null>(null);
  const anuncio = useRef<HTMLParagraphElement>(null);

  function mover(desde: number, hasta: number) {
    if (hasta < 0 || hasta >= items.length || desde === hasta) return;
    const copia = [...items];
    const [sacado] = copia.splice(desde, 1);
    if (!sacado) return;
    copia.splice(hasta, 0, sacado);
    onReorder(copia.map((item) => item.id));
    if (anuncio.current) {
      anuncio.current.textContent = `Movido a la posición ${hasta + 1} de ${items.length}.`;
    }
  }

  return (
    <>
      <ul role="list" className={styles.lista}>
        {items.map((item, index) => (
          <li
            key={item.id}
            className={styles.fila}
            data-arrastrando={arrastrando === item.id ? 'true' : undefined}
            data-encima={encima === item.id && arrastrando !== item.id ? 'true' : undefined}
            draggable={!disabled}
            onDragStart={(e) => {
              setArrastrando(item.id);
              e.dataTransfer.effectAllowed = 'move';
              // Firefox no inicia el arrastre si no se escriben datos.
              e.dataTransfer.setData('text/plain', item.id);
            }}
            onDragEnd={() => {
              setArrastrando(null);
              setEncima(null);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = 'move';
              setEncima(item.id);
            }}
            onDragLeave={() => setEncima((actual) => (actual === item.id ? null : actual))}
            onDrop={(e) => {
              e.preventDefault();
              const origen = items.findIndex((x) => x.id === e.dataTransfer.getData('text/plain'));
              if (origen >= 0) mover(origen, index);
              setArrastrando(null);
              setEncima(null);
            }}
          >
            <div className={styles.asa} aria-hidden="true">
              <Icon name="mover" size={18} />
            </div>

            <div className={styles.contenido}>{children(item, index)}</div>

            {/* El camino accesible: sin esto el orden sería exclusivo del mouse. */}
            <div className={styles.flechas}>
              <button
                type="button"
                className={styles.flecha}
                disabled={disabled || index === 0}
                onClick={() => mover(index, index - 1)}
              >
                <Icon name="subir" size={16} />
                <span className="visually-hidden">
                  Subir, posición {index + 1} de {items.length}
                </span>
              </button>
              <button
                type="button"
                className={styles.flecha}
                disabled={disabled || index === items.length - 1}
                onClick={() => mover(index, index + 1)}
              >
                <Icon name="bajar" size={16} />
                <span className="visually-hidden">
                  Bajar, posición {index + 1} de {items.length}
                </span>
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p ref={anuncio} className="visually-hidden" role="status" aria-live="polite" />
    </>
  );
}

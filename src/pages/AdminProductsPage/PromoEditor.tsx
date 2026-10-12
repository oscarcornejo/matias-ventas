/**
 * Fila y formulario de los combos, dentro de la sección de Productos.
 *
 * Antes esto era una página aparte en /admin/promociones. Se unió a Productos
 * porque en la tienda los combos aparecen mezclados con los productos: tenerlos
 * en dos listas separadas obligaba a administrar un orden que no se podía ver.
 */
import { useState, type FormEvent } from 'react';
import { api, ApiError, type PromoInput } from '../../api/client';
import { formatCLP } from '../../../shared/format';
import {
  MAX_PRODUCT_NAME,
  describePromo,
  savings,
  type AdminProduct,
  type AdminPromo,
} from '../../../shared/products';
import { Icon } from '../../components/Icon/Icon';
import { ImageManager } from '../../components/ImageManager/ImageManager';
import styles from './AdminPromosPage.module.scss';

const EMOJIS = ['🎁', '🍬', '🎉', '⭐️', '🧃', '🍫'];

export function PromoRow({
  promo,
  onEdit,
  onChanged,
}: {
  promo: AdminPromo;
  onEdit: () => void;
  onChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const ahorro = savings(promo);

  async function cambiarVisibilidad(visible: boolean) {
    setBusy(true);
    try {
      await api.updatePromo(promo.id, { visible });
      await onChanged();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.row} data-oculto={promo.visible ? undefined : 'true'}>
      <div className={styles.rowHead}>
        <span className={styles.thumb}>
          {promo.images[0] ? (
            <img src={`/api/imagenes/${promo.images[0]}`} alt="" className={styles.thumbImg} />
          ) : (
            <span aria-hidden="true">{promo.emoji}</span>
          )}
        </span>

        <div className={styles.rowInfo}>
          <p className={styles.rowName}>{promo.name}</p>
          <p className={styles.rowContents}>{describePromo(promo)}</p>
          <p className={styles.rowPrice}>
            {formatCLP(promo.price)}
            {ahorro > 0 && <span className={styles.rowSavings}>ahorra {formatCLP(ahorro)}</span>}
          </p>
        </div>

        {/* En la misma línea que el nombre: una fila por combo, no una pila. */}
        <div className={styles.rowActions}>
          <button type="button" className={styles.secondary} onClick={onEdit} disabled={busy}>
            Editar
            <span className="visually-hidden"> {promo.name}</span>
          </button>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={promo.visible}
              disabled={busy}
              onChange={(e) => void cambiarVisibilidad(e.target.checked)}
            />
            <span>{promo.visible ? 'Visible' : 'Oculto'}</span>
          </label>
        </div>
      </div>

      {/* Un combo con productos ocultos no se puede vender, aunque esté visible. */}
      {!promo.sellable && (
        <p className={styles.bloqueado} role="note">
          No se está vendiendo:{' '}
          {promo.hiddenProducts.length > 0
            ? `${promo.hiddenProducts.join(' y ')} ${promo.hiddenProducts.length === 1 ? 'está oculto' : 'están ocultos'}.`
            : 'el combo no tiene productos.'}
        </p>
      )}

      <ImageManager kind="combo" itemId={promo.id} images={promo.images} onChanged={onChanged} />
    </div>
  );
}

interface Linea {
  productId: string;
  quantity: number;
}

export function PromoForm({
  products,
  promo,
  onDone,
  onCancel,
}: {
  products: AdminProduct[];
  promo: AdminPromo | null;
  onDone: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(promo?.name ?? '');
  const [price, setPrice] = useState(promo ? String(promo.price) : '');
  const [emoji, setEmoji] = useState(promo?.emoji ?? (EMOJIS[0] as string));
  const [lineas, setLineas] = useState<Linea[]>(
    promo ? promo.items.map((item) => ({ productId: item.productId, quantity: item.quantity })) : [],
  );
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const disponibles = products.filter((p) => !lineas.some((l) => l.productId === p.id));
  const sumaNormal = lineas.reduce((sum, linea) => {
    const producto = products.find((p) => p.id === linea.productId);
    return sum + (producto?.price ?? 0) * linea.quantity;
  }, 0);
  const precioNumero = Number(price);
  const ahorro = Number.isInteger(precioNumero) ? Math.max(0, sumaNormal - precioNumero) : 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (lineas.length === 0) {
      setError('Agrega al menos un producto al combo.');
      return;
    }
    if (!Number.isInteger(precioNumero) || precioNumero < 1) {
      setError('El precio debe ser un número entero de pesos, mayor que cero.');
      return;
    }

    const datos: PromoInput = { name: name.trim(), price: precioNumero, emoji, items: lineas };
    setSaving(true);
    try {
      if (promo) await api.updatePromo(promo.id, datos);
      else await api.createPromo(datos);
      await onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos guardar el combo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label={promo ? `Editar ${promo.name}` : 'Nuevo combo'}>
      <div className={styles.field}>
        <label htmlFor="combo-nombre">Nombre del combo</label>
        <input
          id="combo-nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={MAX_PRODUCT_NAME}
          placeholder="Combo recreo"
        />
      </div>

      <fieldset className={styles.emojis}>
        <legend>Dibujo del combo</legend>
        {EMOJIS.map((option) => (
          <label key={option} className={styles.emojiOption}>
            <input
              type="radio"
              name="emoji-combo"
              value={option}
              checked={emoji === option}
              onChange={() => setEmoji(option)}
            />
            <span aria-hidden="true">{option}</span>
            <span className="visually-hidden">{option}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className={styles.lineas}>
        <legend>Qué lleva</legend>

        {lineas.length === 0 && <p className={styles.sinLineas}>Todavía no agregas productos.</p>}

        <ul role="list" className={styles.lineaList}>
          {lineas.map((linea) => {
            const producto = products.find((p) => p.id === linea.productId);
            if (!producto) return null;
            return (
              <li key={linea.productId} className={styles.linea}>
                <span className={styles.lineaNombre}>
                  <span aria-hidden="true">{producto.emoji}</span> {producto.name}
                  {!producto.visible && <span className={styles.ocultoTag}>oculto</span>}
                </span>

                <label className={styles.lineaCantidad}>
                  <span className="visually-hidden">Cantidad de {producto.name}</span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    step={1}
                    value={linea.quantity}
                    onChange={(e) =>
                      setLineas((prev) =>
                        prev.map((l) =>
                          l.productId === linea.productId
                            ? { ...l, quantity: Math.max(1, Number(e.target.value) || 1) }
                            : l,
                        ),
                      )
                    }
                  />
                </label>

                <button
                  type="button"
                  className={styles.quitar}
                  onClick={() => setLineas((prev) => prev.filter((l) => l.productId !== linea.productId))}
                >
                  <Icon name="cerrar" size={16} />
                  <span className="visually-hidden">Quitar {producto.name} del combo</span>
                </button>
              </li>
            );
          })}
        </ul>

        {disponibles.length > 0 && (
          <label className={styles.agregar}>
            <span className="visually-hidden">Agregar un producto al combo</span>
            <select
              value=""
              onChange={(e) => {
                if (!e.target.value) return;
                setLineas((prev) => [...prev, { productId: e.target.value, quantity: 1 }]);
              }}
            >
              <option value="">+ Agregar producto…</option>
              {disponibles.map((producto) => (
                <option key={producto.id} value={producto.id}>
                  {producto.emoji} {producto.name} — {formatCLP(producto.price)}
                </option>
              ))}
            </select>
          </label>
        )}
      </fieldset>

      <div className={styles.cuenta}>
        <p>
          Suma normal <strong>{formatCLP(sumaNormal)}</strong>
        </p>
        <div className={styles.field}>
          <label htmlFor="combo-precio">Precio del combo</label>
          <input
            id="combo-precio"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
        <p className={ahorro > 0 ? styles.ahorro : styles.sinAhorro}>
          {ahorro > 0
            ? `Ahorro para quien compra: ${formatCLP(ahorro)}`
            : 'Con este precio el combo no sale más barato que comprar por separado.'}
        </p>
      </div>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={saving}>
          {saving ? 'Guardando…' : promo ? 'Guardar cambios' : 'Crear combo'}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

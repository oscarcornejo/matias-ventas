import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { api, ApiError } from '../../api/client';
import { ImageError, prepareImage } from '../../lib/image';
import { formatCLP } from '../../../shared/format';
import { MAX_PRODUCT_NAME, productImageUrl, type AdminProduct } from '../../../shared/products';
import { Loading } from '../../components/Loading/Loading';
import { Icon } from '../../components/Icon/Icon';
import styles from './AdminProductsPage.module.scss';

/** Emojis de dulces para usar mientras el producto no tiene foto. */
const EMOJIS = ['🍪', '🍬', '🍫', '🍭', '🧁', '🍩', '🍰', '🍿', '🥤', '🍌'];

export function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const { products: list } = await api.adminProducts();
      setProducts(list);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar los productos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <section aria-labelledby="productos-admin-titulo" className={styles.page}>
      <h1 id="productos-admin-titulo">Productos</h1>
      <p className={styles.lead}>
        Lo que esté visible aquí es lo que ven tus compañeros en la tienda.
      </p>

      <NewProduct onCreated={cargar} />

      {loading && <Loading label="Cargando los productos…" />}
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.secondary} onClick={() => void cargar()}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && (
        <ul role="list" className={styles.list}>
          {products.map((product) => (
            <ProductRow key={product.id} product={product} onChanged={cargar} />
          ))}
        </ul>
      )}
    </section>
  );
}

function NewProduct({ onCreated }: { onCreated: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [emoji, setEmoji] = useState(EMOJIS[0] as string);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const valor = Number(price);
    if (!Number.isInteger(valor) || valor < 1) {
      setError('El precio debe ser un número entero de pesos, mayor que cero.');
      return;
    }

    setSaving(true);
    try {
      await api.createProduct({ name: name.trim(), price: valor, emoji });
      setName('');
      setPrice('');
      setOpen(false);
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear el producto.');
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button type="button" className={styles.primary} onClick={() => setOpen(true)}>
        <Icon name="mas" size={18} />
        Agregar producto
      </button>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} aria-label="Nuevo producto">
      <div className={styles.field}>
        <label htmlFor="nuevo-nombre">Nombre</label>
        <input
          id="nuevo-nombre"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={MAX_PRODUCT_NAME}
          placeholder="Super 8"
        />
      </div>

      <div className={styles.field}>
        <label htmlFor="nuevo-precio">Precio en pesos</label>
        <input
          id="nuevo-precio"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
          placeholder="500"
        />
      </div>

      <fieldset className={styles.emojis}>
        <legend>Dibujo mientras no tenga foto</legend>
        {EMOJIS.map((option) => (
          <label key={option} className={styles.emojiOption}>
            <input
              type="radio"
              name="emoji"
              value={option}
              checked={emoji === option}
              onChange={() => setEmoji(option)}
            />
            <span aria-hidden="true">{option}</span>
            <span className="visually-hidden">{option}</span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={saving}>
          {saving ? 'Creando…' : 'Crear producto'}
        </button>
        <button type="button" className={styles.secondary} onClick={() => setOpen(false)}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ProductRow({ product, onChanged }: { product: AdminProduct; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const nombreRef = useRef<HTMLInputElement>(null);
  const editarRef = useRef<HTMLButtonElement>(null);
  const imagen = productImageUrl(product);

  const [devolverFoco, setDevolverFoco] = useState(false);

  // Al abrir la edición el foco entra al primer campo.
  useEffect(() => {
    if (editando) nombreRef.current?.focus();
  }, [editando]);

  // Al cerrarla vuelve al botón que la abrió, para no perder el lugar con teclado.
  // Tiene que ser un efecto y no un callback: el botón está dentro de un bloque
  // con `hidden` mientras se edita, y enfocar algo oculto no hace nada.
  useEffect(() => {
    if (!editando && devolverFoco) {
      editarRef.current?.focus();
      setDevolverFoco(false);
    }
  }, [editando, devolverFoco]);

  function cerrarEdicion() {
    setEditando(false);
    setError(null);
    setDevolverFoco(true);
  }

  async function conAviso(accion: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await accion();
      await onChanged();
    } catch (err) {
      if (err instanceof ImageError || err instanceof ApiError) setError(err.message);
      else setError('Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={styles.row} data-oculto={product.visible ? undefined : 'true'}>
      <span className={styles.thumb}>
        {imagen ? (
          <img src={imagen} alt="" className={styles.thumbImg} />
        ) : (
          <span aria-hidden="true">{product.emoji}</span>
        )}
      </span>

      {editando ? (
        <EditProduct
          product={product}
          nombreRef={nombreRef}
          busy={busy}
          onCancel={cerrarEdicion}
          onSave={async (cambios) => {
            await conAviso(() => api.updateProduct(product.id, cambios));
            cerrarEdicion();
          }}
        />
      ) : (
        <div className={styles.rowInfo}>
          <p className={styles.rowName}>{product.name}</p>
          <p className={styles.rowPrice}>{formatCLP(product.price)}</p>
        </div>
      )}

      <div className={styles.rowActions} hidden={editando}>
        <button
          ref={editarRef}
          type="button"
          className={styles.secondary}
          disabled={busy}
          onClick={() => setEditando(true)}
        >
          Editar
          <span className="visually-hidden"> {product.name}</span>
        </button>

        {/*
          Acepta archivos desde cualquier dispositivo: no se fuerza la cámara.
          Queda fuera del árbol de accesibilidad porque el botón "Subir foto" es
          el control real; si no, un lector de pantalla anunciaría dos controles
          para la misma acción.
        */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="visually-hidden"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            if (!file) return;
            void conAviso(async () => {
              const lista = await prepareImage(file);
              await api.uploadProductImage(product.id, lista.type, lista.data);
            });
          }}
        />
        <button
          type="button"
          className={styles.secondary}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {imagen ? 'Cambiar foto' : 'Subir foto'}
        </button>

        {imagen && (
          <button
            type="button"
            className={styles.secondary}
            disabled={busy}
            onClick={() => void conAviso(() => api.deleteProductImage(product.id))}
          >
            Quitar foto
          </button>
        )}

        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={product.visible}
            disabled={busy}
            onChange={(e) =>
              void conAviso(() => api.updateProduct(product.id, { visible: e.target.checked }))
            }
          />
          <span>{product.visible ? 'Visible' : 'Oculto'}</span>
        </label>
      </div>

      {error && (
        <p className={styles.rowError} role="alert">
          {error}
        </p>
      )}
    </li>
  );
}

/** Edición de nombre y precio dentro de la misma fila: sin modal y sin cambiar de página. */
function EditProduct({
  product,
  nombreRef,
  busy,
  onCancel,
  onSave,
}: {
  product: AdminProduct;
  nombreRef: RefObject<HTMLInputElement | null>;
  busy: boolean;
  onCancel: () => void;
  onSave: (cambios: { name: string; price: number }) => Promise<void>;
}) {
  const [name, setName] = useState(product.name);
  const [price, setPrice] = useState(String(product.price));
  const [aviso, setAviso] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const limpio = name.trim();
    const valor = Number(price);

    if (!limpio) {
      setAviso('El nombre no puede quedar vacío.');
      return;
    }
    if (!Number.isInteger(valor) || valor < 1) {
      setAviso('El precio debe ser un número entero de pesos, mayor que cero.');
      return;
    }
    setAviso(null);
    await onSave({ name: limpio, price: valor });
  }

  return (
    <form className={styles.editForm} onSubmit={handleSubmit} aria-label={`Editar ${product.name}`}>
      <div className={styles.editFields}>
        <div className={styles.field}>
          <label htmlFor={`nombre-${product.id}`}>Nombre</label>
          <input
            id={`nombre-${product.id}`}
            ref={nombreRef}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={MAX_PRODUCT_NAME}
          />
        </div>

        <div className={`${styles.field} ${styles.fieldPrice}`}>
          <label htmlFor={`precio-${product.id}`}>Precio en pesos</label>
          <input
            id={`precio-${product.id}`}
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
        </div>
      </div>

      {aviso && (
        <p className={styles.formError} role="alert">
          {aviso}
        </p>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={styles.primary} disabled={busy}>
          {busy ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

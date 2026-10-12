import { useCallback, useEffect, useRef, useState, type FormEvent, type RefObject } from 'react';
import { api, ApiError } from '../../api/client';
import { formatCLP } from '../../../shared/format';
import { MAX_PRODUCT_NAME, coverUrl, type AdminProduct, type AdminPromo } from '../../../shared/products';
import { Loading } from '../../components/Loading/Loading';
import { Icon } from '../../components/Icon/Icon';
import { PromoForm, PromoRow } from './PromoEditor';
import { Reorderable } from '../../components/Reorderable/Reorderable';
import { ImageManager } from '../../components/ImageManager/ImageManager';
import styles from './AdminProductsPage.module.scss';

/** Emojis de dulces para usar mientras el producto no tiene foto. */
const EMOJIS = ['🍪', '🍬', '🍫', '🍭', '🧁', '🍩', '🍰', '🍿', '🥤', '🍌'];

/**
 * Una sola sección para todo el catálogo: productos sueltos y combos, en la misma
 * lista y con el mismo orden que verán los compradores.
 *
 * Antes eran dos páginas. Se unieron porque en la tienda aparecen mezclados, y
 * ordenarlos por separado significaba administrar a ciegas un orden combinado que
 * no se podía ver en ninguna pantalla.
 */
export function AdminCatalogPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creandoCombo, setCreandoCombo] = useState(false);
  const [editandoCombo, setEditandoCombo] = useState<AdminPromo | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [{ products: listaP }, { promos: listaC }] = await Promise.all([
        api.adminProducts(),
        api.adminPromos(),
      ]);
      setProducts(listaP);
      setPromos(listaC);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos cargar el catálogo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Una sola lista ordenada por posición: así se ve y se arrastra igual que en la tienda.
  const catalogo: (AdminProduct | AdminPromo)[] = [...products, ...promos].sort(
    (a, b) => a.position - b.position,
  );

  async function guardarOrden(ids: string[]) {
    const porId = new Map(catalogo.map((item) => [item.id, item]));
    const ordenado = ids.flatMap((id) => {
      const item = porId.get(id);
      return item ? [item] : [];
    });

    // Optimista: se reordena en pantalla y después se confirma en el servidor.
    setProducts(ordenado.filter((i): i is AdminProduct => i.kind === 'producto'));
    setPromos(ordenado.filter((i): i is AdminPromo => i.kind === 'combo'));

    await api.saveOrder(ordenado.map((item) => ({ id: item.id, kind: item.kind })));
    await cargar();
  }

  const cerrarCombo = async () => {
    setCreandoCombo(false);
    setEditandoCombo(null);
    await cargar();
  };

  return (
    <section aria-labelledby="catalogo-titulo" className={styles.page}>
      <h1 id="catalogo-titulo">Productos</h1>
      <p className={styles.lead}>
        Lo que esté visible aquí es lo que ven tus compañeros, en este mismo orden.
        Arrastra para moverlos.
      </p>

      {!creandoCombo && !editandoCombo && (
        <div className={styles.acciones}>
          <NewProduct onCreated={cargar} />
          {products.length > 0 && (
            <button type="button" className={styles.secondary} onClick={() => setCreandoCombo(true)}>
              <Icon name="mas" size={18} />
              Crear combo
            </button>
          )}
        </div>
      )}

      {(creandoCombo || editandoCombo) && (
        <PromoForm
          products={products}
          promo={editandoCombo}
          onDone={cerrarCombo}
          onCancel={() => {
            setCreandoCombo(false);
            setEditandoCombo(null);
          }}
        />
      )}

      {loading && <Loading label="Cargando el catálogo…" />}
      {error && (
        <div className={styles.error} role="alert">
          <p>{error}</p>
          <button type="button" className={styles.secondary} onClick={() => void cargar()}>
            Reintentar
          </button>
        </div>
      )}

      {!loading && !error && catalogo.length === 0 && (
        <p className={styles.empty}>Todavía no hay nada en el catálogo. Crea el primer producto.</p>
      )}

      {!loading && !error && catalogo.length > 0 && (
        <Reorderable items={catalogo} onReorder={(ids) => void guardarOrden(ids)}>
          {(item) =>
            item.kind === 'combo' ? (
              <PromoRow promo={item} onEdit={() => setEditandoCombo(item)} onChanged={cargar} />
            ) : (
              <ProductRow product={item} onChanged={cargar} />
            )
          }
        </Reorderable>
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
  const [devolverFoco, setDevolverFoco] = useState(false);
  const nombreRef = useRef<HTMLInputElement>(null);
  const editarRef = useRef<HTMLButtonElement>(null);
  const portada = coverUrl(product);

  useEffect(() => {
    if (editando) nombreRef.current?.focus();
  }, [editando]);

  // Al cerrar la edición el foco vuelve al botón que la abrió. Tiene que ser un
  // efecto: el botón está dentro de un bloque con `hidden` mientras se edita, y
  // enfocar algo oculto no hace nada.
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
      if (err instanceof ApiError) setError(err.message);
      else setError('Algo salió mal. Inténtalo de nuevo.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.row} data-oculto={product.visible ? undefined : 'true'}>
      <div className={styles.rowHead}>
        <span className={styles.thumb}>
          {portada ? (
            <img src={portada} alt="" className={styles.thumbImg} />
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
          <>
            <div className={styles.rowInfo}>
              <p className={styles.rowName}>{product.name}</p>
              <p className={styles.rowPrice}>{formatCLP(product.price)}</p>
            </div>

            {/* En la misma línea que el nombre: una fila por producto, no una pila. */}
            <div className={styles.rowActions}>
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

              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={product.visible}
                  disabled={busy}
                  onChange={(e) => void conAviso(() => api.updateProduct(product.id, { visible: e.target.checked }))}
                />
                <span>{product.visible ? 'Visible' : 'Oculto'}</span>
              </label>
            </div>
          </>
        )}
      </div>

      {!editando && (
        <ImageManager kind="producto" itemId={product.id} images={product.images} onChanged={onChanged} />
      )}

      {error && (
        <p className={styles.rowError} role="alert">
          {error}
        </p>
      )}
    </div>
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

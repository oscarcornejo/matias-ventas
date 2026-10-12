import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useSession } from '../../auth/SessionContext';
import { ApiError } from '../../api/client';
import styles from '../auth.module.scss';

const MIN_PASSWORD_LENGTH = 8;

/**
 * Decoración de la columna de marca. Son fijos a propósito: el catálogo real lo
 * administra Matías y puede cambiar, pero esta ilustración no debería depender de
 * una llamada a la API para dibujarse.
 */
const DULCES = ['🍪', '🍬', '🍫'];

export function RegisterPage() {
  const { user, loading, register } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeated, setRepeated] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);

  if (!loading && user) return <Navigate to={from} replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
      return;
    }
    if (password !== repeated) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      await register(email, password);
      // El carrito armado antes de registrarse sigue intacto: vuelve a donde estaba.
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos crear tu cuenta. Inténtalo nuevamente.');
      setSubmitting(false);
    }
  }

  const describedBy = error ? 'registro-error' : undefined;

  return (
    <div className={styles.page}>
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.emojis}>
          {DULCES.map((dulce) => (
            <span key={dulce}>{dulce}</span>
          ))}
        </div>
        <p className={styles.tagline}>Crea tu cuenta y llévate tus dulces.</p>
      </div>

      <section className={styles.panel} aria-labelledby="registro-titulo">
        <h1 id="registro-titulo">Crear cuenta</h1>
        <p className={styles.lead}>
          Necesitas una cuenta solo para comprar. Ver los productos es libre.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="registro-email">Correo electrónico</label>
            <input
              id="registro-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nombre@correo.cl"
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="registro-password">Contraseña</label>
            <input
              id="registro-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={MIN_PASSWORD_LENGTH}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'registro-error registro-ayuda' : 'registro-ayuda'}
            />
            <p id="registro-ayuda" className={styles.hint}>
              Al menos {MIN_PASSWORD_LENGTH} caracteres.
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="registro-password-2">Repetir contraseña</label>
            <input
              id="registro-password-2"
              name="passwordRepeat"
              type="password"
              autoComplete="new-password"
              required
              value={repeated}
              onChange={(event) => setRepeated(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy}
            />
          </div>

          {error && (
            <p id="registro-error" ref={errorRef} tabIndex={-1} className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Creando tu cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className={styles.alt}>
          ¿Ya tienes cuenta? <Link to="/acceso" state={{ from }}>Inicia sesión</Link>
        </p>
      </section>
    </div>
  );
}

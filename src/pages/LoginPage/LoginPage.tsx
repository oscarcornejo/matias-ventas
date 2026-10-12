import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { useSession } from '../../auth/SessionContext';
import { ApiError } from '../../api/client';
import styles from '../auth.module.scss';

/**
 * Decoración de la columna de marca. Son fijos a propósito: el catálogo real lo
 * administra Matías y puede cambiar, pero esta ilustración no debería depender de
 * una llamada a la API para dibujarse.
 */
const DULCES = ['🍪', '🍬', '🍫'];

export function LoginPage() {
  const { user, loading, login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      navigate(loggedIn.role === 'ADMIN' && from === '/' ? '/admin/compras' : from, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No pudimos iniciar sesión. Inténtalo nuevamente.');
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.hero} aria-hidden="true">
        <div className={styles.emojis}>
          {DULCES.map((dulce) => (
            <span key={dulce}>{dulce}</span>
          ))}
        </div>
        <p className={styles.tagline}>Tus dulces favoritos, a un clic.</p>
      </div>

      <section className={styles.panel} aria-labelledby="acceso-titulo">
        <h1 id="acceso-titulo">Inicia sesión</h1>
        <p className={styles.lead}>Entra con el correo y la contraseña de tu cuenta.</p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
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
              aria-describedby={error ? 'acceso-error' : undefined}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? 'acceso-error' : undefined}
            />
          </div>

          {error && (
            <p id="acceso-error" ref={errorRef} tabIndex={-1} className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>

        <p className={styles.alt}>
          ¿No tienes cuenta? <Link to="/registro" state={{ from }}>Crear cuenta</Link>
        </p>
      </section>
    </div>
  );
}

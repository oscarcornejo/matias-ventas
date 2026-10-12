import { Link } from 'react-router';
import { Icon } from '../components/Icon/Icon';
import styles from './NotFoundPage.module.scss';

export function NotFoundPage() {
  return (
    <section aria-labelledby="no-encontrada-titulo" className={styles.page}>
      <h1 id="no-encontrada-titulo">Esta página no existe</h1>
      <p className={styles.lead}>
        Puede que el enlace esté mal escrito o que la página ya no esté.
      </p>
      <Link to="/" className={styles.cta}>
        Volver a la tienda
        <Icon name="flecha" size={18} />
      </Link>
    </section>
  );
}

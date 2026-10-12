import { Outlet } from 'react-router';
import { Header } from '../Header/Header';
import styles from './Layout.module.scss';

export function Layout() {
  return (
    <>
      <a href="#contenido" className={styles.skipLink}>
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>© {new Date().getFullYear()} Mati Ventas · Precios en pesos chilenos (CLP)</p>
      </footer>
    </>
  );
}

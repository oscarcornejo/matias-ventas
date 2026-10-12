import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <section aria-labelledby="no-encontrada-titulo" style={{ textAlign: 'center', paddingBlock: '3rem' }}>
      <h1 id="no-encontrada-titulo">Página no encontrada</h1>
      <p style={{ marginBlock: '1rem' }}>La página que buscas no existe.</p>
      <Link to="/">Volver a la tienda</Link>
    </section>
  );
}

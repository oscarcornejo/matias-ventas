import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { SessionProvider } from './auth/SessionContext';
import { CatalogProvider } from './catalog/CatalogContext';
import { App } from './App';
import './styles/global.scss';

const root = document.getElementById('root');
if (!root) throw new Error('No se encontró el elemento #root');

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <SessionProvider>
        <CatalogProvider>
        <App />
        </CatalogProvider>
      </SessionProvider>
    </BrowserRouter>
  </StrictMode>,
);

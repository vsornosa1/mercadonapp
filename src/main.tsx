import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('No se encontró el elemento #root en index.html');
}

createRoot(rootElement).render(
  <StrictMode>
    <main>
      <h1>Mercadonapp</h1>
      <p>Andamiaje listo. El catálogo llega en la fase siguiente.</p>
    </main>
  </StrictMode>,
);

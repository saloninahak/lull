import { StrictMode, Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';

// fonts are self-hosted (no third-party requests). only the faces we use.
import '@fontsource/instrument-serif/400.css';
import '@fontsource-variable/geist/index.css';
import '@fontsource-variable/geist-mono/index.css';
import './styles/index.css';

import { App } from './App';

// dev-only component sheet at ?kit. dead code in production builds.
const Kit = import.meta.env.DEV ? lazy(() => import('./dev/Kit')) : null;
const showKit = Kit !== null && new URLSearchParams(window.location.search).has('kit');

const root = document.getElementById('root');
if (!root) throw new Error('missing #root');

createRoot(root).render(
  <StrictMode>
    {showKit && Kit ? (
      <Suspense fallback={null}>
        <Kit />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>,
);

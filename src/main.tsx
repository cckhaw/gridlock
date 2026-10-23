import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/fira-code/latin-400.css';
import '@fontsource/fira-code/latin-700.css';
import '@fontsource/share-tech-mono/latin-400.css';
import './index.css';
import { registerServiceWorker } from './pwa';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

registerServiceWorker();

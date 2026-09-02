/**
 * Punto de entrada del frontend.
 *
 * Toma el componente App y lo "monta" dentro del div#root de index.html.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

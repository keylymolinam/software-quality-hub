/**
 * Punto de entrada del frontend.
 *
 * Toma el componente App y lo "monta" dentro del div#root de index.html.
 *
 * El orden de los envoltorios no es casual:
 *
 *   BrowserRouter    da acceso a la direccion del navegador. Va mas afuera para
 *                    que cualquier componente pueda leerla o cambiarla.
 *   ProveedorSesion  pone a disposicion quien esta conectado. Va por fuera de
 *                    App, y no dentro, porque App mismo necesita esa
 *                    informacion para decidir si muestra el login o las rutas.
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import { ProveedorSesion } from './context/SesionContext.jsx';
import './styles/index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>
);

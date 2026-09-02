/**
 * Configuracion de Vite (la herramienta que compila y sirve el frontend).
 */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Habilita el soporte de React (sintaxis JSX, recarga en caliente).
  plugins: [react()],
  server: {
    port: 5173,
    open: true, // abre el navegador automaticamente al ejecutar "npm run dev"
  },
});

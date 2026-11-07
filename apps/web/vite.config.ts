import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// the room server (apps/server). /api goes through to it, websockets included,
// so a phone on the same wifi only needs the one address.
const rooms = {
  '/api': { target: 'http://127.0.0.1:1999', ws: true },
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true, proxy: rooms },
  preview: { port: 4173, strictPort: true, proxy: rooms },
});

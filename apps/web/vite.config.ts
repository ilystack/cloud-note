import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, '../../database/pb_public'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
  },
});

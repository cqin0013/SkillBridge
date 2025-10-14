/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';



export default defineConfig({
   base: "/",
  plugins: [react(), tailwind()],
  server: {
    proxy: {
      "/anzsco": {
        target: "https://progressive-alysia-skillbridge-437200d9.koyeb.app",
        changeOrigin: true,
        secure: true
      }
    }
  },

});
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext', 
    minify: 'esbuild',
    cssCodeSplit: true,
    // Aumentamos el límite a 1600kB, que es aceptable para aplicaciones de gestión pesadas
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // 1. Utilidades de PDF (Carga bajo demanda)
            if (id.includes('jspdf') || id.includes('html2canvas')) {
              return 'pdf-utils';
            }
            // 2. Gráficos (Carga bajo demanda)
            if (id.includes('recharts')) {
              return 'charts';
            }
            // 3. Iconos (Suelen ser muchos y pesados)
            if (id.includes('lucide-react')) {
              return 'icons';
            }
            // 4. Infraestructura de Datos (Supabase y Axios)
            if (id.includes('@supabase') || id.includes('axios')) {
              return 'services';
            }
            
            // El resto (React, TanStack, Radix) se queda en 'vendor' 
            // para evitar las dependencias circulares detectadas anteriormente.
            return 'vendor';
          }
        },
      },
    },
  },
});

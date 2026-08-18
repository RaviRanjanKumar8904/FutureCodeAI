import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // PDF & Canvas generators (dynamic on-demand)
            if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('canvg') || id.includes('dompurify')) {
              return 'vendor-pdf';
            }
            // Three.js 3D graphics
            if (id.includes('@react-three')) {
              return 'vendor-react-three';
            }
            if (id.includes('three')) {
              return 'vendor-three';
            }
            // Firebase sub-modules
            if (id.includes('@firebase/firestore') || id.includes('firebase/firestore')) {
              return 'vendor-firestore';
            }
            if (id.includes('@firebase/auth') || id.includes('firebase/auth')) {
              return 'vendor-auth';
            }
            if (id.includes('@firebase') || id.includes('firebase')) {
              return 'vendor-firebase-core';
            }
            // Charts & visualizations
            if (id.includes('recharts') || id.includes('d3-') || id.includes('victory')) {
              return 'vendor-charts';
            }
            // Animation library
            if (id.includes('framer-motion')) {
              return 'vendor-motion';
            }
            // Icons
            if (id.includes('lucide-react')) {
              return 'vendor-icons';
            }
            // CSV parsing
            if (id.includes('papaparse')) {
              return 'vendor-csv';
            }
            // Core React runtime
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router-dom/') ||
              id.includes('/react-router/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react-core';
            }
          }
        }
      }
    }
  }
})

import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
    }),
  ],
  
  // Build configuration
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'CompanyCity',
      formats: ['es', 'umd'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : format}.js`,
    },
    rollupOptions: {
      external: ['three'],
      output: {
        globals: {
          three: 'THREE',
        },
      },
    },
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },

  // Development server
  server: {
    host: true,
    port: 3000,
    open: '/demo',
  },

  // Path resolution
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@/core': resolve(__dirname, 'src/core'),
      '@/components': resolve(__dirname, 'src/components'),
      '@/systems': resolve(__dirname, 'src/systems'),
      '@/ui': resolve(__dirname, 'src/ui'),
      '@/utils': resolve(__dirname, 'src/utils'),
      '@/types': resolve(__dirname, 'src/types'),
      '@/plugins': resolve(__dirname, 'src/plugins'),
    },
  },

  // Optimizations
  optimizeDeps: {
    include: ['three'],
  },

  // Preview configuration
  preview: {
    port: 4173,
    host: true,
  },

  // Define global constants
  define: {
    __VERSION__: JSON.stringify(process.env.npm_package_version),
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
});

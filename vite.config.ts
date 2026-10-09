import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      base: mode === 'production' ? './' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
        watch: {
          // The server writes runtime data (tutors_db.json, site_content.json, saved
          // lessons …) while you use the app. Without this, every tier change,
          // password reset or registration triggered a full dev page reload.
          // Regexes are used so the match works with both / and \ path separators.
          ignored: [
            /[\\/]data[\\/]/,
            /[\\/]learners[\\/]/i,
            /[\\/]dist[\\/]/,
            /[\\/]games[\\/]/,
            /[\\/]node_modules[\\/]/,
            // Runtime stores the server rewrites in the project root
            /[\\/]tutors_db\.json$/,
            /[\\/]site_content\.json$/,
            // The preview harness writes its log files under .freebuff/, inside
            // the project root. Watching them made the page reload on every log
            // line the server printed.
            /[\\/]\.freebuff[\\/]/,
          ],
        },
      },
      plugins: [react(), tailwindcss()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
          'react': path.resolve(__dirname, 'node_modules/react'),
          'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
        },
        dedupe: ['react', 'react-dom'],
      },
      build: {
        chunkSizeWarningLimit: 12000,
        rollupOptions: {
          input: {
            main: path.resolve(__dirname, 'index.html')
          }
        }
      }
    };
});

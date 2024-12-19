import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  return defineConfig({
    plugins: [react()],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        ':bookcars-types': path.resolve(__dirname, '../packages/bookcars-types'),
        ':bookcars-helper': path.resolve(__dirname, '../packages/bookcars-helper'),
        ':disable-react-devtools': path.resolve(__dirname, '../packages/disable-react-devtools'),
        ':currency-converter': path.resolve(__dirname, '../packages/currency-converter'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: Number.parseInt(process.env.VITE_PORT || '3005', 10),
    },

    build: {
      outDir: 'build',
      target: 'esnext',
      modulePreload: true, // Keep modulePreload enabled to ensure the best performance
      sourcemap: true,
      minify: 'esbuild', // Use esbuild for fast minification
      rollupOptions: {
        treeshake: true, // Enable Tree Shaking: Ensure unused code is removed by leveraging ES modules and proper imports
      },
      assetsInlineLimit: 8192, // This reduces the number of small chunk files
    },
  })
}

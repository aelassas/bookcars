import path from 'node:path'
import { fileURLToPath } from 'node:url'

const configDir = path.dirname(fileURLToPath(import.meta.url))
import { defineConfig, loadEnv } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { createHtmlPlugin } from 'vite-plugin-html'
import babelPlugin from '@rolldown/plugin-babel'

// https://vitejs.dev/config/
export default ({ mode }: { mode: string }) => {
  process.env = { ...process.env, ...loadEnv(mode, process.cwd(), '') }

  return defineConfig({
    // Keep Vite's regenerable optimizer cache on C: so the nearly-full D: project
    // drive can still serve the app without moving source or Docker data.
    cacheDir: path.resolve(process.env.TEMP || 'C:/Temp', 'safarrent-vite-cache-frontend'),
    // Emotion's isolated entry imports this CommonJS package. Include it by its
    // package name so Vite 8/Rolldown rewrites the CJS default import to ESM.
    optimizeDeps: {
      include: [
        '@emotion/react',
        '@emotion/react/_isolated-hnrs',
        '@emotion/styled',
        'hoist-non-react-statics',
        'hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js',
      ],
      needsInterop: ['hoist-non-react-statics'],
      noDiscovery: false,
    },
    plugins: [
      {
        name: 'safarrent-emotion-hnrs-esm-compat',
        enforce: 'pre',
        transform(source, id) {
          if (!id.includes('@emotion/react/_isolated-hnrs/')) {
return null
}
          const code = source.replace(
            /from (['"])hoist-non-react-statics\1/g,
            "from '/src/utils/hoistNonReactStatics.ts'",
          )
          return code === source ? null : { code, map: null }
        },
      },
      react(),
      babelPlugin({
        plugins: [
          '@babel/plugin-transform-runtime'
        ],
        presets: [
          reactCompilerPreset()
        ],
      }),
      createHtmlPlugin({
        inject: {
          data: {
            WEBSITE_NAME: process.env.VITE_BC_WEBSITE_NAME || 'SafarRent',
          },
        },
      }),
    ],

    resolve: {
      preserveSymlinks: true,
      alias: {
        'react': path.resolve(configDir, 'node_modules/react'),
        'react-dom': path.resolve(configDir, 'node_modules/react-dom'),

        '@': path.resolve(configDir, './src'),
        ':bookcars-types': path.resolve(configDir, '../packages/bookcars-types'),
        ':bookcars-helper': path.resolve(configDir, '../packages/bookcars-helper'),
        ':disable-react-devtools': path.resolve(configDir, '../packages/disable-react-devtools'),
        ':currency-converter': path.resolve(configDir, '../packages/currency-converter'),
        ':reactjs-social-login': path.resolve(configDir, '../packages/reactjs-social-login'),
        'hoist-non-react-statics/dist/hoist-non-react-statics.cjs.js': path.resolve(configDir, './src/utils/hoistNonReactStatics.ts'),
        'hoist-non-react-statics': path.resolve(configDir, './src/utils/hoistNonReactStatics.ts'),
      },
    },

    server: {
      host: '0.0.0.0',
      port: Number.parseInt(process.env.VITE_PORT || '3002', 10),
      watch: {
        usePolling: true,
        interval: 500,
      },
      hmr: {
        protocol: 'ws',
        // Let Vite use the hostname the browser used. This keeps phone HMR on the laptop LAN IP.
        host: process.env.VITE_HMR_HOST || undefined,
        port: Number.parseInt(process.env.VITE_HMR_PORT || '8080', 10),
        clientPort: Number.parseInt(process.env.VITE_HMR_CLIENT_PORT || '8080', 10),
      },
    },

    build: {
      outDir: 'build', // Output directory
      target: 'esnext', // Use esnext to ensure the best performance
      modulePreload: true, // Keep modulePreload enabled to ensure the best performance
      sourcemap: false, // Disable sourcemaps in production
      cssCodeSplit: true, // Enable CSS code splitting

      // Minification settings (Use terser for minification with aggressive settings)
      minify: 'terser', // Can also use 'esbuild' which is faster but less optimized
      terserOptions: {
        compress: {
          drop_console: false, // Keep console.* calls
          drop_debugger: true, // Removes debugger statements
          dead_code: true, // Removes unreachable code
          passes: 3, // Number of compression passes
          unsafe_math: true, // Optimize math expressions
          conditionals: true, // Optimize if-s and conditional expressions
          sequences: true, // Join consecutive simple statements using the comma operator
          booleans: true, // various optimizations for boolean context
          unused: true, // Drop unreferenced functions and variables
          if_return: true, // Optimizations for if/return and if/continue
          join_vars: true, // Join consecutive var statements
        },
        format: {
          comments: false, // Remove comments
        },
        mangle: {
          properties: false, // Don't rename properties (safer)
        },
      },

      // Control chunk size
      chunkSizeWarningLimit: 1000, // Warn if a chunk exceeds 1000kb

      // Chunk splitting strategy
      rolldownOptions: {
        treeshake: true, // Enable Tree Shaking: Ensure unused code is removed by leveraging ES modules and proper imports
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'vendor',
                test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
                priority: 10,
              },
              {
                name: 'router',
                test: /[\\/]node_modules[\\/]react-router(-dom)?[\\/]/,
                priority: 20,
                minSize: 0,
              },
            ],
          },
          // Generate chunk names
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'chunks/[name]-[hash].js',
          entryFileNames: 'entries/[name]-[hash].js',
        },
      },
      assetsInlineLimit: 8192, // This reduces the number of small chunk files
    },
  })
}

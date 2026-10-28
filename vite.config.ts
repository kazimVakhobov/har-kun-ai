import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  /**
   * Read through `loadEnv` rather than `process.env`: Vite does not put `.env`
   * into the process environment, so a `PORT` set in that file was invisible
   * here — the backend moved and the dev proxy kept pointing at 8787.
   *
   * The prefix is `PORT` and not `''` on purpose. `''` would load every key in
   * the file, the OpenRouter one included, into this config's scope — one
   * careless `define` away from the bundle. Nothing that must not reach the
   * browser is ever read here (ADR 0002).
   */
  const { PORT } = loadEnv(mode, process.cwd(), 'PORT')
  const serverPort = PORT === undefined || PORT === '' ? '8787' : PORT

  /**
   * `--mode demo` builds the static copy for GitHub Pages: no server, the mock
   * answering in the browser (ADR 0018). A `define` rather than a `VITE_`
   * variable, so nothing in this project is read from `import.meta.env` and
   * the rule about the key stays unambiguous.
   *
   * `base: './'` so the same output works under a project path
   * (`user.github.io/har-kun-ai/`) and under a domain of its own, without
   * rebuilding for either.
   */
  const demo = mode === 'demo'

  return {
    plugins: [react()],
    base: demo ? './' : '/',
    define: { __DEMO__: JSON.stringify(demo) },
    build: demo ? { outDir: 'dist-demo', emptyOutDir: true } : {},
    server: {
      port: 5173,
      // The browser only ever talks to its own origin — the key lives on the server (ADR 0002).
      proxy: {
        '/api': {
          target: `http://localhost:${serverPort}`,
          changeOrigin: true,
        },
      },
    },
  }
})

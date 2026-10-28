import '@fontsource/unbounded/400.css'
import '@fontsource/golos-text/400.css'
import '@fontsource/golos-text/500.css'
import '@fontsource/jetbrains-mono/400.css'
import './styles/tokens.css'
import './styles/system.css'

import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'

const root = document.getElementById('root')
if (!root) throw new Error('#root not found')

/**
 * `__DEMO__` is a build-time constant, not an environment variable: the one
 * thing this project refuses to read from `import.meta.env` is a secret, and
 * the cleanest way to keep that rule unambiguous is to have no `VITE_` values
 * at all. Vite replaces it with a literal, so in the normal build the branch
 * and its dynamic import are dead code and never reach the bundle
 * ([ADR 0018](../docs/adr/0018-static-demo-build.md)).
 */
async function start(): Promise<void> {
  let banner: ReactNode = undefined

  if (__DEMO__) {
    const demo = await import('./demo/install.js')
    banner = demo.install()
  }

  createRoot(root as HTMLElement).render(
    <StrictMode>
      <App banner={banner} />
    </StrictMode>,
  )
}

void start()

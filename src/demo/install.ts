import { createElement, type ReactNode } from 'react'
import { DemoBanner } from '../components/DemoBanner.js'
import { setTransport } from '../lib/transport.js'
import { createDemoFetch } from './transport.js'

/**
 * Everything the static build adds, in one call made before the first render
 * ([ADR 0018](../../docs/adr/0018-static-demo-build.md)).
 *
 * It is imported dynamically and only under `__DEMO__`, so in the normal build
 * Rollup drops this module and everything it reaches — the mock, the demo
 * catalogue, the banner and its stylesheet. The production bundle has no idea
 * any of it exists.
 */
export function install(): ReactNode {
  setTransport(createDemoFetch())
  return createElement(DemoBanner)
}

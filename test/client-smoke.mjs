#!/usr/bin/env node
/**
 * Client-half smoke test: runs the browser bundle under a mock Cordis context
 * and a mock React, then renders the Web Chat panel and checks that the site
 * dropdown offers the four web-chat sites and that switching updates state.
 *
 * No desktop shell, no network, no React renderer: this only proves the bundle
 * parses, `apply()` registers what the shell expects, and the toolbar wiring is
 * present. The real UI is verified in the desktop app.
 */
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const pluginDir = join(here, '..', 'plugin')
const code = readFileSync(join(pluginDir, 'lib', 'client.js'), 'utf8')

const failures = []
const check = (ok, message) => {
  if (!ok) failures.push(message)
}

// ---------------------------------------------------------------- DOM + React
const fakeElement = () => ({
  setAttribute() {}, getAttribute() { return null }, appendChild() {}, remove() {},
  textContent: '', style: {}, addEventListener() {}, removeEventListener() {},
  querySelector() { return null }, querySelectorAll() { return [] }, parentElement: null,
})
globalThis.document = {
  head: { appendChild() {} },
  body: { appendChild() {} },
  documentElement: fakeElement(),
  cookie: '',
  createElement: () => fakeElement(),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
}
const React = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('Fragment'),
  useLayoutEffect: (fn) => { fn() },
  useEffect: () => {},
  useRef: (value) => ({ current: value }),
  useState: (initial) => [typeof initial === 'function' ? initial() : initial, () => {}],
  useMemo: (factory) => factory(),
  useCallback: (fn) => fn,
  useSyncExternalStore: (getSnapshot) => getSnapshot(),
}
const loaded = {}
globalThis.window = {
  addEventListener() {}, removeEventListener() {},
  __ModuleLoader__: {
    load({ id, factory }) {
      loaded.id = id
      loaded.module = factory((name) => {
        if (name === 'react') return React
        throw new Error('unexpected require: ' + name)
      })
    },
  },
}
// eslint-disable-next-line no-eval
eval(code)

check(loaded.id === 'dsh-deepseek-webchat', `bundle registered as ${String(loaded.id)}`)

// ---------------------------------------------------------------- mock ctx
const registrations = []
const applyErrors = []
const ctx = {
  effect(fn, label) {
    try {
      const dispose = fn()
      if (typeof dispose === 'function') dispose()
    } catch (error) {
      applyErrors.push(label + ': ' + String(error))
    }
  },
  slots: {
    inject(name, callback) { callback(); return () => {} },
    register(options, component) { registrations.push({ options, component }); return () => {} },
  },
  locale: { register() { return () => {} }, bind() { return (key) => key } },
  sidebarRightTabs: { register() { return () => {} } },
  sidebarRight: { openTab() {}, openTabIn() {} },
  get() { return undefined },
}
loaded.module.apply(ctx)

check(applyErrors.length === 0, 'apply() threw: ' + applyErrors.join(' | '))
const names = registrations.map((entry) => entry.options.name)
check(names.includes('sidebar.right.pane.tab'), 'missing right-sidebar tab body')
check(names.includes('sidebar.panellist'), 'missing left-sidebar panel entry')
check(names.includes('main'), 'missing main-panel door view')

const panelEntry = registrations.find((entry) => entry.options.name === 'sidebar.panellist')
check(panelEntry?.options?.id === 'deepseek-webchat', 'panel entry id is not deepseek-webchat')
check(panelEntry?.options?.order === -1, 'panel entry should be ordered first (-1)')
check(typeof panelEntry?.options?.label === 'function' && panelEntry.options.label() === 'Web Chat',
  'panel entry label is not "Web Chat"')

const doorView = registrations.find((entry) => entry.options.name === 'main')
check(doorView?.options?.key === 'deepseek-webchat', 'main door view key mismatch')

// ---------------------------------------------------------------- render panel
const body = registrations.find((entry) => entry.options.name === 'sidebar.right.pane.tab')
const findSelect = (node) => {
  if (node === null || node === undefined) return null
  if (Array.isArray(node)) {
    for (const child of node) { const hit = findSelect(child); if (hit) return hit }
    return null
  }
  if (typeof node !== 'object') return null
  if (node.type === 'select') return node
  for (const child of node.children ?? []) { const hit = findSelect(child); if (hit) return hit }
  return null
}
const flatten = (node, out = []) => {
  if (node === null || node === undefined) return out
  if (Array.isArray(node)) { for (const child of node) flatten(child, out); return out }
  if (typeof node !== 'object') return out
  if (node.type === 'option') { out.push(node); return out }
  for (const child of node.children ?? []) flatten(child, out)
  return out
}
const select = findSelect(body.component({}))
check(select !== null, 'panel has no site <select>')
if (select !== null) {
  const options = flatten(select.children).map((option) => ({
    value: option.props?.value,
    label: option.children?.[0],
  }))
  check(options.length === 4, `expected 4 site options, got ${options.length}`)
  check(JSON.stringify(options.map((option) => option.value))
    === JSON.stringify(['deepseek', 'chatgpt', 'gemini', 'claude']), 'site option ids mismatch')
  check(JSON.stringify(options.map((option) => option.label))
    === JSON.stringify(['DeepSeek', 'ChatGPT', 'Gemini', 'Claude']), 'site option labels mismatch')
  check(select.props?.value === 'deepseek', 'default site is not deepseek')

  select.props.onChange({ target: { value: 'chatgpt' } })
  const after = findSelect(body.component({}))
  check(after?.props?.value === 'chatgpt', 'switching to chatgpt did not update the selection')
}

// ---------------------------------------------------------------- report
if (failures.length > 0) {
  console.error('client-smoke: FAIL')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}
console.log('client-smoke: PASS (apply + 4-site dropdown + site switch)')

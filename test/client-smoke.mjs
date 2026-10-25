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
const makeElement = (tagName = 'div') => {
  const element = {
    tagName: String(tagName).toUpperCase(),
    children: [],
    listeners: new Map(),
    style: {},
    className: '',
    textContent: '',
    type: '',
    attrs: {},
    parentElement: null,
    setAttribute(key, value) { this.attrs[key] = value },
    getAttribute(key) { return this.attrs[key] ?? null },
    appendChild(child) { child.parentElement = this; this.children.push(child); return child },
    remove() {
      if (this.parentElement !== null) {
        const index = this.parentElement.children.indexOf(this)
        if (index >= 0) this.parentElement.children.splice(index, 1)
      }
    },
    addEventListener(type, fn) {
      const list = this.listeners.get(type) ?? []
      list.push(fn)
      this.listeners.set(type, list)
    },
    removeEventListener(type, fn) {
      const list = this.listeners.get(type)
      if (list === undefined) return
      const index = list.indexOf(fn)
      if (index >= 0) list.splice(index, 1)
    },
    contains(other) { return other === this || this.children.includes(other) },
    closest() { return null },
    focus() {},
    querySelector() { return null },
    querySelectorAll() { return [] },
    getBoundingClientRect() { return { left: 0, top: 0, width: 200, height: 40 } },
  }
  return element
}
const documentListeners = new Map()
const addDocumentListener = (type, fn) => {
  const list = documentListeners.get(type) ?? []
  list.push(fn)
  documentListeners.set(type, list)
}
const removeDocumentListener = (type, fn) => {
  const list = documentListeners.get(type)
  if (list === undefined) return
  const index = list.indexOf(fn)
  if (index >= 0) list.splice(index, 1)
}
const fireDocument = (type, event) => {
  for (const fn of [...(documentListeners.get(type) ?? [])]) fn(event)
}
const bodyElement = makeElement('body')
const headElement = makeElement('head')
globalThis.document = {
  head: headElement,
  body: bodyElement,
  documentElement: makeElement('html'),
  cookie: '',
  createElement: (tagName) => makeElement(tagName),
  querySelector: () => null,
  querySelectorAll: () => [],
  addEventListener: addDocumentListener,
  removeEventListener: removeDocumentListener,
}
let selectedText = ''
const selectionAnchor = makeElement('span')
globalThis.window = {
  addEventListener() {}, removeEventListener() {},
  getSelection: () => ({
    toString: () => selectedText,
    anchorNode: selectionAnchor,
  }),
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
// eslint-disable-next-line no-eval
eval(code)

check(loaded.id === 'dsh-deepseek-webchat', `bundle registered as ${String(loaded.id)}`)

// ---------------------------------------------------------------- mock ctx
const registrations = []
const applyErrors = []
const openTabCalls = []
const disposers = []
const ctx = {
  effect(fn, label) {
    try {
      const dispose = fn()
      if (typeof dispose === 'function') disposers.push(dispose)
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
  sidebarRight: {
    openTab(kind, options) { openTabCalls.push({ kind, options }) },
    openTabIn() {},
  },
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

// ---------------------------------------------------------------- right-click handoff
check((documentListeners.get('contextmenu')?.length ?? 0) > 0, 'no document contextmenu listener was installed')
check((documentListeners.get('mousedown')?.length ?? 0) > 0, 'no document mousedown listener was installed')

selectedText = '选中的第一行\n选中的第二行'
const contextEvent = {
  defaultPrevented: false,
  target: makeElement('div'),
  clientX: 120,
  clientY: 160,
  preventDefault() { this.defaultPrevented = true },
}
fireDocument('contextmenu', contextEvent)
check(contextEvent.defaultPrevented === true, 'a text selection should suppress the native menu')
const menu = bodyElement.children.find((child) => child.className === 'dswc-ctxmenu')
check(menu !== undefined, 'no floating selection menu was appended')
const menuItem = menu?.children.find((child) => child.tagName === 'BUTTON' && child.className === 'dswc-ctxmenuItem')
check(menuItem !== undefined, 'the selection menu has no Web Chat item')
check(menuItem?.textContent === 'ctxmenu.webchat', 'the menu item copy is missing: ' + String(menuItem?.textContent))
const hint = menu?.children.find((child) => child.className === 'dswc-ctxmenuHint')
check(hint !== undefined && hint.textContent.includes('ctxmenu.selection'), 'the menu hint copy is missing')

// Clicking the item opens the Web Chat tab (the composer may not exist in this mock).
menuItem.listeners.get('click')?.[0]?.()
await new Promise((resolve) => setTimeout(resolve, 80))
check(openTabCalls.length > 0, 'clicking the menu item did not open the Web Chat tab')
check(openTabCalls[0].kind === 'deepseek-webchat', 'wrong tab kind opened: ' + String(openTabCalls[0].kind))
check(!bodyElement.children.some((child) => child.className === 'dswc-ctxmenu'), 'the menu should close once clicked')

// ---------------------------------------------------------------- report
if (failures.length > 0) {
  console.error('client-smoke: FAIL')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}
console.log('client-smoke: PASS (apply + 4-site dropdown + site switch + right-click handoff)')
process.exit(0)

#!/usr/bin/env node
/**
 * Client-half smoke test: runs the browser bundle under a mock Cordis context
 * and a mock React, then renders the Web Chat panel and checks that the site
 * dropdown offers the four web-chat sites and that switching updates state.
 *
 * No desktop shell, no network, no React renderer: this only proves the bundle
 * parses, `apply()` registers what the shell expects, the toolbar wiring is
 * present, and every site reaches its own composer script. The last part runs
 * the generated fill scripts against a simulated editor, so the write-once
 * contract is checked without a guest. The real UI is verified in the desktop app.
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
// The bundle exposes its composer scripts only behind this flag, so the
// production export surface (`apply` + `inject`) is what the app sees.
globalThis.__DSH_WEBChat_TEST__ = true
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

// ---------------------------------------------------------------- per-site quoting
// Context quoting used to be a DeepSeek-only toolbar button. Every site now has
// a composer adapter, so the button must be there whichever site is showing.
const findButtons = (node, out = []) => {
  if (node === null || node === undefined) return out
  if (Array.isArray(node)) { for (const child of node) findButtons(child, out); return out }
  if (typeof node !== 'object') return out
  if (node.type === 'button') { out.push(node); return out }
  for (const child of node.children ?? []) findButtons(child, out)
  return out
}
// The panel is rendered with an identity `t`, so copy is asserted by key. The
// real locale seat is the framework's; only the wiring matters here.
const renderPanel = () => body.component({ t: (key) => key })
const quoteButtonFor = (siteId) => {
  const current = findSelect(renderPanel())
  current.props.onChange({ target: { value: siteId } })
  return findButtons(renderPanel()).find((button) => button.children?.[0] === 'action.send')
}
for (const siteId of ['deepseek', 'chatgpt', 'gemini', 'claude']) {
  check(quoteButtonFor(siteId) !== undefined, `site ${siteId} has no Quote-context button`)
}
// Return to the default so the later checks see the same state as before.
findSelect(renderPanel()).props.onChange({ target: { value: 'deepseek' } })

// The bundle's own composer scripts are the part this smoke test cannot render
// (there is no desktop guest), so assert each site reaches its own editor.
const internals = loaded.module.__test
check(internals !== undefined, 'bundle exposes no __test seam for the composer scripts')
if (internals !== undefined) {
  const { fillScript, probeScript, sendScript } = internals
  const fill = (siteId, text = 'hello') => fillScript(text, siteId)
  check(fill('deepseek').includes('textarea.ds-textarea__textarea'), 'DeepSeek fill lost its textarea selector')
  check(!fill('deepseek').includes('execCommand'), 'DeepSeek fill should stay a textarea write')
  check(fill('chatgpt').includes('#prompt-textarea'), 'ChatGPT fill lost its composer selector')
  check(fill('claude').includes('ProseMirror'), 'Claude fill lost its composer selector')
  check(fill('gemini').includes('ql-editor'), 'Gemini fill lost its composer selector')
  for (const siteId of ['chatgpt', 'gemini', 'claude']) {
    check(fill(siteId).includes('execCommand'), `${siteId} fill should use the editor command path`)
    check(fill(siteId).includes('ClipboardEvent'), `${siteId} fill should keep the paste fallback`)
    check(fill(siteId).includes('selectionchange'), `${siteId} fill should announce the selection change`)
    check(probeScript(siteId).includes('innerText'), `${siteId} probe should read the editor DOM`)
    check(probeScript(siteId).includes('#prompt-textarea') || probeScript(siteId).includes('ProseMirror')
      || probeScript(siteId).includes('ql-editor'), `${siteId} probe lost its composer selector`)
    // An Enter submission is the shared path for every editor.
    check(sendScript(siteId).includes('KeyboardEvent'), `${siteId} send is not an Enter keydown`)
  }
  check(probeScript('deepseek').includes('.value'), 'DeepSeek probe should read the textarea value')
  // A multi-line quote must reach the paste path, which is what splits it into
  // paragraphs in a rich-text editor instead of flattening the quote.
  check(fill('chatgpt', 'line one\nline two').includes('String.fromCharCode(10)'),
    'multi-line fill lost its newline detection')

  /**
   * Run one generated fill script against a simulated rich-text editor.
   *
   * There is no desktop guest in a Node process, so the editor is reduced to
   * the surface the script actually touches: a selection, `execCommand`, and a
   * `paste` event that writes the clipboard text. Whichever paths a scenario
   * enables, the assertion that matters is the same — the text lands exactly
   * once, and `ok` reports it.
   */
  const runFill = (script, scenario) => {
    const calls = []
    // One content store behind both properties, the way a real contenteditable
    // editor behaves: writing either one is visible to the other. A read-only
    // editor ignores every write, which is the case the script must report as a
    // failure rather than as a success.
    let content = scenario.initial ?? ''
    const write = (value) => {
      if (scenario.readOnly !== true) content = String(value)
    }
    const editor = {
      get innerText() { return content },
      set innerText(value) { write(value) },
      get textContent() { return content },
      set textContent(value) { write(value) },
      selection: { removeAllRanges() {}, addRange() {} },
      focus() {},
      dispatchEvent(event) {
        calls.push(event.type)
        if (event.type === 'paste' && scenario.paste === true) {
          write(event.clipboardData.getData('text/plain'))
        }
        return true
      },
      execCommand(command, text) {
        calls.push('execCommand:' + command)
        if (scenario.command !== true) return false
        write(text)
        return true
      },
    }
    const doc = {
      getSelection: () => editor.selection,
      createRange: () => ({ selectNodeContents() {}, collapse() {} }),
      execCommand: (command, ui, text) => editor.execCommand(command, text),
      dispatchEvent: () => {},
    }
    editor.ownerDocument = doc
    const scope = {
      document: { querySelector: () => editor, getSelection: doc.getSelection },
      DataTransfer: class {
        constructor() { this.data = {} }
        setData(type, value) { this.data[type] = value }
        getData(type) { return this.data[type] }
      },
      ClipboardEvent: class {
        constructor(type, init) {
          this.type = type
          this.clipboardData = init.clipboardData
        }
      },
      Event: class { constructor(type) { this.type = type } },
    }
    const result = new Function(...Object.keys(scope), `return ${script}`)(...Object.values(scope))
    return { result, calls, editor }
  }

  const single = runFill(fill('chatgpt', '引用的第一行'), { command: true })
  check(single.result.ok === true, 'editable fill reported failure with a working command')
  check(single.editor.innerText === '引用的第一行', 'editable fill did not place the single line')
  check(single.editor.innerText.split('引用的第一行').length - 1 === 1,
    'editable fill inserted the text more than once')

  const pasted = runFill(fill('chatgpt', 'line one\nline two'), { paste: true })
  check(pasted.result.ok === true, 'editable fill reported failure with a working paste path')
  check(pasted.editor.innerText === 'line one\nline two', 'multi-line fill lost its line break')
  check(pasted.calls.includes('paste'), 'multi-line fill did not use the paste path')
  check(!pasted.calls.includes('execCommand'), 'multi-line fill duplicated the write through execCommand')

  const fallbackCommand = runFill(fill('claude', 'fallback works'), { command: true })
  check(fallbackCommand.result.ok === true && fallbackCommand.editor.innerText === 'fallback works',
    'single-line fill lost its command path')

  const nothing = runFill(fill('gemini', 'last resort'), {})
  check(nothing.result.ok === true, 'editable fill gave up without trying the textContent fallback')
  check(nothing.editor.textContent === 'last resort', 'textContent fallback did not place the text')

  const combined = runFill(fill('chatgpt', 'a\nb'), { command: true, paste: true })
  check(combined.editor.innerText.split('a\nb').length - 1 === 1,
    'multi-line fill inserted the text more than once')

  // A composer that already holds a draft is the case that a "still empty"
  // gate gets wrong: the fill must replace the draft, not read it as success.
  const drafted = runFill(fill('chatgpt', '引用块'), { initial: 'half-typed draft', command: true })
  check(drafted.result.ok === true, 'fill over a draft reported failure')
  check(drafted.editor.innerText === '引用块', 'fill did not replace the existing draft')
  check(drafted.result.length === '引用块'.length, 'fill reported the draft length as its own')

  const draftedFallback = runFill(fill('claude', '引用块'), { initial: 'draft', readOnly: false })
  check(draftedFallback.result.ok === true, 'fill over a draft lost the textContent fallback')
  check(draftedFallback.editor.innerText === '引用块', 'textContent fallback did not replace the draft')

  // A read-only / refusing editor must come back as a failure. Reporting ok
  // here is what would make the picker toast a send that never happened.
  const refused = runFill(fill('gemini', '引用块'), { initial: 'draft', readOnly: true })
  check(refused.result.ok === false, 'a refusing editor was reported as a successful fill')
  check(refused.editor.innerText === 'draft', 'a refused fill must not lose the draft')

  // The editable path must not mistake a pre-existing draft for its own write;
  // the same script on an empty editor still reports the real length.
  const emptyAgain = runFill(fill('chatgpt', 'x'), {})
  check(emptyAgain.result.length === 1, 'fill length should be the quoted text length')
}

// ---------------------------------------------------------------- settings section
const settingsEntry = registrations.find((entry) => entry.options.name === 'settings.section')
check(settingsEntry !== undefined, 'no Settings → Web Chat section was registered')
check(settingsEntry?.options?.id === 'dsh-deepseek-webchat', 'settings section id mismatch')
check(settingsEntry?.options?.order === 55, 'settings section order should be 55')
check(settingsEntry?.options?.label?.() === 'settings.title', 'settings section label is not localised')
const settingsTree = settingsEntry.component({})
const findSettingsSelect = (node) => {
  if (node === null || node === undefined) return null
  if (Array.isArray(node)) {
    for (const child of node) { const hit = findSettingsSelect(child); if (hit) return hit }
    return null
  }
  if (typeof node !== 'object') return null
  if (node.type === 'select' && node.props?.className === 'dswc-settingsSelect') return node
  for (const child of node.children ?? []) { const hit = findSettingsSelect(child); if (hit) return hit }
  return null
}
const settingsSelect = findSettingsSelect(settingsTree)
check(settingsSelect !== null, 'settings section has no default-site select')
if (settingsSelect !== null) {
  const options = flatten(settingsSelect.children).map((option) => ({
    value: option.props?.value,
    label: option.children?.[0],
  }))
  check(JSON.stringify(options.map((option) => option.value))
    === JSON.stringify(['deepseek', 'chatgpt', 'gemini', 'claude']), 'settings site options mismatch')
  check(['deepseek', 'chatgpt', 'gemini', 'claude'].includes(settingsSelect.props?.value),
    'settings default site is not a known site: ' + String(settingsSelect.props?.value))
  settingsSelect.props.onChange({ target: { value: 'gemini' } })
  const after = findSettingsSelect(settingsEntry.component({}))
  check(after?.props?.value === 'gemini', 'settings default-site change did not take effect')
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
console.log('client-smoke: PASS (apply + 4-site dropdown + site switch + per-site quoting + composer scripts + right-click handoff + settings)')
process.exit(0)

#!/usr/bin/env node
/**
 * Host-half smoke test: extracts the guest-session snapshot region from
 * lib/index.js (the host bundle imports Cordis packages and cannot be imported
 * standalone), runs it with stubbed JSON file access, and checks the
 * version-1 → version-2 migration plus per-site reads and writes.
 */
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const hostFile = join(here, '..', 'plugin', 'lib', 'index.js')
const source = readFileSync(hostFile, 'utf8')

const start = source.indexOf('//#region guest session snapshot')
const endMarker = '//#endregion'
const end = source.indexOf(endMarker, start)
if (start < 0 || end < 0) {
  console.error('host-snapshot: FAIL (snapshot region not found)')
  process.exit(1)
}
const region = source.slice(start, end + endMarker.length).replace(/export function /g, 'function ')

const workDir = mkdtempSync(join(tmpdir(), 'dsh-webchat-test-'))
const sessionFile = join(workDir, 'session.json')
const readJsonFile = (path) => {
  try { return JSON.parse(readFileSync(path, 'utf8')) } catch { return null }
}
const writeJsonFile = (path, value) => writeFileSync(path, JSON.stringify(value, null, 2))
const api = new Function(
  'readJsonFile', 'writeJsonFile', 'sessionFile',
  region + '\nreturn { saveGuestSession, loadGuestSession, guestSite }',
)(readJsonFile, writeJsonFile, () => sessionFile)

const failures = []
const check = (ok, message) => { if (!ok) failures.push(message) }

// Start from the version-1 file an older install leaves behind.
writeJsonFile(sessionFile, {
  version: 1,
  savedAt: '2026-10-01T00:00:00.000Z',
  storage: [['userToken', 'deepseek-token']],
  cookie: 'ds=1',
})

check(api.guestSite('chatgpt') === 'chatgpt', 'guestSite(chatgpt) rejected')
check(api.guestSite('nonsense') === 'deepseek', 'unknown site should fall back to deepseek')
check(api.guestSite(undefined) === 'deepseek', 'missing site should fall back to deepseek')

const deepseek = api.loadGuestSession('deepseek')
check(deepseek !== null && deepseek.storage[0][0] === 'userToken', 'v1 DeepSeek snapshot not readable')

api.saveGuestSession([['openai', 'x']], 'chat=1', 'chatgpt')
const migrated = readJsonFile(sessionFile)
check(migrated.version === 2, 'file was not upgraded to version 2')
check(Boolean(migrated.sites?.chatgpt), 'chatgpt snapshot missing after save')
check(Boolean(migrated.sites?.deepseek), 'deepseek snapshot lost after saving chatgpt')
check(api.loadGuestSession('deepseek').storage[0][0] === 'userToken', 'deepseek snapshot changed')
check(api.loadGuestSession('chatgpt').cookie === 'chat=1', 'chatgpt snapshot not readable')
check(api.loadGuestSession('gemini') === null, 'missing site should return null')

api.saveGuestSession([], '', 'nonsense')
const after = readJsonFile(sessionFile)
check(!after.sites.nonsense, 'unknown site must not become a storage key')
check(Boolean(after.sites.deepseek), 'deepseek snapshot disappeared')

if (failures.length > 0) {
  console.error('host-snapshot: FAIL')
  for (const failure of failures) console.error('  - ' + failure)
  process.exit(1)
}
console.log('host-snapshot: PASS (v1 -> v2 migration + per-site read/write)')

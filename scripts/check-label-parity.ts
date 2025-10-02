#!/usr/bin/env node
/**
 * Labels parity checker: compares JA vs EN keys in labels.ts at runtime.
 * Usage: node scripts/check-label-parity.ts
 * Note: Implemented without TS runtime transpilation to avoid ESM loader issues.
 */
// Minimal type-less script (CommonJS-like) but still .ts for editor hints.
// Node will treat as ES module (package type=module). Use dynamic import safe APIs.
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const file = path.resolve(__dirname, '../src/lib/labels.ts')
const src = fs.readFileSync(file, 'utf-8')

// naive parse: find 'const JA = { ... };' and 'const EN: typeof JA = { ... };'
function extractBody(label: string) {
  const re = new RegExp(`const ${label}(?:[^=]*)= \\{([\\s\\S]*?)\\n\\};`)
  const m = src.match(re)
  if (!m) throw new Error(`Unable to locate ${label}`)
  return m[1]
}

function extractKeys(body: string) {
  const keyRe = /\n\s*,?\s*([a-zA-Z0-9_]+):/g
  const keys = new Set<string>()
  let km: RegExpExecArray | null
  while ((km = keyRe.exec(body))) keys.add(km[1])
  return keys
}

const jaBody = extractBody('JA')
const enBody = extractBody('EN')
const jaKeys = extractKeys(jaBody)
// EN は `...JA, overrides` 形式なので override キーのみ抽出し、実質キー集合は JA + overrides
const enOverrideKeys = extractKeys(enBody)
// 一部 override キーは JA にすでに存在 (上書き) なので union で最終集合
const enFullSet = new Set<string>([...jaKeys, ...enOverrideKeys])

// Missing: JA にあり EN 側 union に存在しない (理論上 0 のはず)
const missingInEN = [...jaKeys].filter(k => !enFullSet.has(k))
// Extra: EN override で追加され JA に無い純追加 (翻訳キー増分)
const extraInEN = [...enOverrideKeys].filter(k => !jaKeys.has(k))

if (missingInEN.length===0 && extraInEN.length===0) {
  console.log('✅ Parity OK: JA & EN key sets identical ('+jaKeys.size+' keys).')
  process.exit(0)
}
if (missingInEN.length>0) {
  console.log('\nKeys missing in EN ('+missingInEN.length+'):\n'+ missingInEN.join('\n'))
}
if (extraInEN.length>0) {
  console.log('\nExtra keys in EN ('+extraInEN.length+'):\n'+ extraInEN.join('\n'))
}
process.exit(1)

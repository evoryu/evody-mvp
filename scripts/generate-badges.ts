#!/usr/bin/env ts-node
/**
 * Validate badge JSON files against schema and output a generated TS registry.
 */
import fs from 'fs'
import path from 'path'
import Ajv, { type ErrorObject } from 'ajv'

const root = process.cwd()
const schemaPath = path.join(root, 'schemas', 'badge-definition.schema.json')
const badgesDir = path.join(root, 'badges')
const outFile = path.join(root, 'src', 'lib', 'badges-registry.generated.ts')

function loadSchema() {
  const raw = fs.readFileSync(schemaPath, 'utf8')
  return JSON.parse(raw)
}

function main() {
  const args = process.argv.slice(2)
  const validateOnly = args.includes('--validate-only')
  const schema = loadSchema()
  const ajv = new Ajv({ allErrors: true })
  const validate = ajv.compile(schema)

  const files = fs.readdirSync(badgesDir).filter(f => f.endsWith('.json'))
  const defs: unknown[] = []
  const seenIds = new Set<string>()
  for (const file of files) {
    const p = path.join(badgesDir, file)
    const raw = fs.readFileSync(p, 'utf8')
    let data
    try { data = JSON.parse(raw) } catch (e) {
      console.error(`✗ JSON parse error in ${file}:`, e)
      process.exitCode = 1
      continue
    }
    const ok = validate(data)
    if (!ok) {
      console.error(`✗ Schema validation failed: ${file}`)
      for (const err of (validate.errors || []) as ErrorObject[]) {
  const errAny = err as unknown as Record<string, unknown>
        const inst = (typeof errAny.instancePath === 'string' && errAny.instancePath) || (typeof errAny.dataPath === 'string' && errAny.dataPath) || '/'
        console.error('  -', inst, err.message, err.params)
      }
      process.exitCode = 1
      continue
    }
  type MinimalBadge = { id?: unknown }
  const id = (data as MinimalBadge).id
    if (typeof id !== 'string' || !id) {
      console.error(`✗ Missing id in ${file}`)
      process.exitCode = 1
      continue
    }
    if (seenIds.has(id)) {
      console.error(`✗ Duplicate id '${id}' in ${file}`)
      process.exitCode = 1
      continue
    }
    seenIds.add(id)
    defs.push(data)
  }
  if (process.exitCode) {
    console.error('Badge generation aborted due to errors.')
    return
  }

  if (validateOnly) {
    console.log(`✓ Validation OK (${defs.length} badge definitions).`)
    return
  }

  // Generate TS file
  const code = `// AUTO-GENERATED FILE. DO NOT EDIT.
// Generated at ${new Date().toISOString()}
import type { BadgeDefinition } from './badges'

export const BADGE_DEFINITIONS: BadgeDefinition[] = ${JSON.stringify(defs, null, 2)}
`
  fs.writeFileSync(outFile, code, 'utf8')
  console.log(`✓ Generated ${path.relative(root, outFile)} with ${defs.length} definitions.`)
}

main()

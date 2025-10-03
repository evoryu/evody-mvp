// CI validation aggregate script
// Runs badge schema validation, tests, and experiment registry sanity checks.
import { readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { createRequire } from 'node:module';
import Ajv from 'ajv';

// 1. Inline badge validation
(() => {
  const root = process.cwd();
  const schemaPath = path.join(root, 'schemas', 'badge-definition.schema.json');
  const badgesDir = path.join(root, 'badges');
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  const files = readdirSync(badgesDir).filter(f=> f.endsWith('.json'));
  let okAll = true;
  const seen = new Set<string>();
  interface BadgeMinimal { id: string }
  for (const f of files) {
    const raw = readFileSync(path.join(badgesDir,f),'utf8');
    let data: unknown; try { data = JSON.parse(raw); } catch { console.error(`✗ parse ${f}`); okAll=false; continue }
    if (!validate(data)) { console.error(`✗ schema ${f}`); okAll=false; continue }
  if (typeof data !== 'object' || data === null || !('id' in data) || typeof (data as { id?: unknown }).id !== 'string') { console.error(`✗ missing id ${f}`); okAll=false; continue }
  const id = (data as BadgeMinimal).id
    if (seen.has(id)) { console.error(`✗ duplicate id ${id}`); okAll=false; continue }
    seen.add(id);
  }
  if (!okAll) { console.error('✗ badge validation failed'); process.exit(1); }
  console.log(`✓ badge validation (${seen.size} defs)`);
})();

// 2. Tests (spawn ts-node/register)
(() => {
  try {
    const requireFn = createRequire(import.meta.url);
    const tsNodeRegister = requireFn.resolve('ts-node/register');
    const res = spawnSync(
      process.execPath,
      [
        '-r',
        tsNodeRegister,
        'src/lib/all-badge-tests.ts'
      ],
      {
        stdio: 'inherit',
        env: { ...process.env, TS_NODE_PROJECT: 'tsconfig.badge-tests.json' }
      }
    );
    if (res.status !== 0) {
      console.error('✗ tests failed');
      process.exit(res.status ?? 1);
    }
    console.log('✓ tests');
  } catch (e) {
    console.error('✗ tests failed (spawn error)');
    console.error(e);
    process.exit(1);
  }
})();

// 3. Experiments registry sanity (static text scan)
(() => {
  const expPath = path.resolve('src/lib/experiments.ts');
  const text = readFileSync(expPath, 'utf-8');
  const matches = text.match(/defineExperiment\(\{ key: '([^']+)'/g) || [];
  const keys = matches.map(m => m.split("key: '")[1].split("'")[0]);
  const dup = keys.find((k,i)=> keys.indexOf(k) !== i);
  if (dup) {
    console.error(`✗ duplicate experiment key detected: ${dup}`);
    process.exit(1);
  }
  console.log('✓ experiments registry unique keys');
})();

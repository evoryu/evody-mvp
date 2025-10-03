import { recordExposure, _getBufferLength, _resetForTest, _disableRetryForTest, _maybeClearFromQueryForTest } from './experiments-analytics'

// mock window location with exp.clear=1
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g:any = globalThis as any
if(!g.window) g.window = {}
if(!g.window.location) g.window.location = { search: '?exp.clear=1' }
if(!g.window.localStorage){
  const store: Record<string,string> = {}
  g.window.localStorage = { getItem:(k:string)=> store[k]??null,setItem:(k:string,v:string)=>{store[k]=v},removeItem:(k:string)=>{delete store[k]},clear:()=>{for(const k in store) delete store[k]} }
}

_resetForTest(); _disableRetryForTest()

recordExposure('exp_clear','A')
recordExposure('exp_clear','A')
if (_getBufferLength() === 2) { console.log('✓ len 2 before clear') } else { console.error('✗ len 2 before clear'); process.exitCode = 1 }

// Ensure search param is present at trigger time (overwrite even if exists)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(globalThis as any).window.location.search = '?exp.clear=1'
_maybeClearFromQueryForTest()
if (_getBufferLength() === 0) { console.log('✓ cleared by query') } else { console.error('✗ cleared by query'); process.exitCode = 1 }

console.log('\nExperiment clear-query tests complete.')

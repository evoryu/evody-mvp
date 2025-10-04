import { _resetForTest, _restoreForTest, _getBufferLength } from './experiments-analytics'

function assert(name: string, cond: boolean){ if(!cond){ console.error(`✗ ${name}`); process.exitCode=1 } else { console.log(`✓ ${name}`) } }

// Inject malformed events into localStorage and ensure they are ignored on restore
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g: any = globalThis as any
if(!g.window) g.window = {}
if(!g.window.localStorage){
  const store: Record<string,string> = {}
  g.window.localStorage = { getItem:(k:string)=> store[k]??null,setItem:(k:string,v:string)=>{store[k]=v},removeItem:(k:string)=>{delete store[k]},clear:()=>{for(const k in store) delete store[k]} }
}

const malformed = [
  { type:'exposure', key: 123, variant:'A', ts: Date.now() },           // key not string
  { type:'exposure', key: 'k', variant: 9, ts: Date.now() },            // variant not string
  { type:'conversion', key:'k', metric: 1, ts: Date.now() },            // metric not string
  { type:'conversion', key:'k', metric:'m', value: 'x', ts: Date.now() }, // value not number
  { type:'unknown', key:'k', ts: Date.now() },                          // unknown type
  { type:'exposure', key:'k', variant:'A', ts: 'bad' as unknown as number }, // ts not number
]

window.localStorage.setItem('exp.events.buffer.v1', JSON.stringify(malformed))
_resetForTest()
window.localStorage.setItem('exp.events.buffer.v1', JSON.stringify(malformed))
_restoreForTest()

assert('no malformed events restored', _getBufferLength() === 0)

console.log('\nExperiment validation tests complete.')

import { _resetForTest, _getBufferLength, _restoreForTest, _pruneForTest } from './experiments-analytics'

// TTL = 24h: シミュレーションで古いイベントを localStorage に直接書き込み -> restore で prune されるか確認

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const g:any = globalThis as any
if(!g.window) g.window = {}
if(!g.window.localStorage){
  const store: Record<string,string> = {}
  g.window.localStorage = { getItem:(k:string)=> store[k]??null,setItem:(k:string,v:string)=>{store[k]=v},removeItem:(k:string)=>{delete store[k]},clear:()=>{for(const k in store) delete store[k]} }
}

// craft payload: one old event (ts way past TTL), one fresh
const now = Date.now()
const oldTs = now - (1000*60*60*24*2) // 48h ago
const freshTs = now - 1000
const data = [
  { type:'exposure', key:'exp_ttl', variant:'A', ts: oldTs },
  { type:'conversion', key:'exp_ttl', metric:'clicked', ts: freshTs }
]
window.localStorage.setItem('exp.events.buffer.v1', JSON.stringify(data))

_resetForTest() // clears localStorage key also -> restore again manually
window.localStorage.setItem('exp.events.buffer.v1', JSON.stringify(data))
_restoreForTest() // will load then prune
_pruneForTest()

if (_getBufferLength() === 1) { console.log('✓ ttl pruned old event') } else { console.error('✗ ttl pruned old event'); process.exitCode = 1 }

console.log('\nExperiment TTL tests complete.')

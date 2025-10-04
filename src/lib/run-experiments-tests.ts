// Simple runner to execute experiments analytics tests in sequence under ts-node
// Each imported test uses top-level execution and sets process.exitCode on failure.

import './experiments.analytics.test.ts'
import './experiments.analytics.persistence.test.ts'
import './experiments.analytics.ttl.test.ts'
import './experiments.analytics.backoff.test.ts'
import './experiments.analytics.exit-flush.test.ts'

// Give a tiny delay to allow any pending async logs to flush before process exit
setTimeout(()=>{
  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nSome experiment analytics tests failed.')
  } else {
    console.log('\nAll experiment analytics tests passed (no failures signaled).')
  }
}, 10)

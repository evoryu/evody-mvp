// CJS runner to execute TS tests via ts-node/register
require('ts-node/register/transpile-only')
require('./experiments.analytics.test')
require('./experiments.analytics.persistence.test')
require('./experiments.analytics.ttl.test')
require('./experiments.analytics.backoff.test')
require('./experiments.analytics.exit-flush.test')
require('./experiments.analytics.force-success.test')
require('./experiments.analytics.validation.test')
setTimeout(()=>{
  if (process.exitCode && process.exitCode !== 0) {
    console.error('\nSome experiment analytics tests failed.')
    process.exit(process.exitCode)
  } else {
    console.log('\nAll experiment analytics tests passed (no failures signaled).')
  }
}, 10)

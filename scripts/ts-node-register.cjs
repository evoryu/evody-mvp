// Register ts-node with CommonJS compiler options for running standalone TS tests
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node'
  }
})

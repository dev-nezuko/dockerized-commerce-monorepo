// Lets plain `node` load the TypeScript sources (tests, seed, dev server)
// without a separate runtime. Uses the project's own compiler so decorator
// metadata, which TypeORM relies on, is emitted the same way as in `tsc`.
const fs = require('node:fs');
const ts = require('typescript');

const compilerOptions = {
  module: ts.ModuleKind.CommonJS,
  target: ts.ScriptTarget.ES2022,
  esModuleInterop: true,
  experimentalDecorators: true,
  emitDecoratorMetadata: true,
  inlineSourceMap: true,
};

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions, fileName: filename });
  module._compile(outputText, filename);
};

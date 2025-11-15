// Loads the plain TypeScript modules under lib/ with the project's compiler.
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = function compileTypeScript(module, filename) {
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(outputText, filename);
};

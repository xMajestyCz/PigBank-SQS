const esbuild = require('esbuild');
const path    = require('path');
const fs      = require('fs');

const lambdas = [
  'start-payment',
  'check-balance',
  'transaction',
];

if (fs.existsSync('dist/lambdas')) {
  fs.rmSync('dist/lambdas', { recursive: true });
}
fs.mkdirSync('dist/lambdas', { recursive: true });

lambdas.forEach((lambda) => {
  const entryPoint = path.join('src', 'lambdas', lambda, 'handler.ts');
  const outdir     = path.join('dist', 'lambdas', lambda);

  fs.mkdirSync(outdir, { recursive: true });

  esbuild.buildSync({
    entryPoints: [entryPoint],
    bundle:      true,
    platform:    'node',
    target:      'node20',
    outfile:     path.join(outdir, 'handler.js'),
    minify:      false,
    sourcemap:   false,
  });

  console.log(`✅ Built: ${lambda}`);
});

console.log('\n🚀 All lambdas built successfully');
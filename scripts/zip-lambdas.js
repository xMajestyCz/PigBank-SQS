const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const lambdas = [
  'start-payment',
  'check-balance',
  'transaction',
];

if (!fs.existsSync('dist/zips')) {
  fs.mkdirSync('dist/zips', { recursive: true });
}

lambdas.forEach((lambda) => {
  const handlerPath = path.join('dist', 'lambdas', lambda, 'handler.js');
  const zipPath     = path.join('dist', 'zips', `${lambda}.zip`);

  if (!fs.existsSync(handlerPath)) {
    console.error(`❌ Not found: ${handlerPath}`);
    return;
  }

  execSync(
    `powershell -Command "Compress-Archive -Path '${handlerPath}' -DestinationPath '${zipPath}' -Force"`,
  );

  console.log(`✅ Zipped: ${lambda} → ${zipPath}`);
});

console.log('\n🚀 All zips created successfully');
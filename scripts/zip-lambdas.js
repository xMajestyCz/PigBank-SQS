const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const lambdas = [
  "payment",
  "catalog",
  "start-payment",
  "check-balance",
  "transaction",
  'load-catalog',
];

// Crear carpeta de zips
if (!fs.existsSync("dist/zips")) {
  fs.mkdirSync("dist/zips", { recursive: true });
}

lambdas.forEach((lambda) => {
  const handlerPath = path.join("dist", "lambdas", lambda, "handler.js");
  const zipPath = path.join("dist", "zips", `${lambda}.zip`);

  if (!fs.existsSync(handlerPath)) {
    console.error(`❌ Not found: ${handlerPath}`);
    return;
  }

  // Usar PowerShell para crear el zip en Windows
  execSync(
    `powershell -Command "Compress-Archive -Path '${handlerPath}' -DestinationPath '${zipPath}' -Force"`,
  );

  console.log(`✅ Zipped: ${lambda} → ${zipPath}`);
});

console.log("\n🚀 All zips created successfully");

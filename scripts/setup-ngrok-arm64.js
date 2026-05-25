#!/usr/bin/env node
// Windows ARM64環境でngrokのx64バイナリを使えるようにするセットアップスクリプト
if (process.platform !== "win32" || process.arch !== "arm64") {
  process.exit(0);
}

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const binPkg = path.join(
  root,
  "node_modules/@expo/ngrok-bin-win32-x64/ngrok.exe"
);
const indexPath = path.join(root, "node_modules/@expo/ngrok-bin/index.js");

if (!fs.existsSync(binPkg)) {
  console.log("Installing @expo/ngrok-bin-win32-x64 for ARM64 Windows...");
  execSync(
    "npm install @expo/ngrok-bin-win32-x64@2.3.41 --force --no-save --ignore-scripts",
    {
      stdio: "inherit",
      cwd: root,
    }
  );
}

const patched = `try {
  module.exports = require.resolve(
    "@expo/ngrok-bin-" +
      process.platform +
      "-" +
      process.arch +
      (process.platform === "win32" ? "/ngrok.exe" : "/ngrok")
  );
} catch (e) {
  try {
    module.exports = require.resolve("@expo/ngrok-bin-win32-x64/ngrok.exe");
  } catch (e2) {
    module.exports = null;
  }
}
`;

if (
  fs.existsSync(indexPath) &&
  fs.readFileSync(indexPath, "utf8") !== patched
) {
  fs.writeFileSync(indexPath, patched);
  console.log("Patched @expo/ngrok-bin/index.js");
}

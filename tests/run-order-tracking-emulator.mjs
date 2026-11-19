import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const projectId = "demo-acquisition-marketing";
const sourceRules = path.resolve("..", "WLHORIZON", "firestore.rules");
const temporaryRules = path.resolve("tests", "order-tracking.firestore.rules");
if (!projectId.startsWith("demo-") || !sourceRules.endsWith(`${path.sep}WLHORIZON${path.sep}firestore.rules`)) {
  throw new Error("Order tracking emulator runner refuses non-demo or unexpected rules targets.");
}

// Do not overwrite a temporary rule snapshot owned by another emulator process.
// COPYFILE_EXCL makes concurrent runners fail safely instead of racing each other.
fs.copyFileSync(sourceRules, temporaryRules, fs.constants.COPYFILE_EXCL);
try {
  const firebaseCli = process.platform === "win32"
    ? path.join(process.env.APPDATA ?? "", "npm", "node_modules", "firebase-tools", "lib", "bin", "firebase.js")
    : "firebase";
  const hasWindowsCli = process.platform === "win32" && fs.existsSync(firebaseCli);
  const command = hasWindowsCli
    ? process.execPath
    : (process.platform === "win32" ? path.join(process.env.APPDATA ?? "", "npm", "firebase.cmd") : firebaseCli);
  const commandArgs = hasWindowsCli
    ? [firebaseCli]
    : [];
  commandArgs.push(
    "emulators:exec", "--only", "firestore,auth", "--project", projectId,
    "--config", "tests/order-tracking.firebase.json",
    "node tests/order-tracking.emulator.test.mjs",
  );
  const result = spawnSync(command, commandArgs, {
    stdio: "inherit",
    windowsHide: true,
    // firebase.cmd needs cmd.exe only as a compatibility fallback; the normal
    // Windows path executes Firebase's JavaScript entrypoint with node directly.
    shell: process.platform === "win32" && !hasWindowsCli,
    env: { ...process.env, GCLOUD_PROJECT: projectId },
  });
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  fs.rmSync(temporaryRules, { force: true });
}

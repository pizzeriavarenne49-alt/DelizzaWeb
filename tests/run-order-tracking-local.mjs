// Isolated build/preview: overrides .env values, never points at a real Firebase project.
import { spawn } from "node:child_process";
import path from "node:path";
const mode = process.argv[2];
if (!["build", "dev", "start"].includes(mode)) throw new Error("Use build, dev, or start.");
const projectId = "demo-acquisition-marketing"; // Existing guarded emulator mode in firebase-client.ts.
const env = {
  ...process.env,
  FIREBASE_PROJECT_ID: projectId, NEXT_PUBLIC_FIREBASE_PROJECT_ID: projectId,
  GCLOUD_PROJECT: projectId, GOOGLE_CLOUD_PROJECT: projectId,
  GOOGLE_APPLICATION_CREDENTIALS: "", FIREBASE_CLIENT_EMAIL: "", FIREBASE_PRIVATE_KEY: "",
  FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:9808", FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9909",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key", NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: `${projectId}.firebaseapp.com`,
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: `${projectId}.appspot.com`,
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:fixture", NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  NEXT_PUBLIC_HALLOWEEN_LOCAL: "false", NEXT_PUBLIC_MARKETING_TEST_MODE: "true",
  WL_APP_ID: "d_lizza", NEXT_PUBLIC_WL_APP_ID: "d_lizza",
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "", NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN: "",
  NEXT_PUBLIC_DIRECTUS_URL: "", DIRECTUS_STATIC_TOKEN: "", NEXT_PUBLIC_GA4_ID: "",
  NEXT_PUBLIC_MARKETING_ENABLED: "false", NEXT_PUBLIC_COMING_SOON: "false",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3417", NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
  NEXT_TELEMETRY_DISABLED: "1",
};
const args = [path.resolve("node_modules/next/dist/bin/next"), mode];
if (mode !== "build") args.push("--hostname", "127.0.0.1", "--port", "3417");
const child = spawn(process.execPath, args, { env, stdio: "inherit", windowsHide: true });
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));

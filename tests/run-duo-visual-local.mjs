// Local browser review using the dedicated Deli'Zza emulator fixture.
import { spawn } from "node:child_process";

const env = {
  ...process.env,
  NODE_ENV: "development",
  NEXT_TELEMETRY_DISABLED: "1",
  NEXT_PUBLIC_ENABLE_PIZZA_DUO: "true",
  NEXT_PUBLIC_PIZZA_DUO_LOCAL_EMULATOR: "true",
  FIREBASE_PROJECT_ID: "demo-web-duo",
  GCLOUD_PROJECT: "demo-web-duo",
  GOOGLE_CLOUD_PROJECT: "demo-web-duo",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "demo-web-duo",
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:18787",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "localhost",
  NEXT_PUBLIC_FIREBASE_API_KEY: "demo-key",
  NEXT_PUBLIC_FIREBASE_APP_ID: "1:1234567890:web:fixture",
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "1234567890",
  FIREBASE_STORAGE_BUCKET: "demo-web-duo.appspot.com",
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: "demo-web-duo.appspot.com",
  FIREBASE_CLIENT_EMAIL: "",
  FIREBASE_PRIVATE_KEY: "",
  NEXT_PUBLIC_WL_APP_ID: "d_lizza",
  WL_APP_ID: "d_lizza",
  NEXT_PUBLIC_COMING_SOON: "false",
  NEXT_PUBLIC_MARKETING_TEST_MODE: "false",
  NEXT_PUBLIC_HALLOWEEN_LOCAL: "false",
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "",
  STRIPE_SECRET_KEY: "",
  NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3007",
  NEXT_PUBLIC_MARKETING_ENABLED: "false",
  GOOGLE_APPLICATION_CREDENTIALS: "",
  DIRECTUS_STATIC_TOKEN: "",
  NEXT_PUBLIC_GA4_ID: "",
  NEXT_PUBLIC_DIRECTUS_URL: "",
  NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN: "",
};
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "--webpack", "--hostname", "127.0.0.1", "--port", "3007"], { env, stdio: "inherit", windowsHide: true });
child.on("error", (err) => { console.error(err.message); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));

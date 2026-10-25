#!/usr/bin/env node

/**
 * Starts `next dev` in LOCAL DEVELOPMENT preview mode (see lib/preview-mode.ts).
 * Supabase and Gemini are replaced by mocks, so no credentials are needed.
 * Usage: npm run dev:preview [-- --port 3001]
 */

const { spawn } = require("child_process")

const nextBin = require.resolve("next/dist/bin/next")

console.log("Starting CareLens AI in LOCAL preview mode (mock data, no real API calls)...\n")

const child = spawn(process.execPath, [nextBin, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: {
    ...process.env,
    NODE_ENV: "development",
    NEXT_PUBLIC_CARELENS_PREVIEW: "true",
  },
})

child.on("exit", (code) => process.exit(code ?? 0))

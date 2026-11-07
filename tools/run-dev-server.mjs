// Start Next dev server for M5 batch K HTTP verification.
// Loads repo-root .env.local into the child env (values never printed); existing process env wins.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
const env = { ...process.env };
for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const child = spawn("npx", ["next", "dev", "-p", "3210"], { cwd: "apps/web", env, stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 1));

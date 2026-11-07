// Apply one migration file to the local isolated DB (.env.local DATABASE_URL). Prints no secrets.
// Usage: node tools/apply-local-migration.mjs supabase/migrations/<file>.sql
import { execFileSync } from "node:child_process";
import { PSQL_PATH, getConnection } from "../packages/data-access/src/index.mjs";

const migration = process.argv[2];
if (!migration || !migration.endsWith(".sql")) throw new Error("usage: apply-local-migration <migration.sql>");
const c = getConnection();
execFileSync(PSQL_PATH, [
  "-h", c.host, "-p", c.port, "-U", c.user, "-d", c.db,
  "-v", "ON_ERROR_STOP=1", "-f", migration,
], { env: { ...process.env, PGPASSWORD: c.password }, stdio: ["ignore", "inherit", "inherit"] });
console.log("MIGRATION_APPLIED_OK", migration);

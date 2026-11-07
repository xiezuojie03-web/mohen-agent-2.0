// Step 2 batch A: apply the scanned-page migration to the local isolated DB.
// Uses the data-access connection (.env.local DATABASE_URL); prints no secrets.
import { execFileSync } from "node:child_process";
import { PSQL_PATH } from "../packages/data-access/src/index.mjs";
import { getConnection } from "../packages/data-access/src/index.mjs";

const migration = "supabase/migrations/20261107120000_mab_m2_private_scanned_page.sql";
const c = getConnection();
execFileSync(PSQL_PATH, [
  "-h", c.host, "-p", c.port, "-U", c.user, "-d", c.db,
  "-v", "ON_ERROR_STOP=1", "-f", migration,
], { env: { ...process.env, PGPASSWORD: c.password }, stdio: ["ignore", "inherit", "inherit"] });
console.log("MIGRATION_APPLIED_OK", migration);

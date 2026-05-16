import { sql } from "@vercel/postgres";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

async function migrate() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  const { rows: appliedRows } = await sql`SELECT version FROM schema_migrations`;
  const applied = new Set(appliedRows.map((r) => r.version as string));

  const migrationsDir = join(__dirname, "migrations");
  const files = readdirSync(migrationsDir).filter((f) => f.endsWith(".sql")).sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`✓ ${file} (already applied)`);
      continue;
    }
    console.log(`→ Applying ${file}`);
    const sqlText = readFileSync(join(migrationsDir, file), "utf8");
    const statements = sqlText
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    await sql.query("BEGIN");
    try {
      for (const stmt of statements) {
        await sql.query(stmt);
      }
      await sql`INSERT INTO schema_migrations (version) VALUES (${file})`;
      await sql.query("COMMIT");
      console.log(`✓ ${file} applied`);
    } catch (err) {
      await sql.query("ROLLBACK");
      throw err;
    }
  }
  console.log("All migrations up to date.");
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});

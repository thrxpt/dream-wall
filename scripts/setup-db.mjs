import { readFile } from "node:fs/promises";
import postgres from "postgres";

if (!process.env.DATABASE_URL) {
  console.error("Set DATABASE_URL in .env.local or the environment before running db:setup.");
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql.unsafe(await readFile(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Dream Wall database is ready. Existing dreams were preserved.");
} catch (error) {
  console.error("Database setup failed:", error.code ?? "connection error");
  process.exitCode = 1;
} finally {
  await sql.end();
}

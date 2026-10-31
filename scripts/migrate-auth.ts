import { getMigrations } from "better-auth/db/migration";
import { auth } from "../src/lib/auth";

// Loob Better Authi tabelid (user, session, organization, member, team, ...)
export async function migrateAuth() {
  const { runMigrations } = await getMigrations(auth.options);
  await runMigrations();
}

if (process.argv[1]?.endsWith("migrate-auth.ts")) {
  migrateAuth().then(() => console.log("Auth tabelid valmis"));
}

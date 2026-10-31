import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { organization } from "better-auth/plugins";
import { db } from "./db";
import { ac, manager, member, owner, trainer } from "./permissions";

export const auth = betterAuth({
  database: db,
  emailAndPassword: { enabled: true },
  databaseHooks: {
    session: {
      create: {
        // Sisselogimisel valitakse aktiivseks kasutaja esimene organisatsioon
        before: async (session) => {
          const row = db
            .prepare("SELECT organizationId FROM member WHERE userId = ? ORDER BY createdAt LIMIT 1")
            .get(session.userId) as { organizationId: string } | undefined;
          return { data: { ...session, activeOrganizationId: row?.organizationId ?? null } };
        },
      },
    },
  },
  plugins: [
    organization({
      ac,
      roles: { owner, manager, member, trainer },
      teams: { enabled: true },
    }),
    nextCookies(), // peab olema viimane
  ],
});

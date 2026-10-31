import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { db } from "./db";
import { HOME_FOR_ROLE, type Role } from "./permissions";

export type Membership = { orgId: string; orgName: string; role: Role };

export type Ctx = {
  user: { id: string; name: string; email: string };
  orgId: string;
  orgName: string;
  role: Role;
  team: { id: string; name: string } | null;
  memberships: Membership[];
};

// Kasutaja, tema aktiivne organisatsioon, roll selles ja tiim. Roll tuleb alati serverist,
// mitte kliendist, seega ei saa keegi URL-i muutes teise rolli vaadet näha.
export async function getCtx(): Promise<Ctx | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const memberships = db
    .prepare(
      `SELECT m.organizationId AS orgId, o.name AS orgName, m.role AS role
       FROM member m JOIN organization o ON o.id = m.organizationId
       WHERE m.userId = ? ORDER BY m.createdAt`,
    )
    .all(session.user.id) as Membership[];
  if (memberships.length === 0) return null;

  const active = memberships.find((m) => m.orgId === session.session.activeOrganizationId) ?? memberships[0];
  const team = db
    .prepare(
      `SELECT t.id, t.name FROM teamMember tm JOIN team t ON t.id = tm.teamId
       WHERE tm.userId = ? AND t.organizationId = ? LIMIT 1`,
    )
    .get(session.user.id, active.orgId) as { id: string; name: string } | undefined;

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    orgId: active.orgId,
    orgName: active.orgName,
    role: active.role,
    team: team ?? null,
    memberships,
  };
}

export async function requireRole(roles: Role[]): Promise<Ctx> {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  if (!roles.includes(ctx.role)) redirect(HOME_FOR_ROLE[ctx.role]);
  return ctx;
}

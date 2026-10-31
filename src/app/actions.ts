"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { HOME_FOR_ROLE } from "@/lib/permissions";
import { getCtx, requireRole } from "@/lib/session";

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Number(String(f.get(k) ?? "").replace(",", ".")) || 0;

export async function signIn(form: FormData) {
  try {
    await auth.api.signInEmail({ body: { email: str(form, "email"), password: str(form, "password") } });
  } catch {
    redirect("/login?viga=1");
  }
  redirect("/");
}

export async function signOut() {
  await auth.api.signOut({ headers: await headers() });
  redirect("/login");
}

export async function switchOrg(form: FormData) {
  const ctx = await getCtx();
  const orgId = str(form, "orgId");
  const target = ctx?.memberships.find((m) => m.orgId === orgId);
  if (!ctx || !target) redirect("/login");
  await auth.api.setActiveOrganization({ body: { organizationId: orgId }, headers: await headers() });
  redirect(HOME_FOR_ROLE[target.role]);
}

// Küsitlus enne koolitust: üks vastus iga koolitaja ette valmistatud kitsaskoha kohta
export async function saveSurvey(form: FormData) {
  const ctx = await requireRole(["member", "manager"]);
  if (!ctx.team) redirect("/kursused");
  const ids = (db.prepare("SELECT id FROM bottleneck WHERE team_id = ?").all(ctx.team.id) as { id: string }[]).map((r) => r.id);
  const upsert = db.prepare(
    `INSERT INTO survey_response (id, org_id, user_id, bottleneck_id, not_relevant, hours_week, reasons, other_reason, pain, stress, success_metric, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (user_id, bottleneck_id) DO UPDATE SET not_relevant = excluded.not_relevant, hours_week = excluded.hours_week,
       reasons = excluded.reasons, other_reason = excluded.other_reason, pain = excluded.pain, stress = excluded.stress,
       success_metric = excluded.success_metric, created_at = excluded.created_at`,
  );
  const now = new Date().toISOString();
  db.transaction(() => {
    for (const b of ids) {
      const notRelevant = form.get(`${b}:na`) ? 1 : 0;
      upsert.run(
        crypto.randomUUID(), ctx.orgId, ctx.user.id, b, notRelevant,
        notRelevant ? null : num(form, `${b}:hours`) || null,
        JSON.stringify(notRelevant ? [] : form.getAll(`${b}:reason`).map(String)),
        str(form, `${b}:other`) || null, str(form, `${b}:pain`) || null,
        notRelevant ? null : num(form, `${b}:stress`) || null, str(form, `${b}:success`) || null, now,
      );
    }
  })();
  revalidatePath("/kitsaskohad");
  redirect("/kusitlus?salvestatud=1");
}

// Enne/pärast lugu: tõstab oskuse tasemele 3 ja vähendab seotud kitsaskoha praegust aega
export async function addStory(form: FormData) {
  const ctx = await requireRole(["member", "manager"]);
  const skillId = str(form, "skill");
  const skill = db.prepare("SELECT s.id FROM skill s JOIN course c ON c.id = s.course_id WHERE s.id = ? AND c.org_id = ?").get(skillId, ctx.orgId);
  if (!skill) redirect("/lood/uus?viga=1");
  const bottleneckId = str(form, "bottleneck") || null;
  const now = new Date().toISOString();
  db.prepare("INSERT INTO story VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    crypto.randomUUID(), ctx.orgId, ctx.user.id, skillId, bottleneckId, str(form, "task"), str(form, "before"), str(form, "after"),
    Math.round(num(form, "beforeMin")), Math.round(num(form, "afterMin")), Math.max(1, Math.round(num(form, "perMonth"))),
    str(form, "outcome") || null, str(form, "stress") || null, str(form, "freed") || null, now,
  );
  db.prepare(
    `INSERT INTO user_skill (user_id, skill_id, level, evidence, updated_at) VALUES (?, ?, 3, 'lugu', ?)
     ON CONFLICT (user_id, skill_id) DO UPDATE SET level = max(level, 3), updated_at = excluded.updated_at`,
  ).run(ctx.user.id, skillId, now);
  revalidatePath("/", "layout");
  redirect("/oskused?lisatud=1");
}

// Harjutus on tehtud: oskus tõuseb tasemele 2 (kui oli madalam)
export async function completeExercise(skillName: string) {
  const ctx = await requireRole(["member", "manager"]);
  const skill = db
    .prepare("SELECT s.id FROM skill s JOIN course c ON c.id = s.course_id WHERE c.org_id = ? AND s.name = ?")
    .get(ctx.orgId, skillName) as { id: string } | undefined;
  if (!skill) return;
  db.prepare(
    `INSERT INTO user_skill (user_id, skill_id, level, evidence, updated_at) VALUES (?, ?, 2, 'harjutus', ?)
     ON CONFLICT (user_id, skill_id) DO UPDATE SET level = max(level, 2), updated_at = excluded.updated_at`,
  ).run(ctx.user.id, skill.id, new Date().toISOString());
  revalidatePath("/oskused");
}

export async function markMaterialDone(form: FormData) {
  const ctx = await requireRole(["member", "manager"]);
  const materialId = str(form, "materialId");
  const ok = db.prepare("SELECT 1 FROM material WHERE id = ? AND org_id = ?").get(materialId, ctx.orgId);
  if (ok) db.prepare("INSERT OR IGNORE INTO material_done VALUES (?, ?, ?)").run(materialId, ctx.user.id, new Date().toISOString());
  revalidatePath("/kursused");
}

// Koolitaja lisab materjali kogu organisatsioonile või ühele tiimile
export async function addMaterial(form: FormData) {
  const ctx = await requireRole(["trainer"]);
  const teamId = str(form, "team") || null;
  if (teamId && !db.prepare("SELECT 1 FROM team WHERE id = ? AND organizationId = ?").get(teamId, ctx.orgId)) redirect("/koolitaja?viga=1");
  const title = str(form, "title");
  if (!title) redirect("/koolitaja?viga=1");
  db.prepare("INSERT INTO material VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
    crypto.randomUUID(), ctx.orgId, teamId, str(form, "skill") || null, str(form, "bottleneck") || null,
    title, str(form, "description"), str(form, "kind") || "Juhend", str(form, "url") || null,
    Math.max(1, Math.round(num(form, "minutes"))), ctx.user.id, new Date().toISOString(),
  );
  revalidatePath("/koolitaja");
  redirect("/koolitaja?lisatud=1");
}

export async function deleteMaterial(form: FormData) {
  const ctx = await requireRole(["trainer"]);
  const materialId = str(form, "materialId");
  db.prepare("DELETE FROM material_done WHERE material_id IN (SELECT id FROM material WHERE id = ? AND org_id = ?)").run(materialId, ctx.orgId);
  db.prepare("DELETE FROM material WHERE id = ? AND org_id = ?").run(materialId, ctx.orgId);
  revalidatePath("/koolitaja");
}

import { db } from "./db";

// Kõik päringud on organisatsiooni (ja vajadusel tiimi) põhised.

export const WEEKS_PER_MONTH = 4.33;
export const LEVELS = ["Tean", "Oskan", "Kasutan", "Õpetan"] as const;

export type Skill = { id: string; name: string; description: string };
export type Team = { id: string; name: string; memberCount: number };
export type Story = {
  id: string; user_id: string; userName: string; skill_id: string; skillName: string; bottleneck_id: string | null;
  task: string; before_text: string; after_text: string; before_min: number; after_min: number; per_month: number;
  outcome: string | null; stress_effect: string | null; freed_use: string | null; created_at: string;
};
export type Bottleneck = {
  id: string; team_id: string; teamName: string; name: string; question: string; reason: string; ai_potential: string;
  people: number; baseline_h_week: number; outcome: string | null; outcome_source: string | null;
  saved_h_month: number; stories: number;
};

const q = <T>(sql: string, ...args: unknown[]) => db.prepare(sql).all(...args) as T[];
const one = <T>(sql: string, ...args: unknown[]) => db.prepare(sql).get(...args) as T | undefined;

export const savedHours = (s: { before_min: number; after_min: number; per_month: number }) =>
  Math.max(0, s.before_min - s.after_min) * s.per_month / 60;

// Kumulatiivne väärtus eurodes: iga lugu on säästnud aega alates lisamisest (vähemalt üks kuu)
export function cumulativeValue(list: Story[], hourlyRate: number) {
  const now = Date.now();
  return list.reduce((sum, x) => sum + savedHours(x) * Math.max(1, (now - new Date(x.created_at).getTime()) / (30.4 * 864e5)), 0) * hourlyRate;
}

export function settings(orgId: string) {
  return one<{ training_date: string; hourly_rate: number; investment_eur: number; licenses: number; weekly_active: number }>(
    "SELECT * FROM org_settings WHERE org_id = ?", orgId,
  )!;
}

export function teams(orgId: string) {
  return q<Team>("SELECT id, name, memberCount FROM team WHERE organizationId = ? ORDER BY memberCount DESC", orgId);
}

export function teamMembers(teamId: string) {
  return q<{ id: string; name: string; role: string }>(
    `SELECT u.id, u.name, m.role FROM teamMember tm JOIN user u ON u.id = tm.userId
     JOIN team t ON t.id = tm.teamId JOIN member m ON m.userId = u.id AND m.organizationId = t.organizationId
     WHERE tm.teamId = ? ORDER BY u.name`, teamId,
  );
}

export function orgMemberCount(orgId: string) {
  return one<{ c: number }>(
    "SELECT count(DISTINCT tm.userId) c FROM teamMember tm JOIN team t ON t.id = tm.teamId WHERE t.organizationId = ?", orgId,
  )!.c;
}

export function orgSkills(orgId: string) {
  return q<Skill>(
    `SELECT s.id, s.name, s.description FROM skill s JOIN course c ON c.id = s.course_id
     WHERE c.org_id = ? ORDER BY s.sort`, orgId,
  );
}

export function userLevels(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, Map<string, number>>();
  const rows = q<{ user_id: string; skill_id: string; level: number }>(
    `SELECT user_id, skill_id, level FROM user_skill WHERE user_id IN (${userIds.map(() => "?").join(",")})`, ...userIds,
  );
  const map = new Map<string, Map<string, number>>();
  for (const r of rows) {
    if (!map.has(r.user_id)) map.set(r.user_id, new Map());
    map.get(r.user_id)!.set(r.skill_id, r.level);
  }
  return map;
}

export function stories(orgId: string, opts: { teamId?: string; userId?: string; limit?: number } = {}) {
  const where = ["s.org_id = ?"];
  const args: unknown[] = [orgId];
  if (opts.teamId) { where.push("s.user_id IN (SELECT userId FROM teamMember WHERE teamId = ?)"); args.push(opts.teamId); }
  if (opts.userId) { where.push("s.user_id = ?"); args.push(opts.userId); }
  return q<Story>(
    `SELECT s.*, u.name userName, k.name skillName FROM story s JOIN user u ON u.id = s.user_id JOIN skill k ON k.id = s.skill_id
     WHERE ${where.join(" AND ")} ORDER BY s.created_at DESC ${opts.limit ? `LIMIT ${Number(opts.limit)}` : ""}`, ...args,
  );
}

export function bottlenecks(orgId: string, teamId?: string) {
  const rows = q<Omit<Bottleneck, "saved_h_month" | "stories"> & { saved_min: number | null; stories: number }>(
    `SELECT b.*, t.name teamName,
       (SELECT sum(max(0, s.before_min - s.after_min) * s.per_month) FROM story s WHERE s.bottleneck_id = b.id) saved_min,
       (SELECT count(*) FROM story s WHERE s.bottleneck_id = b.id) stories
     FROM bottleneck b JOIN team t ON t.id = b.team_id
     WHERE b.org_id = ? ${teamId ? "AND b.team_id = ?" : ""} ORDER BY b.baseline_h_week DESC`,
    ...(teamId ? [orgId, teamId] : [orgId]),
  );
  return rows.map(({ saved_min, ...r }) => ({ ...r, saved_h_month: (saved_min ?? 0) / 60 })) as Bottleneck[];
}

// Praegu kulub nädalas = baasjoon − lugudega säästetud aeg
export const currentWeek = (b: Bottleneck) => Math.max(0, b.baseline_h_week - b.saved_h_month / WEEKS_PER_MONTH);

export function pulse(orgId: string, teamId?: string) {
  const rows = q<{ month: string; workload_ok: number; stress: number; overtime_h: number; respondents: number }>(
    `SELECT month, sum(workload_ok * respondents) / sum(respondents) workload_ok, sum(stress * respondents) / sum(respondents) stress,
       sum(overtime_h * respondents) / sum(respondents) overtime_h, sum(respondents) respondents
     FROM pulse WHERE org_id = ? ${teamId ? "AND team_id = ?" : ""} GROUP BY month ORDER BY month`,
    ...(teamId ? [orgId, teamId] : [orgId]),
  );
  return { before: rows[0], now: rows[rows.length - 1] };
}

export function surveyReasons(orgId: string) {
  const rows = q<{ user_id: string; reasons: string; other_reason: string | null }>(
    "SELECT user_id, reasons, other_reason FROM survey_response WHERE org_id = ? AND not_relevant = 0", orgId,
  );
  const respondents = new Set(rows.map((r) => r.user_id)).size;
  const byUser = new Map<string, Set<string>>();
  let other = 0;
  for (const r of rows) {
    if (!byUser.has(r.user_id)) byUser.set(r.user_id, new Set());
    for (const x of JSON.parse(r.reasons) as string[]) byUser.get(r.user_id)!.add(x);
    if (r.other_reason) other++;
  }
  const counts = new Map<string, number>();
  for (const set of byUser.values()) for (const x of set) counts.set(x, (counts.get(x) ?? 0) + 1);
  return {
    respondents,
    reasons: [...counts.entries()].map(([name, c]) => ({ name, pct: Math.round((c / respondents) * 100) })).sort((a, b) => b.pct - a.pct),
    other,
  };
}

export function courses(orgId: string, userId: string) {
  return q<{ id: string; title: string; description: string; color: string; icon: string; lessons_total: number; lessons_done: number | null }>(
    `SELECT c.*, e.lessons_done FROM course c LEFT JOIN enrollment e ON e.course_id = c.id AND e.user_id = ?
     WHERE c.org_id = ? OR c.org_id IS NULL ORDER BY c.sort`, userId, orgId,
  );
}

export function materials(orgId: string, opts: { teamId?: string | null; userId?: string } = {}) {
  const scope = opts.teamId !== undefined ? "AND (m.team_id IS NULL OR m.team_id = ?)" : "";
  const args: unknown[] = [opts.userId ?? "", orgId];
  if (opts.teamId !== undefined) args.push(opts.teamId);
  return q<{
    id: string; title: string; description: string; kind: string; url: string | null; minutes: number; created_at: string; bottleneck_id: string | null;
    teamName: string | null; skillName: string | null; bottleneckName: string | null; doneCount: number; doneByMe: number;
  }>(
    `SELECT m.*, t.name teamName, k.name skillName, b.name bottleneckName,
       (SELECT count(*) FROM material_done d WHERE d.material_id = m.id) doneCount,
       (SELECT count(*) FROM material_done d WHERE d.material_id = m.id AND d.user_id = ?) doneByMe
     FROM material m LEFT JOIN team t ON t.id = m.team_id LEFT JOIN skill k ON k.id = m.skill_id LEFT JOIN bottleneck b ON b.id = m.bottleneck_id
     WHERE m.org_id = ? ${scope} ORDER BY m.created_at DESC`, ...args,
  );
}

export function surveyFor(userId: string, teamId: string) {
  return q<{ bottleneck_id: string; name: string; question: string; not_relevant: number | null; hours_week: number | null;
    reasons: string | null; other_reason: string | null; pain: string | null; stress: number | null; success_metric: string | null }>(
    `SELECT b.id bottleneck_id, b.name, b.question, r.not_relevant, r.hours_week, r.reasons, r.other_reason, r.pain, r.stress, r.success_metric
     FROM bottleneck b LEFT JOIN survey_response r ON r.bottleneck_id = b.id AND r.user_id = ?
     WHERE b.team_id = ? ORDER BY b.baseline_h_week DESC`, userId, teamId,
  );
}

export const fmtH = (h: number) => (h >= 10 ? Math.round(h).toString() : (Math.round(h * 10) / 10).toString().replace(".", ","));
export const fmtNum = (n: number) => Math.round(n).toLocaleString("et-EE");
export const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("et-EE", { day: "numeric", month: "short" });

import { Page } from "@/components/Page";
import Link from "next/link";
import { markMaterialDone } from "@/app/actions";
import { BAR_TRACK, CourseIcon } from "@/components/CourseIcon";
import { courses, fmtDate, materials, orgSkills, userLevels } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function KursusedPage() {
  const ctx = await requireRole(["member", "manager"]);
  const list = courses(ctx.orgId, ctx.user.id);
  const mats = materials(ctx.orgId, { teamId: ctx.team?.id ?? null, userId: ctx.user.id });
  const open = mats.filter((m) => !m.doneByMe);
  const skillCount = orgSkills(ctx.orgId).length;
  const myLevels = userLevels([ctx.user.id]).get(ctx.user.id) ?? new Map();
  const atWork = [...myLevels.values()].filter((l) => l >= 3).length;
  const next = open[0];

  return (
    <Page>
      <h1 className="title" style={{ fontSize: 52, marginTop: 44 }}>Minu <span className="blue">kursused</span></h1>

      <div className="resume">
        <div className="rbar" />
        <div style={{ flex: 1 }}>
          <div className="mono small" style={{ color: "#8B4FB5", marginBottom: 4 }}>Jätka sealt, kus pooleli jäid</div>
          <div style={{ fontSize: 17, fontWeight: 600 }}>{next ? next.title : "Ajastatud ülesanded · Harjutus 2 / 4"}</div>
          <div className="muted small" style={{ marginTop: 2 }}>{next ? `${next.kind} · ~${next.minutes} min · lisas koolitaja` : "~5 min"}</div>
        </div>
        <Link transitionTypes={["nav-forward"]} className="btn" href="/harjutus">Jätka →</Link>
      </div>

      <div className="courses">
        {list.map((c) => {
          const pct = c.lessons_done ? Math.round((c.lessons_done / c.lessons_total) * 100) : 0;
          const isOrgCourse = c.icon === "arch";
          return (
            <Link transitionTypes={["nav-forward"]} key={c.id} href={isOrgCourse ? "/oskused" : "/kursused"} className="course" style={{ background: c.color }}>
              <CourseIcon icon={c.icon} />
              <div className="ct">{c.title}</div>
              <div className="cd">{c.description}</div>
              <div className="cspacer" />
              <div className="cbar" style={{ background: BAR_TRACK[c.color] }}><i style={{ width: `${pct}%` }} /></div>
              <div className="cmeta">
                {c.lessons_done ? `${pct}%, ${c.lessons_done} õppetundi ${c.lessons_total}-st` : `${c.lessons_total} õppetundi`}
                {isOrgCourse && skillCount ? ` · ${atWork} oskust tööl kasutusel` : ""}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="card" style={{ marginTop: 24 }}>
        <div className="krow"><h3>Koolitaja lisatud materjalid</h3><span className="muted small">{open.length} tegemata · {mats.length - open.length} tehtud</span></div>
        <p className="sub">Koolitaja valib need sinu tiimi kitsaskohtade järgi.</p>
        {mats.length === 0 ? <div className="empty">Koolitaja pole veel materjale lisanud.</div> : null}
        {mats.map((m) => (
          <div key={m.id} className="mat">
            <span className="kind">{m.kind}</span>
            <div className="mt">
              <b>{m.title}</b>
              <span className="muted small">{m.description} · ~{m.minutes} min · {m.teamName ?? "kogu firmale"} · {fmtDate(m.created_at)}</span>
            </div>
            {m.url ? <a className="btn ghost sm" href={m.url} target="_blank" rel="noreferrer">Ava</a> : null}
            {m.doneByMe ? (
              <span className="pill ok">Tehtud</span>
            ) : (
              <form action={markMaterialDone}>
                <input type="hidden" name="materialId" value={m.id} />
                <button className="btn sm" type="submit">Märgi tehtuks</button>
              </form>
            )}
          </div>
        ))}
      </div>
    </Page>
  );
}

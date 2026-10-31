import { Page } from "@/components/Page";
import Link from "next/link";
import { bottlenecks, fmtDate, fmtH, orgSkills, savedHours, settings, stories, teamMembers, teams, userLevels } from "@/lib/data";
import { requireRole } from "@/lib/session";

const heat = (n: number) => (n === 0 ? "h0" : n <= 2 ? "h1" : n <= 5 ? "h2" : "h3");

export default async function JuhtPage({ searchParams }: { searchParams: Promise<{ tiim?: string }> }) {
  const ctx = await requireRole(["manager", "owner"]);
  const all = teams(ctx.orgId);
  const { tiim } = await searchParams;
  // Juht näeb oma tiimi, omanik saab kõiki tiime vaadata
  const team = ctx.role === "owner" ? all.find((t) => t.id === tiim) ?? all[0] : ctx.team;
  if (!team) return <p className="lead" style={{ marginTop: 44 }}>Sa ei juhi ühtegi tiimi.</p>;

  const people = teamMembers(team.id);
  const ids = people.map((p) => p.id);
  const levels = userLevels(ids);
  const skills = orgSkills(ctx.orgId);
  const teamStories = stories(ctx.orgId, { teamId: team.id });
  const bns = bottlenecks(ctx.orgId, team.id);
  const s = settings(ctx.orgId);

  const maxLevel = (uid: string) => Math.max(0, ...(levels.get(uid)?.values() ?? []));
  const atWork = people.filter((p) => maxLevel(p.id) >= 3);
  const practiced = people.filter((p) => maxLevel(p.id) >= 2);
  const hours = teamStories.reduce((sum, x) => sum + savedHours(x), 0);
  const moving = bns.filter((b) => b.saved_h_month > 0);
  const firstStory = new Map<string, string>();
  for (const st of [...teamStories].reverse()) if (!firstStory.has(st.user_id)) firstStory.set(st.user_id, st.created_at);
  const days = [...firstStory.values()].map((d) => (new Date(d).getTime() - new Date(s.training_date).getTime()) / 864e5).sort((a, b) => a - b);
  const medianDays = days.length ? Math.round(days[Math.floor(days.length / 2)]) : null;

  const heatRows = skills.map((sk) => {
    const counts = [1, 2, 3, 4].map((l) => people.filter((p) => levels.get(p.id)?.get(sk.id) === l).length);
    return { skill: sk, counts, pct: Math.round(((counts[2] + counts[3]) / people.length) * 100) };
  });

  // Soovitused tulevad otse andmetest
  const gaps = heatRows.filter((r) => r.pct < 15);
  const expertFor = (skillId: string) => people.find((p) => levels.get(p.id)?.get(skillId) === 4);
  const untouched = bns.filter((b) => b.saved_h_month === 0);
  const withStory = new Set(teamStories.map((x) => x.user_id));
  const readyNoStory = people.filter((p) => maxLevel(p.id) === 2 && !withStory.has(p.id));

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 36 }}>{ctx.orgName} · {team.name} · {people.length} inimest</div>
      <h1 className="title" style={{ fontSize: 40 }}>Kas tiim kasutab AI-d <span className="blue">päriselt</span>?</h1>
      {ctx.role === "owner" ? (
        <div className="filters">{all.map((t) => <Link key={t.id} href={`/juht?tiim=${t.id}`} className="fsel" style={t.id === team.id ? { borderColor: "#8B4FB5" } : undefined}>{t.name}</Link>)}</div>
      ) : null}

      <div className="kpis">
        <div className="kpi hl"><div className="krow"><div className="label">Kasutab tööl (tase 3+)</div><span className="src story">Lood</span></div>
          <div className="num">{atWork.length} / {people.length}</div><div className="cmp" style={{ color: "#1F3F80" }}>enne koolitust 0</div></div>
        <div className="kpi lime"><div className="krow"><div className="label">Aja kokkuhoid</div><span className="src story">Lood</span></div>
          <div className="num">{fmtH(hours)} h / kuus</div><div className="cmp" style={{ color: "#3D4A12" }}>{teamStories.length} lugu</div></div>
        <div className="kpi"><div className="krow"><div className="label">Kitsaskohti edenemas</div><span className="src acad">Baasjoon</span></div>
          <div className="num">{moving.length} / {bns.length}</div><div className="cmp">{untouched.length} puudutamata</div></div>
        <div className="kpi"><div className="krow"><div className="label">Harjutanud (tase 2+)</div><span className="src acad">Academy</span></div>
          <div className="num">{practiced.length} / {people.length}</div><div className="cmp">{Math.round((practiced.length / people.length) * 100)}% tiimist</div></div>
        <div className="kpi"><div className="krow"><div className="label">Esimese looni</div><span className="src acad">Academy</span></div>
          <div className="num">{medianDays ?? "–"} päeva</div><div className="cmp">mediaan koolitusest</div></div>
      </div>

      <div className="grid" style={{ marginTop: 20 }}>
        <div className="col-main">
          <div className="card">
            <div className="krow"><h3>Oskuste soojuskaart</h3><span className="src story">Academy + lood</span></div>
            <p className="sub">Mitu inimest on iga oskuse igal tasemel. Tumedam = rohkem inimesi.</p>
            <table className="heat">
              <thead><tr><th style={{ width: 240 }}>Oskus</th><th>1 · Tean</th><th>2 · Oskan</th><th>3 · Kasutan tööl</th><th>4 · Õpetan</th><th>Tööl (3+)</th></tr></thead>
              <tbody>
                {heatRows.map((r) => (
                  <tr key={r.skill.id}>
                    <td>{r.skill.name}</td>
                    {r.counts.map((c, i) => <td key={i}><span className={`hc ${heat(c)}`}>{c}</span></td>)}
                    <td><b style={r.pct < 15 ? { color: "#B4531A" } : undefined}>{r.pct}%</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="krow"><h3>Tiimi edusammud</h3><span className="muted small">viimased lood</span></div>
            {teamStories.slice(0, 5).map((st) => (
              <div className="pend" key={st.id}>
                <div className="av" style={{ background: "#F2DE7C", width: 30, height: 30, fontSize: 11 }}>{st.userName.split(" ").map((x) => x[0]).join("")}</div>
                <div className="pt"><b>{st.userName}</b> · {st.skillName} · {fmtDate(st.created_at)}<br />
                  <span className="muted small">{st.task}: {st.before_min} → {st.after_min} min{st.outcome ? ` · ${st.outcome}` : ""}</span></div>
                <span className="pill" style={{ background: "#D6E89A", color: "#3D4A12" }}>≈ {fmtH(savedHours(st))} h/kuus</span>
              </div>
            ))}
          </div>
        </div>

        <div className="col-side" style={{ width: 440 }}>
          <div className="card">
            <div className="krow"><h3>Soovitused</h3><span className="muted small">andmete põhjal</span></div>
            {gaps.slice(0, 2).map((g) => {
              const expert = expertFor(g.skill.id);
              return (
                <div className="reco" key={g.skill.id}><span className="pri hi">KÕRGE</span>
                  <div className="rt">{g.skill.name}: tööl ainult {g.pct}% tiimist</div>
                  <div className="rd">{expert ? `${expert.name} on selles tasemel 4. Palu tal teha tiimile 30-min sessioon.` : "Tiimis pole veel eksperti. Aruta koolitajaga lisatöötuba."}</div>
                </div>
              );
            })}
            {readyNoStory.length ? (
              <div className="reco"><span className="pri mid">KESKMINE</span>
                <div className="rt">{readyNoStory.length} inimest oskab, aga pole veel tööl proovinud</div>
                <div className="rd">Nad on tasemel 2. Soovita igaühele üks ülesanne tema enda kitsaskohtadest.</div>
              </div>
            ) : null}
            {moving[0] ? (
              <div className="reco" style={{ marginBottom: 0 }}><span className="pri op">VÕIMALUS</span>
                <div className="rt">„{moving[0].name}“ paraneb kõige rohkem</div>
                <div className="rd">Jaga seda töövoogu kolleegidega, kes teevad sama tööd veel käsitsi.</div>
              </div>
            ) : null}
          </div>

          <div className="card">
            <div className="krow"><h3>Koostöö koolitajaga</h3><span className="src acad">Baasjoon</span></div>
            <p className="sub" style={{ marginBottom: 10 }}>Koolitaja näeb sama koondpilti. Arutage, mida järgmiseks koos muuta.</p>
            {untouched.map((b) => <div className="wb" key={b.id}><span><b>{b.name}</b> · {b.people} inimest</span><span className="pill wait">Puudutamata</span></div>)}
            {gaps.slice(0, 1).map((g) => <div className="wb" key={g.skill.id} style={{ borderBottom: "none" }}><span><b>{g.skill.name}</b> · tööl {g.pct}%</span><span className="pill" style={{ background: "#FDE2EA", color: "#9B1C4A" }}>Lünk</span></div>)}
            <a className="btn sm" style={{ marginTop: 12 }} href={`mailto:koolitaja@aieesti.ee?subject=${encodeURIComponent(`${ctx.orgName}: järgmine töötuba`)}`}>Broneeri kõne koolitajaga</a>
          </div>
        </div>
      </div>
    </Page>
  );
}

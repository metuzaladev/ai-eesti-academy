import { Page } from "@/components/Page";
import Link from "next/link";
import { Cell } from "@/components/Levels";
import { orgSkills, teamMembers, teams, userLevels } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function TiimPage({ searchParams }: { searchParams: Promise<{ tiim?: string }> }) {
  const ctx = await requireRole(["member", "manager", "owner"]);
  const all = teams(ctx.orgId);
  const { tiim } = await searchParams;
  // Omanik saab tiime vahetada, teised näevad oma tiimi
  const team = ctx.role === "owner" ? all.find((t) => t.id === tiim) ?? all[0] : ctx.team;
  if (!team) return <p className="lead" style={{ marginTop: 44 }}>Sa ei kuulu ühtegi tiimi.</p>;

  const skills = orgSkills(ctx.orgId);
  const people = teamMembers(team.id);
  const levels = userLevels(people.map((p) => p.id));
  const experts = skills.flatMap((s) => people.filter((p) => levels.get(p.id)?.get(s.id) === 4).map((p) => ({ ...p, skill: s.name })));

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 44 }}>{ctx.orgName} · {team.name}</div>
      <h1 className="title">Kes mida <span className="blue">oskab</span></h1>
      <p className="lead">Näed, millised oskused tiimil on olemas ja kellelt abi küsida. Tase põhineb tõenditel, mitte enesehinnangul.</p>
      {ctx.role === "owner" ? (
        <div className="filters">{all.map((t) => <Link key={t.id} href={`/tiim?tiim=${t.id}`} className="fsel" style={t.id === team.id ? { borderColor: "#8B4FB5" } : undefined}>{t.name}</Link>)}</div>
      ) : null}
      <div className="grid">
        <div className="col-main">
          <div className="card">
            <table>
              <thead><tr><th style={{ width: 220 }}>Kolleeg</th>{skills.map((s) => <th key={s.id}>{s.name}</th>)}</tr></thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className={p.id === ctx.user.id ? "me" : undefined}>
                    <td><b>{p.name}</b>{p.id === ctx.user.id ? " (sina)" : ""}</td>
                    {skills.map((s) => <td key={s.id}><Cell level={levels.get(p.id)?.get(s.id) ?? 0} /></td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="legend"><span><i style={{ background: "#EEEBF2" }} />Puudub</span><span><i style={{ background: "#8B4FB5" }} />1 Tean · 2 Oskan · 3 Kasutan tööl</span><span><i style={{ background: "#2F7D4F" }} />4 Õpetan teisi</span></div>
          </div>
        </div>
        <div className="col-side">
          <div className="card">
            <h3>Tiimi eksperdid</h3>
            <p className="sub">Inimesed, kes on oskuse kolleegile edasi andnud (tase 4).</p>
            {experts.length === 0 ? <div className="empty">Veel pole kedagi tasemel 4.</div> : null}
            {experts.map((e) => (
              <div className="person" key={`${e.id}-${e.skill}`}>
                <div className="av" style={{ background: "#E8BCCB" }}>{e.name.split(" ").map((x) => x[0]).join("")}</div>
                <div className="who"><b>{e.name}</b><br /><span className="muted">{e.skill}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Page>
  );
}

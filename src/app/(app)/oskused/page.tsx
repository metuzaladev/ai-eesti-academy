import { Page } from "@/components/Page";
import Link from "next/link";
import { Levels } from "@/components/Levels";
import { fmtDate, fmtH, orgSkills, savedHours, stories, teamMembers, userLevels } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function OskusedPage({ searchParams }: { searchParams: Promise<{ lisatud?: string }> }) {
  const ctx = await requireRole(["member", "manager"]);
  const { lisatud } = await searchParams;
  const skills = orgSkills(ctx.orgId);
  const mine = userLevels([ctx.user.id]).get(ctx.user.id) ?? new Map<string, number>();
  const myStories = stories(ctx.orgId, { userId: ctx.user.id });
  const hours = myStories.reduce((s, x) => s + savedHours(x), 0);
  const atWork = skills.filter((s) => (mine.get(s.id) ?? 0) >= 3).length;

  // Järgmine samm: esimene oskus tasemel 2 (vaja lugu) või tasemel 1 (vaja harjutust)
  const lvl = (id: string) => mine.get(id) ?? 0;
  const nextSkill = skills.find((s) => lvl(s.id) === 2) ?? skills.find((s) => lvl(s.id) <= 1);

  // Kolleegid, kes oskavad seda, mida mina veel tööl ei kasuta
  const colleagues = ctx.team ? teamMembers(ctx.team.id).filter((m) => m.id !== ctx.user.id) : [];
  const theirLevels = userLevels(colleagues.map((c) => c.id));
  const helpers = skills
    .filter((s) => lvl(s.id) < 3)
    .flatMap((s) => colleagues.filter((c) => theirLevels.get(c.id)?.get(s.id) === 4).map((c) => ({ ...c, skill: s.name })))
    .slice(0, 3);

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 44 }}>{ctx.orgName}{ctx.team ? ` · ${ctx.team.name}` : ""}</div>
      <h1 className="title">Tere, {ctx.user.name.split(" ")[0]}. Siin on sinu <span className="blue">oskused</span>.</h1>
      <p className="lead">Iga oskus liigub tasemelt „Tean“ tasemele „Õpetan teisi“, kui näitad, et kasutad seda päriselt oma töös.</p>
      {lisatud ? <div className="notice">Lugu lisatud. Oskus tõusis tasemele „Kasutan tööl“ ja juht näeb sinu edenemist tiimi ülevaates.</div> : null}

      <div className="kpis">
        <div className="kpi"><div className="label">Oskusi tööl kasutusel</div><div className="num">{atWork} / {skills.length}</div></div>
        <div className="kpi"><div className="label">Enne/pärast lugusid</div><div className="num">{myStories.length}</div>
          <div className="delta">{myStories[0] ? `viimane ${fmtDate(myStories[0].created_at)}` : "lisa esimene lugu"}</div></div>
        <div className="kpi lime"><div className="label">Sinu aja kokkuhoid</div><div className="num">~{fmtH(hours)} h / kuus</div>
          <div className="delta" style={{ color: "#3D4A12" }}>sinu lugude põhjal</div></div>
      </div>

      <div className="grid">
        <div className="col-main">
          <div className="card">
            <h3>Oskuste kaart</h3>
            <p className="sub">Tase tõuseb tõendiga: tund → praktiline ülesanne → enne/pärast lugu tööst → aitasid kolleegi.</p>
            {skills.map((s) => {
              const l = lvl(s.id);
              const story = myStories.find((x) => x.skill_id === s.id);
              return (
                <div className="skill" key={s.id}>
                  <div className="name"><b>{s.name}</b><span>{s.description}</span></div>
                  <Levels level={l} />
                  <div className="evid">
                    {story ? `„${story.task}“: ${story.before_min} min → ${story.after_min} min` : l === 2 ? "Harjutus tehtud, tööl veel kasutamata" : l === 1 ? "Tund läbitud, harjutus tegemata" : "Alustamata"}
                  </div>
                  {l >= 3 ? <span className={`pill ${l === 4 ? "ok" : "lvlpill"}`}>Tase {l}</span>
                    : l === 2 ? <Link transitionTypes={["nav-forward"]} className="btn ghost" href={`/lood/uus?oskus=${s.id}`}>Lisa lugu</Link>
                    : <Link transitionTypes={["nav-forward"]} className="btn ghost" href="/harjutus">Tee ülesanne</Link>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="col-side">
          {nextSkill ? (
            <div className="card next">
              <div className="eyebrow" style={{ color: "#8B4FB5" }}>Sinu järgmine samm · 5 min</div>
              <h3>{lvl(nextSkill.id) === 2 ? `Kasuta „${nextSkill.name}“ päris töös` : `Harjuta: ${nextSkill.name}`}</h3>
              <p className="sub" style={{ marginTop: 8 }}>
                {lvl(nextSkill.id) === 2 ? "Vali üks korduv tööülesanne, tee see AI-ga ja lisa enne/pärast lugu." : "Tee lühike praktiline harjutus, AI annab kohe tagasisidet."}
              </p>
              <Link transitionTypes={["nav-forward"]} className="btn" href={lvl(nextSkill.id) === 2 ? `/lood/uus?oskus=${nextSkill.id}` : "/harjutus"}>
                {lvl(nextSkill.id) === 2 ? "Lisa enne/pärast lugu" : "Ava harjutus"}
              </Link>
            </div>
          ) : null}

          <div className="card">
            <h3>Minu viimased lood</h3>
            <p className="sub">Tõendid sellest, mis sinu töös muutus.</p>
            {myStories.length === 0 ? <div className="empty">Lugusid veel pole.</div> : null}
            {myStories.slice(0, 3).map((s) => (
              <div className="story" key={s.id}>
                <div className="t">{s.task}</div>
                <div className="ba"><div className="b">Enne: {s.before_min} min</div><div className="a">Pärast: {s.after_min} min, {s.per_month}× kuus</div></div>
                <span className="pill ok">Lisatud {fmtDate(s.created_at)} · {s.skillName}</span>
              </div>
            ))}
          </div>

          {helpers.length ? (
            <div className="card">
              <h3>Küsi kolleegilt</h3>
              <p className="sub">Oskus, mida sa veel ei kasuta, aga kolleeg juba oskab.</p>
              {helpers.map((h) => (
                <div className="person" key={`${h.id}-${h.skill}`}>
                  <div className="av" style={{ background: "#E8BCCB" }}>{h.name.split(" ").map((p) => p[0]).join("")}</div>
                  <div className="who"><b>{h.name}</b><br /><span className="muted">{h.skill} · tase 4</span></div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Page>
  );
}

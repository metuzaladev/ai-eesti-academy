import { Page } from "@/components/Page";
import { bottlenecks, cumulativeValue, currentWeek, fmtH, fmtNum, orgMemberCount, pulse, savedHours, settings, stories, surveyReasons, teamMembers, teams, userLevels, WEEKS_PER_MONTH } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function OmanikPage() {
  const ctx = await requireRole(["owner"]);
  const s = settings(ctx.orgId);
  const all = stories(ctx.orgId);
  const monthly = all.reduce((sum, x) => sum + savedHours(x), 0);
  const cumulative = cumulativeValue(all, s.hourly_rate);
  const payback = cumulative / s.investment_eur;
  const people = orgMemberCount(ctx.orgId);
  const teamList = teams(ctx.orgId);
  const allIds = teamList.flatMap((t) => teamMembers(t.id).map((m) => m.id));
  const levels = userLevels(allIds);
  const atWork = allIds.filter((id) => Math.max(0, ...(levels.get(id)?.values() ?? [])) >= 3).length;
  const p = pulse(ctx.orgId);
  const reasons = surveyReasons(ctx.orgId);

  // Tööjaotus ja kitsaskohad kogu firma kohta (sama nimega kitsaskohad liidetakse)
  const bns = bottlenecks(ctx.orgId);
  const byName = new Map<string, { baseline: number; current: number; saved: number; outcome: string | null; source: string | null }>();
  for (const b of bns) {
    const r = byName.get(b.name) ?? { baseline: 0, current: 0, saved: 0, outcome: null, source: null };
    r.baseline += b.baseline_h_week * WEEKS_PER_MONTH;
    r.current += currentWeek(b) * WEEKS_PER_MONTH;
    r.saved += b.saved_h_month;
    r.outcome ??= b.outcome;
    r.source ??= b.outcome_source;
    byName.set(b.name, r);
  }
  const alloc = [...byName.entries()].sort((a, b) => b[1].baseline - a[1].baseline);
  const maxBase = Math.max(...alloc.map(([, r]) => r.baseline));
  const untouched = alloc.filter(([, r]) => r.saved === 0);
  const freed = ["Rohkem aega klientidele", "Arendustöö", "Vähem ületunde"].map((k) => ({ k, n: all.filter((x) => x.freed_use === k).length }));
  const freedTotal = freed.reduce((a, b) => a + b.n, 0) || 1;
  const lessStress = all.filter((x) => x.stress_effect?.includes("Vähem")).length;

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 36 }}>{ctx.orgName} · {people} koolitatud töötajat · koolitus {new Date(s.training_date).toLocaleDateString("et-EE")}</div>
      <h1 className="title" style={{ fontSize: 40 }}>Kas investeering <span className="blue">tasus ära</span>?</h1>

      <div className="kpis">
        <div className="kpi lime" style={{ flex: 1.3 }}><div className="krow"><div className="label">Säästame kuus</div><span className="src story">Lood + baasjoon</span></div>
          <div className="num">{fmtH(monthly)} h</div><div className="cmp" style={{ color: "#3D4A12" }}>≈ {fmtNum(monthly * s.hourly_rate)} € kuus ({s.hourly_rate} €/h)</div></div>
        <div className="kpi"><div className="krow"><div className="label">Tasuvus</div><span className="src">Valem</span></div>
          <div className="num">{payback.toFixed(1).replace(".", ",")}×</div><div className="cmp">{fmtNum(cumulative)} € / {fmtNum(s.investment_eur)} €</div></div>
        <div className="kpi hl"><div className="krow"><div className="label">Kasutab tööl</div><span className="src story">Lood</span></div>
          <div className="num">{atWork} / {people}</div><div className="cmp" style={{ color: "#1F3F80" }}>{Math.round((atWork / people) * 100)}% · enne 0</div></div>
        <div className="kpi"><div className="krow"><div className="label">Koormus hallatav</div><span className="src pulse">Pulss</span></div>
          <div className="num">{Math.round(p.before.workload_ok)} → {Math.round(p.now.workload_ok)}%</div><div className="cmp">{p.now.respondents} vastajat</div></div>
        <div className="kpi"><div className="krow"><div className="label">Stress (1–5)</div><span className="src pulse">Pulss</span></div>
          <div className="num">{p.before.stress.toFixed(1).replace(".", ",")} → {p.now.stress.toFixed(1).replace(".", ",")}</div><div className="cmp">kitsaskohtades</div></div>
      </div>

      <div className="grid" style={{ marginTop: 20 }}>
        <div className="col-main">
          <div className="card">
            <div className="krow"><h3>Tööjaotus: kuhu tunnid lähevad</h3><span className="src acad">Küsitlus enne</span></div>
            <p className="sub">Kogu firma, tundi kuus. Hall = baasjoon, lilla = praegu.</p>
            {alloc.map(([name, r]) => (
              <div className="alloc" key={name}>
                <span className="an">{name}</span>
                <div className="ab"><i className="b0" style={{ width: `${(r.baseline / maxBase) * 100}%` }} /><i className="b1" style={{ width: `${(r.current / maxBase) * 100}%` }} /></div>
                <span className="av2">{fmtNum(r.baseline)} → <b>{fmtNum(r.current)}</b></span>
                <span className={`dl${r.saved === 0 ? " z" : ""}`}>{r.saved === 0 ? "0" : `−${fmtNum(r.saved)}`}</span>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="krow"><h3>Kitsaskohad: mis läks paremaks</h3><span className="muted small">baasjoon → praegu</span></div>
            <table className="bntable" style={{ marginTop: 10 }}>
              <thead><tr><th style={{ width: 220 }}>Kitsaskoht</th><th>Tulemus</th><th>Säästame</th><th>Allikas</th><th>Staatus</th></tr></thead>
              <tbody>
                {alloc.map(([name, r]) => (
                  <tr key={name}>
                    <td><b>{name}</b></td>
                    <td>{r.outcome ?? (r.saved > 0 ? `${fmtNum(r.baseline)} → ${fmtNum(r.current)} h/kuus` : "muutust pole")}</td>
                    <td><b>{r.saved > 0 ? `${fmtH(r.saved)} h/kuus` : "0"}</b></td>
                    <td><span className={`src ${r.source && r.source !== "Lood" ? "sys" : r.saved > 0 ? "story" : "acad"}`}>{r.source ?? (r.saved > 0 ? "Lood" : "Baasjoon")}</span></td>
                    <td>{r.saved > 0 ? <span className="pill ok">Kiirem</span> : <span className="pill wait">Puudutamata</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-side" style={{ width: 440 }}>
          <div className="card">
            <div className="krow"><h3>Takistused</h3><span className="src acad">Küsitlus enne</span></div>
            <p className="sub">Miks töö võtab kaua (% vastanutest, {reasons.respondents}).</p>
            {reasons.reasons.map((r) => (
              <div className="gap" key={r.name}><div className="l">{r.name}</div><div className="bar"><i style={{ width: `${r.pct}%` }} /></div><div className="v">{r.pct}%</div></div>
            ))}
            {reasons.other ? <p className="small muted" style={{ marginTop: 8 }}>Lisaks {reasons.other} vastust „muu põhjusega“, nt tõlkimine eri keelte vahel.</p> : null}
          </div>

          <div className="card">
            <div className="krow"><h3>Töötaja heaolu</h3><span className="src pulse">Pulss</span></div>
            <div className="wb"><span>Koormus on hallatav</span><span className="muted">{Math.round(p.before.workload_ok)}% →</span><b>{Math.round(p.now.workload_ok)}%</b></div>
            <div className="wb"><span>Stress kitsaskohtades</span><span className="muted">{p.before.stress.toFixed(1).replace(".", ",")} →</span><b>{p.now.stress.toFixed(1).replace(".", ",")}</b></div>
            <div className="wb"><span>Ületunde inimese kohta kuus</span><span className="muted">{fmtH(p.before.overtime_h)} h →</span><b>{fmtH(p.now.overtime_h)} h</b></div>
            <div className="wb"><span>Lood „vähem stressi“</span><b>{Math.round((lessStress / Math.max(1, all.length)) * 100)}%</b></div>
            <div className="wb" style={{ borderBottom: "none", flexDirection: "column", alignItems: "flex-start", gap: 4 }}>
              <span>Vabanenud aeg läks</span>
              <b style={{ fontSize: 13 }}>{freed.map((f) => `${Math.round((f.n / freedTotal) * 100)}% ${f.k.toLowerCase()}`).join(" · ")}</b>
            </div>
          </div>

          <div className="card">
            <div className="krow"><h3>Soovitused</h3><span className="muted small">andmete põhjal</span></div>
            {untouched.length ? (
              <div className="reco"><span className="pri hi">KÕRGE</span>
                <div className="rt">{untouched.map(([n]) => n).join(", ")}: muutust pole</div>
                <div className="rd">Kokku {fmtNum(untouched.reduce((a, [, r]) => a + r.baseline, 0))} h kuus. Aruta koolitajaga järgmist töötuba nende jaoks.</div>
                <div className="ra"><a className="btn sm" href={`mailto:koolitaja@aieesti.ee?subject=${encodeURIComponent(`${ctx.orgName}: järgmine töötuba`)}`}>Aruta koolitajaga</a></div>
              </div>
            ) : null}
            {s.licenses > s.weekly_active ? (
              <div className="reco" style={{ marginBottom: 0 }}><span className="pri mid">KESKMINE</span>
                <div className="rt">{s.licenses - s.weekly_active} litsentsi pole viimasel nädalal kasutatud</div>
                <div className="rd">Suuna need inimesed järelharjutusse või vähenda litsentse. (Tööriista analüütika, MVP-s näidisväärtus.)</div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </Page>
  );
}

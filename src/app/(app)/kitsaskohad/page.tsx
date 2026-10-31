import { Page } from "@/components/Page";
import Link from "next/link";
import { db } from "@/lib/db";
import { bottlenecks, currentWeek, fmtH, teams } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function KitsaskohadPage({ searchParams }: { searchParams: Promise<{ tiim?: string }> }) {
  const ctx = await requireRole(["manager", "owner", "trainer"]);
  const all = teams(ctx.orgId);
  const { tiim } = await searchParams;
  const team = ctx.role === "manager" ? ctx.team : all.find((t) => t.id === tiim) ?? null;
  const rows = bottlenecks(ctx.orgId, team?.id);
  const baseline = rows.reduce((s, b) => s + b.baseline_h_week, 0);
  const now = rows.reduce((s, b) => s + currentWeek(b), 0);
  const moving = rows.filter((b) => b.saved_h_month > 0).length;
  const resp = db
    .prepare(`SELECT count(DISTINCT r.user_id) c FROM survey_response r JOIN bottleneck b ON b.id = r.bottleneck_id WHERE b.org_id = ? ${team ? "AND b.team_id = ?" : ""}`)
    .get(...(team ? [ctx.orgId, team.id] : [ctx.orgId])) as { c: number };
  const metrics = db
    .prepare(`SELECT success_metric m, count(*) c FROM survey_response r JOIN bottleneck b ON b.id = r.bottleneck_id
              WHERE b.org_id = ? ${team ? "AND b.team_id = ?" : ""} AND success_metric IS NOT NULL GROUP BY success_metric ORDER BY c DESC LIMIT 6`)
    .all(...(team ? [ctx.orgId, team.id] : [ctx.orgId])) as { m: string; c: number }[];

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 36 }}>{ctx.orgName} · {team?.name ?? "kõik osakonnad"} · baasjoon enne koolitust ({resp.c} vastajat)</div>
      <h1 className="title" style={{ fontSize: 40 }}>Kust me <span className="blue">alustasime</span></h1>
      {ctx.role !== "manager" ? (
        <div className="filters">
          <Link href="/kitsaskohad" className="fsel" style={!team ? { borderColor: "#8B4FB5" } : undefined}>Kõik</Link>
          {all.map((t) => <Link key={t.id} href={`/kitsaskohad?tiim=${t.id}`} className="fsel" style={t.id === team?.id ? { borderColor: "#8B4FB5" } : undefined}>{t.name}</Link>)}
        </div>
      ) : null}

      <div className="kpis">
        <div className="kpi"><div className="label">Kitsaskohtades kulus (baasjoon)</div><div className="num">{fmtH(baseline)} h / näd</div></div>
        <div className="kpi lime"><div className="label">Praegu samades ülesannetes</div><div className="num">{fmtH(now)} h / näd</div>
          <div className="cmp" style={{ color: "#3D4A12" }}>−{fmtH(baseline - now)} h nädalas</div></div>
        <div className="kpi"><div className="label">Kitsaskohti edenemas</div><div className="num">{moving} / {rows.length}</div>
          <div className="cmp">{rows.length - moving} puudutamata</div></div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="krow"><h3>Kitsaskohtade kaart</h3><span className="muted small">Tiimi koondvastused · üksikvastuseid ei näidata</span></div>
        <table className="bntable" style={{ marginTop: 12 }}>
          <thead><tr><th style={{ width: 230 }}>Ülesanne</th>{!team ? <th>Osakond</th> : null}<th>Baasjoon</th><th>Inimesi</th><th style={{ width: 280 }}>Peamine põhjus (tiimi sõnul)</th><th>AI potentsiaal</th><th>Praegu</th><th>Lood</th><th>Staatus</th></tr></thead>
          <tbody>
            {rows.map((b) => {
              const cur = currentWeek(b);
              const pct = Math.round(((cur - b.baseline_h_week) / b.baseline_h_week) * 100);
              return (
                <tr key={b.id}>
                  <td><b>{b.name}</b></td>{!team ? <td>{b.teamName}</td> : null}
                  <td>{fmtH(b.baseline_h_week)} h</td><td>{b.people}</td><td className="why">{b.reason}</td>
                  <td><span className={`pot ${b.ai_potential === "Kõrge" ? "hi" : "mid"}`}>{b.ai_potential}</span></td>
                  <td><b>{fmtH(cur)} h</b> <span className={`dl${pct === 0 ? " z" : ""}`}>{pct}%</span></td>
                  <td>{b.stories}</td>
                  <td>{b.saved_h_month > 0 ? <span className="pill ok">Edeneb</span> : <span className="pill wait">Puudutamata</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {metrics.length ? (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="krow"><h3>Tiimi enda mõõdikud edule</h3><span className="muted small">„Mille järgi saaksid aru, et läks paremaks?“</span></div>
          <div className="chips" style={{ marginTop: 12 }}>{metrics.map((m) => <span className="chip" key={m.m}>{m.m} · {m.c}</span>)}</div>
        </div>
      ) : null}
    </Page>
  );
}

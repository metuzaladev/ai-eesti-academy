import { Page } from "@/components/Page";
import { addMaterial, deleteMaterial } from "@/app/actions";
import { bottlenecks, fmtDate, materials, orgMemberCount, orgSkills, teams } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function KoolitajaPage({ searchParams }: { searchParams: Promise<{ lisatud?: string; viga?: string }> }) {
  const ctx = await requireRole(["trainer"]);
  const { lisatud, viga } = await searchParams;
  const mats = materials(ctx.orgId);
  const teamList = teams(ctx.orgId);
  const skills = orgSkills(ctx.orgId);
  const bns = bottlenecks(ctx.orgId);
  const total = orgMemberCount(ctx.orgId);
  const covered = new Set(mats.map((m) => m.bottleneck_id).filter(Boolean));
  const open = bns.filter((b) => b.saved_h_month === 0 && !covered.has(b.id));

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 36 }}>Koolitaja · {ctx.orgName}</div>
      <h1 className="title" style={{ fontSize: 40 }}>Materjalid <span className="blue">töötajatele</span></h1>
      <p className="lead">Lisa harjutusi, videoid ja juhendeid kogu firmale või ühele tiimile. Töötajad näevad neid oma kursuste lehel ja märgivad tehtuks.</p>
      {lisatud ? <div className="notice">Materjal lisatud. Töötajad näevad seda kohe lehel „Minu kursused“.</div> : null}
      {viga ? <div className="error" style={{ marginTop: 16 }}>Materjali ei saanud lisada, kontrolli välju.</div> : null}

      <div className="grid">
        <div className="col-main">
          <div className="card">
            <div className="krow"><h3>Lisatud materjalid</h3><span className="muted small">{mats.length} tk</span></div>
            {mats.length === 0 ? <div className="empty">Materjale pole veel lisatud.</div> : null}
            {mats.map((m) => {
              const target = m.teamName ? teamList.find((t) => t.name === m.teamName)?.memberCount ?? 0 : total;
              return (
                <div className="mat" key={m.id}>
                  <span className="kind">{m.kind}</span>
                  <div className="mt">
                    <b>{m.title}</b>
                    <span className="muted small">{m.teamName ?? "Kogu firma"} · ~{m.minutes} min{m.skillName ? ` · ${m.skillName}` : ""}{m.bottleneckName ? ` · kitsaskoht: ${m.bottleneckName}` : ""} · {fmtDate(m.created_at)}</span>
                  </div>
                  <span className="pill lvlpill">{m.doneCount} / {target} tehtud</span>
                  <form action={deleteMaterial}><input type="hidden" name="materialId" value={m.id} /><button className="linkbtn" type="submit">Kustuta</button></form>
                </div>
              );
            })}
          </div>

          <div className="card">
            <div className="krow"><h3>Kitsaskohad, mida materjalid veel ei kata</h3><span className="src acad">Baasjoon</span></div>
            <p className="sub">Puudutamata kitsaskohad, millele pole veel materjali lisatud.</p>
            {open.length === 0 ? <div className="empty">Kõik kitsaskohad on kaetud.</div> : null}
            {open.map((b) => <div className="wb" key={b.id}><span><b>{b.name}</b> · {b.teamName} · {b.people} inimest · {b.baseline_h_week} h/näd</span><span className="pill wait">Puudutamata</span></div>)}
          </div>
        </div>

        <div className="col-side" style={{ width: 460 }}>
          <form action={addMaterial} className="card">
            <h3>Lisa materjal</h3>
            <div className="field" style={{ marginTop: 12 }}><label htmlFor="title">Pealkiri</label><input id="title" className="input" name="title" required /></div>
            <div className="field"><label htmlFor="description">Kirjeldus</label><textarea id="description" className="input area" name="description" /></div>
            <div className="grid-form">
              <div className="field"><label htmlFor="kind">Tüüp</label>
                <select id="kind" className="input" name="kind">{["Harjutus", "Video", "Juhend", "Link"].map((k) => <option key={k}>{k}</option>)}</select></div>
              <div className="field"><label htmlFor="minutes">Kestus (min)</label><input id="minutes" className="input" name="minutes" inputMode="numeric" defaultValue="10" /></div>
            </div>
            <div className="field"><label htmlFor="url">Link (valikuline)</label><input id="url" className="input" name="url" type="url" placeholder="https://" /></div>
            <div className="field"><label htmlFor="team">Kellele</label>
              <select id="team" className="input" name="team" defaultValue=""><option value="">Kogu firma</option>{teamList.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></div>
            <div className="field"><label htmlFor="skill">Oskus (valikuline)</label>
              <select id="skill" className="input" name="skill" defaultValue=""><option value="">–</option>{skills.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="field"><label htmlFor="bottleneck">Kitsaskoht (valikuline)</label>
              <select id="bottleneck" className="input" name="bottleneck" defaultValue=""><option value="">–</option>{bns.map((b) => <option key={b.id} value={b.id}>{b.name} · {b.teamName}</option>)}</select></div>
            <button className="btn" type="submit">Lisa materjal</button>
          </form>
        </div>
      </div>
    </Page>
  );
}

import { Page } from "@/components/Page";
import { saveSurvey } from "@/app/actions";
import { surveyFor } from "@/lib/data";
import { requireRole } from "@/lib/session";

const REASONS = ["Info mitmes kohas", "Käsitsi kopeerimine", "Ootan teisi", "Palju kontrollimist", "Korduv sama töö"];

export default async function KusitlusPage({ searchParams }: { searchParams: Promise<{ salvestatud?: string }> }) {
  const ctx = await requireRole(["member", "manager"]);
  const { salvestatud } = await searchParams;
  if (!ctx.team) return <p className="lead" style={{ marginTop: 44 }}>Sa ei kuulu ühtegi tiimi, seega küsitlust pole.</p>;
  const questions = surveyFor(ctx.user.id, ctx.team.id);

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 44 }}>Enne koolitust · ~8 min</div>
      <h1 className="title" style={{ fontSize: 40 }}>Kuidas sinu tööpäev <span className="blue">praegu</span> välja näeb?</h1>
      <p className="lead">Sinu vastuste põhjal kohandame koolituse harjutused sinu päris ülesannetele. Hiljem võrdleme, mis muutus.</p>
      {salvestatud ? <div className="notice">Vastused salvestatud. Juht näeb ainult tiimi koondpilti, mitte sinu üksikvastuseid.</div> : null}

      <form action={saveSurvey} className="grid">
        <div className="col-main">
          <div className="card">
            <div className="krow"><h3>Mis võtab sinu nädalas kõige rohkem aega ja miks?</h3><span className="src acad">Koolitaja küsimused</span></div>
            <p className="sub">Koolitaja valmistas küsimused ette tiimi „{ctx.team.name}“ töö põhjal. Ausad numbrid on olulisemad kui täpsed.</p>
            {questions.map((q, i) => {
              const reasons: string[] = q.reasons ? JSON.parse(q.reasons) : [];
              return (
                <div className="bn" key={q.bottleneck_id}>
                  <div className="bnhead">
                    <span className="bnno">{i + 1}</span>
                    <div className="q">Kui palju aega kulub sul nädalas <b>{q.question}</b>?</div>
                    <input className="input" style={{ width: 120 }} name={`${q.bottleneck_id}:hours`} inputMode="decimal" placeholder="h / nädal" defaultValue={q.hours_week ?? ""} />
                  </div>
                  <div className="bnrow">
                    <label>Miks see nii kaua võtab?</label>
                    <div className="chips">
                      {REASONS.map((r) => (
                        <label className="chip" key={r}><input type="checkbox" name={`${q.bottleneck_id}:reason`} value={r} defaultChecked={reasons.includes(r)} />{r}</label>
                      ))}
                      <label className="chip"><input type="checkbox" name={`${q.bottleneck_id}:na`} value="1" defaultChecked={q.not_relevant === 1} />Ei puuduta mind</label>
                    </div>
                    <input className="input own" style={{ marginTop: 10 }} name={`${q.bottleneck_id}:other`} placeholder="+ Muu põhjus (kirjuta ise)" defaultValue={q.other_reason ?? ""} />
                  </div>
                  {i === 0 ? (
                    <>
                      <div className="bnrow"><label>Mis on kõige tüütum osa?</label><input className="input" name={`${q.bottleneck_id}:pain`} defaultValue={q.pain ?? ""} /></div>
                      <div className="bnrow two">
                        <div><label>Kui stressirohke? (1–5)</label>
                          <div className="scale">{[1, 2, 3, 4, 5].map((n) => <label key={n}><input type="radio" name={`${q.bottleneck_id}:stress`} value={n} defaultChecked={q.stress === n} />{n}</label>)}</div>
                        </div>
                        <div><label>Mille järgi saaksid aru, et läks paremaks?</label><input className="input" name={`${q.bottleneck_id}:success`} defaultValue={q.success_metric ?? ""} /></div>
                      </div>
                    </>
                  ) : null}
                </div>
              );
            })}
            <div className="krow" style={{ marginTop: 18 }}><span className="muted small">{questions.length} küsimust</span><button className="btn" type="submit">Salvesta vastused</button></div>
          </div>
        </div>
        <div className="col-side">
          <div className="card">
            <h3>Mis sinu vastustega juhtub?</h3>
            <div className="steps">
              <div className="s"><div className="n">1</div><div><b>Koolitus kohandub</b><br /><span className="muted">Harjutused tehakse sinu päris ülesannete peal.</span></div></div>
              <div className="s"><div className="n">2</div><div><b>See on sinu „enne“</b><br /><span className="muted">Hilisemad enne/pärast lood võrdlevad selle baasjoonega.</span></div></div>
              <div className="s"><div className="n">3</div><div><b>Juht näeb ainult koondpilti</b><br /><span className="muted">Tiimi kitsaskohad, mitte sinu isiklikke vastuseid.</span></div></div>
            </div>
          </div>
        </div>
      </form>
    </Page>
  );
}

import { Page } from "@/components/Page";
import { addStory } from "@/app/actions";
import { bottlenecks, orgSkills } from "@/lib/data";
import { requireRole } from "@/lib/session";

export default async function UusLugu({ searchParams }: { searchParams: Promise<{ oskus?: string; viga?: string }> }) {
  const ctx = await requireRole(["member", "manager"]);
  const { oskus, viga } = await searchParams;
  const skills = orgSkills(ctx.orgId);
  const bns = ctx.team ? bottlenecks(ctx.orgId, ctx.team.id) : [];

  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 44 }}>Minu oskused → Lisa lugu</div>
      <h1 className="title">Lisa <span className="blue">enne/pärast</span> lugu</h1>
      <p className="lead">Näita, kuidas üks tööülesanne muutus pärast AI kasutuselevõttu. Kui lisad loo, tõuseb sinu oskus tasemele „Kasutan tööl“.</p>
      {viga ? <div className="error" style={{ marginTop: 16 }}>Vali oskus.</div> : null}

      <form action={addStory} className="grid">
        <div className="col-main">
          <div className="card">
            <div className="field"><label>Millist oskust kasutasid?</label>
              <div className="chips">{skills.map((s) => <label className="chip" key={s.id}><input type="radio" name="skill" value={s.id} defaultChecked={s.id === oskus} required />{s.name}</label>)}</div>
            </div>
            <div className="grid-form">
              <div className="field"><label htmlFor="task">Tööülesanne</label><input id="task" className="input" name="task" placeholder="Kliendipakkumise koostamine" required /></div>
              <div className="field"><label htmlFor="bottleneck">Millise kitsaskohaga see seotud on?</label>
                <select id="bottleneck" className="input" name="bottleneck" defaultValue="">
                  <option value="">Ei ole seotud</option>
                  {bns.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
            </div>
            <div className="two">
              <div className="panel before"><h4>Enne</h4>
                <div className="field"><label>Kuidas sa seda tegid?</label><textarea className="input area" name="before" required /></div>
                <div className="field"><label>Minutit ühe korra kohta</label><input className="input" name="beforeMin" inputMode="numeric" required /></div>
              </div>
              <div className="panel after"><h4>Pärast</h4>
                <div className="field"><label>Kuidas sa seda nüüd teed?</label><textarea className="input area" name="after" required /></div>
                <div className="field"><label>Minutit ühe korra kohta</label><input className="input" name="afterMin" inputMode="numeric" required /></div>
              </div>
            </div>
            <div className="grid-form" style={{ marginTop: 20 }}>
              <div className="field"><label htmlFor="perMonth">Mitu korda kuus?</label><input id="perMonth" className="input" name="perMonth" inputMode="numeric" defaultValue="4" required /></div>
              <div className="field"><label htmlFor="outcome">Mis veel paranes? (valikuline)</label><input id="outcome" className="input" name="outcome" placeholder="Pakkumine jõuab kliendini samal päeval" /></div>
            </div>
            <div className="field"><label>Kuidas see mõjutas sinu tööpäeva?</label>
              <div className="chips">{["Rohkem stressi", "Sama", "Vähem stressi", "Palju vähem stressi"].map((s) => <label className="chip" key={s}><input type="radio" name="stress" value={s} defaultChecked={s === "Vähem stressi"} />{s}</label>)}</div>
            </div>
            <div className="field"><label>Milleks vabanenud aja kasutasid?</label>
              <div className="chips">{["Rohkem aega klientidele", "Arendustöö", "Vähem ületunde", "Muu"].map((s) => <label className="chip" key={s}><input type="radio" name="freed" value={s} defaultChecked={s === "Rohkem aega klientidele"} />{s}</label>)}</div>
            </div>
            <div className="krow"><span className="muted small">Lugu seotakse sinu baasjoonega küsitlusest.</span><button className="btn" type="submit">Lisa lugu</button></div>
          </div>
        </div>
        <div className="col-side">
          <div className="card">
            <h3>Mis edasi juhtub?</h3>
            <div className="steps">
              <div className="s"><div className="n">1</div><div><b>Oskus tõuseb</b><br /><span className="muted">Tasemele 3 „Kasutan tööl“.</span></div></div>
              <div className="s"><div className="n">2</div><div><b>Kitsaskoht muutub</b><br /><span className="muted">Säästetud aeg arvutatakse kitsaskoha „praegu“ seisu sisse.</span></div></div>
              <div className="s"><div className="n">3</div><div><b>Juht ja omanik näevad</b><br /><span className="muted">Edenemist tiimi ülevaates ja mõju firma vaates.</span></div></div>
            </div>
          </div>
        </div>
      </form>
    </Page>
  );
}

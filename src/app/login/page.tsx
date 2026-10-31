import { redirect } from "next/navigation";
import { signIn } from "@/app/actions";
import { HOME_FOR_ROLE } from "@/lib/permissions";
import { getCtx } from "@/lib/session";

const DEMO = [
  { email: "tootaja@pohjarannik.ee", name: "Rasmus Kask", role: "Tiimiliige · Põhjarannik Grupp" },
  { email: "juht@pohjarannik.ee", name: "Liis Org", role: "Juht · Müük ja kliendisuhted" },
  { email: "omanik@pohjarannik.ee", name: "Peeter Grünberg", role: "Omanik · Põhjarannik Grupp" },
  { email: "koolitaja@aieesti.ee", name: "Kaia Tamm", role: "Koolitaja · AI Eesti (2 klienti)" },
];
const DEMO_PASSWORD = "academy2026";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ viga?: string }> }) {
  const ctx = await getCtx();
  if (ctx) redirect(HOME_FOR_ROLE[ctx.role]);
  const { viga } = await searchParams;

  return (
    <div className="login">
      <div className="card">
        <div style={{ flex: 1 }}>
          <div className="logo" style={{ marginBottom: 32 }}><span className="ai">AI</span><span className="ee">EESTI</span>&nbsp;<span className="prod">Academy</span></div>
          <h1 className="title" style={{ fontSize: 40 }}>Logi <span className="blue">sisse</span></h1>
          <p className="lead" style={{ marginBottom: 24 }}>Iga firma näeb ainult oma andmeid. Sinu roll firmas määrab, mida näed.</p>
          {viga ? <div className="error">Vale e-post või parool.</div> : null}
          <form action={signIn}>
            <div className="field"><label htmlFor="email">E-post</label><input id="email" name="email" type="email" className="input" required /></div>
            <div className="field"><label htmlFor="password">Parool</label><input id="password" name="password" type="password" className="input" required /></div>
            <button className="btn" type="submit">Logi sisse</button>
          </form>
          <p className="small muted" style={{ marginTop: 20 }}>Hiljem: sisselogimine firma Google Workspace’i või Microsofti kontoga (SSO).</p>
        </div>
        <div style={{ flex: 1 }}>
          <div className="eyebrow">Demo kasutajad</div>
          <p className="sub muted small" style={{ marginBottom: 14 }}>Vali roll ja vaata, mida see inimene näeb.</p>
          <div className="demo">
            {DEMO.map((d) => (
              <form key={d.email} action={signIn}>
                <input type="hidden" name="email" value={d.email} />
                <input type="hidden" name="password" value={DEMO_PASSWORD} />
                <button type="submit" style={{ width: "100%" }}><b>{d.name}</b><br /><span className="muted">{d.role}</span></button>
              </form>
            ))}
          </div>
          <p className="small muted" style={{ marginTop: 14 }}>Parool kõigil: <span className="mono">{DEMO_PASSWORD}</span></p>
        </div>
      </div>
    </div>
  );
}

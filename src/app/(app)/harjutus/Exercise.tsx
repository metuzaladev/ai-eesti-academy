"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { completeExercise } from "@/app/actions";

// MVP: lihtne reeglipõhine kontroll. Päris versioonis hindaks juhist AI (nt Claude API).
const CHECKS = [
  { title: "Mida teha", hint: "Ütle, mida ülesanne iga kord teeb.", test: (t: string) => /(koosta|kokkuvõt|vaata läbi|loe|analüüsi|tee)/i.test(t) },
  { title: "Millal", hint: "Lisa aeg ja sagedus, nt „iga esmaspäev kell 8:00“.", test: (t: string) => /(\d{1,2}[:.]\d{2}|iga (päev|nädal|esmaspäev|teisipäev|kolmapäev|neljapäev|reede|kuu)|igal)/i.test(t) },
  { title: "Kuhu ja mis kujul", hint: "Lisa, kuhu kokkuvõte saata ja mis vormis, muidu jääb see kuhugi seisma.", test: (t: string) => /(saada|e-kirjaga|e-postiga|slack|teams|salvesta|tabelina)/i.test(t) },
];

const START = "Iga esmaspäev kell 8:00 vaata läbi eelmise nädala kliendipäringud kaustas „kliendipäringud“. Koosta kokkuvõte: mitu päringut tuli, mis teemadel ja millised on veel vastamata.";

export function Exercise() {
  const [text, setText] = useState(START);
  const [checked, setChecked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  const results = CHECKS.map((c) => c.test(text));
  const passed = results.filter(Boolean).length;
  const allOk = checked && passed === CHECKS.length;

  const check = () => {
    setChecked(true);
    if (CHECKS.every((c) => c.test(text))) start(async () => { await completeExercise("Ajastatud ülesanded"); setSaved(true); });
  };

  return (
    <div className="le" style={{ height: "auto", minHeight: 640, borderRadius: 16, overflow: "hidden", border: "1px solid #ECE8F0", background: "#fff" }}>
      <div className="lpane">
        <div className="eyebrow" style={{ marginBottom: 8 }}>Õpi</div>
        <h3 className="mono" style={{ fontSize: 20, marginBottom: 12 }}>Lase AI-l korduv töö ise ära teha</h3>
        <p className="ptext">Ajastatud ülesanne käivitub ise kindlal ajal. Hea juhis ütleb kolme asja: <b>mida</b> teha, <b>millal</b> ja <b>kuhu</b> tulemus panna.</p>
        <div className="eyebrow" style={{ margin: "22px 0 10px" }}>Juhised</div>
        {CHECKS.map((c, i) => (
          <div key={c.title} className={`task ${checked && results[i] ? "done" : !checked || results[i] ? "" : "now"}`}>
            <span className="tick">{checked && results[i] ? "✓" : i + 1}</span><div><b>{i + 1}.</b> {c.hint}</div>
          </div>
        ))}
      </div>
      <div className="mpane">
        <div className="wsbar"><span className="mono small"><b>Tööala</b> · harjutuskaust</span><div className="spacer" /><span className="file-chip">kaust: kliendipäringud_okt</span></div>
        <div className="chat" style={{ padding: 24 }}>
          <textarea className="input area" style={{ minHeight: 220 }} value={text} onChange={(e) => { setText(e.target.value); setChecked(false); }} aria-label="Sinu juhis AI-le" />
          <div className="actions" style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button className="btn ghost" type="button" onClick={() => { setText(START); setChecked(false); }}>Lähtesta</button>
            <button className="btn" type="button" onClick={check} disabled={pending}>Kontrolli ▶</button>
          </div>
        </div>
      </div>
      <div className="rpane">
        <div className="eyebrow" style={{ marginBottom: 12 }}>Tagasiside</div>
        {!checked ? <p className="ptext muted">Kirjuta juhis ja vajuta „Kontrolli“.</p> : (
          <>
            <div className="score"><span className="num" style={{ fontSize: 40 }}>{passed} / {CHECKS.length}</span><span className="muted small">nõuet täidetud</span></div>
            {CHECKS.map((c, i) => (
              <div key={c.title} className={`check ${results[i] ? "ok2" : "bad"}`}>
                <span className="ci">{results[i] ? "✓" : "!"}</span><div><b>{c.title}</b><br /><span className="muted small">{results[i] ? "Olemas." : c.hint}</span></div>
              </div>
            ))}
          </>
        )}
        {allOk ? (
          <div className="nextbox">
            <div className="mono small" style={{ color: "#3B5200", marginBottom: 6 }}>{saved ? "Salvestatud" : "Salvestan…"}</div>
            <p className="ptext" style={{ margin: "0 0 12px 0" }}>Oskus tõusis tasemele <b>2 · Oskan</b>. Järgmine samm: tee sama oma päris kaustaga ja lisa enne/pärast lugu.</p>
            <Link transitionTypes={["nav-forward"]} className="btn" href="/lood/uus">Lisa enne/pärast lugu</Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}

import fs from "node:fs";
import path from "node:path";
import { auth } from "../src/lib/auth";
import { db } from "../src/lib/db";
import { migrateAuth } from "./migrate-auth";

// Näidisandmed: Põhjarannik Grupp (42 töötajat, 4 osakonda) ja Kaldaranna Ehitus (5 töötajat).
// Kõigi kasutajate parool on sama, demo sisselogimised on login-lehel.
const PASSWORD = "academy2026";
const NOW = new Date("2026-10-31T12:00:00Z");

let seed = 42;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
const between = (a: number, b: number) => Math.round(a + rnd() * (b - a));
const id = () => crypto.randomUUID();
const iso = (d: Date) => d.toISOString();
const daysAgo = (n: number) => iso(new Date(NOW.getTime() - n * 864e5));

const FIRST = ["Mart", "Kati", "Priit", "Triin", "Marko", "Helen", "Siim", "Liina", "Ott", "Kerli", "Rein", "Maarja", "Taavi", "Pille", "Urmas", "Kristi", "Indrek", "Merike", "Raul", "Anu", "Jüri", "Sirje", "Margus", "Eda", "Toomas", "Ülle", "Kalle", "Reet", "Aivar", "Tiina", "Lauri", "Karin", "Erik", "Piret"];
const LAST = ["Tamm", "Saar", "Sepp", "Mägi", "Rebane", "Ilves", "Kukk", "Oja", "Põder", "Pärn", "Lepik", "Raud", "Vaher", "Kask", "Kuusk", "Karu", "Laur", "Mets", "Lõhmus", "Org"];

async function createUser(name: string, email: string) {
  const r = await auth.api.signUpEmail({ body: { name, email, password: PASSWORD } });
  return r.user.id;
}

function insertOrg(name: string, slug: string) {
  const orgId = id();
  db.prepare("INSERT INTO organization (id, name, slug, createdAt) VALUES (?, ?, ?, ?)").run(orgId, name, slug, daysAgo(150));
  return orgId;
}
function insertTeam(orgId: string, name: string, size: number) {
  const teamId = id();
  db.prepare("INSERT INTO team (id, name, memberCount, organizationId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)")
    .run(teamId, name, size, orgId, daysAgo(150), daysAgo(150));
  return teamId;
}
function addMember(orgId: string, userId: string, role: string, teamId?: string, joined = 140) {
  db.prepare("INSERT INTO member (id, organizationId, userId, role, createdAt) VALUES (?, ?, ?, ?, ?)").run(id(), orgId, userId, role, daysAgo(joined));
  if (teamId) {
    db.prepare("INSERT INTO teamMember (id, teamId, userId, membershipKey, createdAt) VALUES (?, ?, ?, ?, ?)")
      .run(id(), teamId, userId, `${teamId}:${userId}`, daysAgo(joined));
  }
}

// --- Kursused ja oskused ---
const SKILLS = [
  { key: "prompt", name: "Promptimine", description: "Head juhised, kontekst, roll" },
  { key: "dok", name: "Dokumentide analüüs", description: "Lepingud, pakkumised, aruanded" },
  { key: "cowork", name: "Cowork oma failidega", description: "Töö kaustade ja failidega" },
  { key: "skillid", name: "Skillid", description: "Korduvad töövood ühe käsuga" },
  { key: "ajast", name: "Ajastatud ülesanded", description: "Automaatsed korduvad tööd" },
  { key: "autom", name: "Kliendidokumentide automatiseerimine", description: "Mallid ja andmed kokku" },
] as const;
type SkillKey = (typeof SKILLS)[number]["key"];

// --- Kitsaskohad osakonniti (baasjoon küsitlusest) ---
type BN = { name: string; question: string; reason: string; potential: string; baseline: number; outcome?: string; source?: string };
const BOTTLENECKS: Record<string, BN[]> = {
  "Müük ja kliendisuhted": [
    { name: "Kliendi e-kirjadele vastamine", question: "korduvatele kliendi e-kirjadele", reason: "Samad küsimused korduvad, vastus tuleb kokku otsida 3 süsteemist", potential: "Kõrge", baseline: 46 },
    { name: "Pakkumiste koostamine", question: "kliendipakkumiste koostamisele", reason: "Info 4 eri failis, käsitsi kopeerimine Wordi malli", potential: "Kõrge", baseline: 38, outcome: "9 → 15 pakkumist nädalas", source: "CRM" },
    { name: "Aruanded ja kokkuvõtted", question: "aruannetele ja kokkuvõtetele", reason: "Andmed pannakse käsitsi Excelist kokku", potential: "Kõrge", baseline: 21 },
    { name: "Koosolekumärkmed ja järeltegevused", question: "koosolekumärkmetele ja järeltegevustele", reason: "Märkmed jäävad tegemata, järeltegevused ununevad", potential: "Keskmine", baseline: 17 },
    { name: "CRM-i andmete sisestus", question: "andmete sisestamisele CRM-i", reason: "Topeltsisestus e-posti ja CRM-i vahel", potential: "Keskmine", baseline: 14 },
    { name: "Lepingute ülevaatus", question: "lepingute ülevaatusele", reason: "Pikad dokumendid, riskikohti on raske leida", potential: "Keskmine", baseline: 9 },
  ],
  Klienditeenindus: [
    { name: "Kliendi e-kirjadele vastamine", question: "korduvatele kliendi e-kirjadele", reason: "Samad küsimused, vastus mitmest süsteemist", potential: "Kõrge", baseline: 120, outcome: "vastus 4 h → 1 h 10 min", source: "Helpdesk" },
    { name: "Tõlkimine", question: "kirjade tõlkimisele", reason: "Kliendid kirjutavad eesti, vene ja inglise keeles", potential: "Kõrge", baseline: 22 },
    { name: "Koosolekumärkmed ja järeltegevused", question: "koosolekumärkmetele ja järeltegevustele", reason: "Järeltegevused ununevad", potential: "Keskmine", baseline: 18 },
    { name: "CRM-i andmete sisestus", question: "andmete sisestamisele", reason: "Sama info sisestatakse mitu korda", potential: "Keskmine", baseline: 26 },
  ],
  Finants: [
    { name: "Aruanded ja kokkuvõtted", question: "kuuaruannetele", reason: "Andmed mitmest süsteemist, palju kontrollimist", potential: "Kõrge", baseline: 40, outcome: "kuuaruanne 5. → 1. tööpäeval", source: "Lood" },
    { name: "Arvete koostamine", question: "arvete koostamisele", reason: "Käsitsi kopeerimine ja kontroll", potential: "Kõrge", baseline: 30, outcome: "arve 20 → 6 min", source: "ERP" },
    { name: "Koosolekumärkmed ja järeltegevused", question: "koosolekumärkmetele", reason: "Märkmed jäävad tegemata", potential: "Keskmine", baseline: 12 },
  ],
  "Ost ja ladu": [
    { name: "Kaubatellimused", question: "kaubatellimuste koostamisele ja kontrollile", reason: "Laoseisu kontroll käsitsi, palju vigu", potential: "Kõrge", baseline: 18, outcome: "vigu 14 → 5 kuus", source: "ERP" },
    { name: "CRM-i andmete sisestus", question: "andmete sisestamisele ERP-i", reason: "Topeltsisestus", potential: "Keskmine", baseline: 9 },
  ],
};

// Millise oskusega millist kitsaskohta lahendatakse (puudu = jääb puudutamata)
const SKILL_TO_BN: Record<string, Partial<Record<SkillKey, string>>> = {
  "Müük ja kliendisuhted": { prompt: "Kliendi e-kirjadele vastamine", dok: "Lepingute ülevaatus", cowork: "Pakkumiste koostamine", skillid: "Pakkumiste koostamine", ajast: "Aruanded ja kokkuvõtted", autom: "Pakkumiste koostamine" },
  Klienditeenindus: { prompt: "Kliendi e-kirjadele vastamine", dok: "Kliendi e-kirjadele vastamine", cowork: "Tõlkimine", skillid: "Kliendi e-kirjadele vastamine", ajast: "Kliendi e-kirjadele vastamine", autom: "Kliendi e-kirjadele vastamine" },
  Finants: { prompt: "Arvete koostamine", dok: "Aruanded ja kokkuvõtted", cowork: "Aruanded ja kokkuvõtted", skillid: "Arvete koostamine", ajast: "Aruanded ja kokkuvõtted", autom: "Arvete koostamine" },
  "Ost ja ladu": { prompt: "Kaubatellimused", dok: "Kaubatellimused", cowork: "Kaubatellimused", skillid: "Kaubatellimused", ajast: "Kaubatellimused", autom: "Kaubatellimused" },
};

const STORY_TEMPLATES: Record<string, { task: string; before: string; after: string; b: [number, number]; a: [number, number]; m: [number, number] }> = {
  "Kliendi e-kirjadele vastamine": { task: "Vastused korduvatele päringutele", before: "Otsisin vastuse kolmest süsteemist ja kirjutasin käsitsi", after: "Claude teeb mustandi, mina kontrollin", b: [12, 18], a: [5, 8], m: [8, 14] },
  "Pakkumiste koostamine": { task: "Kliendipakkumise koostamine", before: "Info neljast failist käsitsi Wordi malli", after: "Cowork täidab malli kliendi kausta põhjal", b: [90, 150], a: [35, 50], m: [2, 4] },
  "Aruanded ja kokkuvõtted": { task: "Aruande koostamine", before: "Andmed käsitsi Excelist kokku", after: "Ajastatud ülesanne koostab aruande ise", b: [90, 150], a: [20, 30], m: [1, 2] },
  "Lepingute ülevaatus": { task: "Lepingu riskide ülevaade", before: "Lugesin terve lepingu läbi", after: "Claude toob riskikohad välja, jurist kontrollib", b: [90, 120], a: [25, 35], m: [2, 3] },
  Tõlkimine: { task: "Kliendikirja tõlkimine", before: "Tõlkisin ise või palusin kolleegilt", after: "Claude tõlgib, mina kontrollin tooni", b: [15, 25], a: [4, 6], m: [10, 20] },
  "Arvete koostamine": { task: "Arve koostamine", before: "Andmed käsitsi tellimusest arvele", after: "Mall + Claude kontrollib andmed üle", b: [18, 22], a: [6, 9], m: [10, 18] },
  Kaubatellimused: { task: "Kaubatellimuse kontroll", before: "Kontrollisin laoseisu käsitsi", after: "AI võrdleb tellimuse laoseisuga", b: [30, 40], a: [10, 15], m: [6, 10] },
};

const REASONS = ["Info mitmes kohas", "Käsitsi kopeerimine", "Ootan teisi", "Palju kontrollimist", "Korduv sama töö"];
const REASON_P = [0.3, 0.22, 0.07, 0.13, 0.2];

async function main() {
  // Andmebaasi fail kustutatakse enne skripti (npm run db:seed), siin luuakse tabelid nullist
  await migrateAuth();
  db.exec(fs.readFileSync(path.join(process.cwd(), "scripts", "schema.sql"), "utf8"));

  // --- Põhjarannik Grupp ---
  const pg = insertOrg("Põhjarannik Grupp", "pohjarannik");
  db.prepare("INSERT INTO org_settings VALUES (?, ?, ?, ?, ?, ?)").run(pg, "2026-07-12", 32, 4800, 42, 34);

  const teams: Record<string, { id: string; users: string[]; size: number }> = {};
  for (const [name, size] of [["Müük ja kliendisuhted", 18], ["Klienditeenindus", 12], ["Finants", 8], ["Ost ja ladu", 4]] as const) {
    teams[name] = { id: insertTeam(pg, name, size), users: [], size };
  }

  const owner = await createUser("Peeter Grünberg", "omanik@pohjarannik.ee");
  addMember(pg, owner, "owner");

  // Nimelised inimesed müügitiimis (samad, mis Figma prototüübis)
  const named: { name: string; email: string; role: string }[] = [
    { name: "Liis Org", email: "juht@pohjarannik.ee", role: "manager" },
    { name: "Rasmus Kask", email: "tootaja@pohjarannik.ee", role: "member" },
    { name: "Mari Lepp", email: "mari@pohjarannik.ee", role: "member" },
    { name: "Jaan Saar", email: "jaan@pohjarannik.ee", role: "member" },
    { name: "Kadri Mets", email: "kadri@pohjarannik.ee", role: "member" },
    { name: "Tõnis Kuusk", email: "tonis@pohjarannik.ee", role: "member" },
    { name: "Eva Kivi", email: "eva@pohjarannik.ee", role: "member" },
    { name: "Andres Pärn", email: "andres@pohjarannik.ee", role: "member" },
  ];
  const userIds: Record<string, string> = {};
  for (const p of named) {
    const uid = await createUser(p.name, p.email);
    userIds[p.name] = uid;
    addMember(pg, uid, p.role, teams["Müük ja kliendisuhted"].id);
    teams["Müük ja kliendisuhted"].users.push(uid);
  }
  let n = 0;
  for (const [tname, t] of Object.entries(teams)) {
    while (t.users.length < t.size) {
      const name = `${FIRST[n % FIRST.length]} ${LAST[(n * 7) % LAST.length]}`;
      const uid = await createUser(name, `kasutaja${++n}@pohjarannik.ee`);
      // iga osakonna esimene genereeritud inimene on juht (müügis on juht Liis)
      const role = tname !== "Müük ja kliendisuhted" && t.users.length === 0 ? "manager" : "member";
      addMember(pg, uid, role, t.id);
      t.users.push(uid);
    }
  }

  // --- Koolitaja (AI Eesti), kuulub mõlemasse kliendifirmasse ---
  const trainer = await createUser("Kaia Tamm", "koolitaja@aieesti.ee");
  addMember(pg, trainer, "trainer", undefined, 160);

  // --- Kursused ---
  const course = (org: string | null, title: string, description: string, color: string, icon: string, lessons: number, sort: number) => {
    const cid = id();
    db.prepare("INSERT INTO course VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(cid, org, title, description, color, icon, lessons, sort);
    return cid;
  };
  const cMax = course(null, "Claude Max: I lend", "Õpid Claude'i igapäevatöös kasutama ning kavandad, ehitad ja võtad kasutusele oma tööülesande AI-lahenduse.", "#C5DDF2", "flower", 24, 1);
  const cPg = course(pg, "Põhjarannik Grupp: Claude Chat ja Cowork", "Õpid Claude Chati ja Coworki igapäevatöös kasutama, alates headest promptidest kuni kliendidokumentide automatiseerimiseni.", "#C5DDF2", "arch", 70, 2);
  course(null, "ChatGPT kursus", "Õpid ChatGPT-d igapäevatöös kasutama alustest kuni Work agentideni, lihtsas keeles ja samm-sammult.", "#D6E89A", "hexagon", 24, 4);

  const skillIds = {} as Record<SkillKey, string>;
  SKILLS.forEach((s, i) => {
    skillIds[s.key] = id();
    db.prepare("INSERT INTO skill VALUES (?, ?, ?, ?, ?)").run(skillIds[s.key], cPg, s.name, s.description, i);
  });

  const allPg = Object.values(teams).flatMap((t) => t.users);
  for (const uid of allPg) db.prepare("INSERT INTO enrollment VALUES (?, ?, ?)").run(uid, cPg, between(12, 48));
  db.prepare("UPDATE enrollment SET lessons_done = 27 WHERE user_id = ?").run(userIds["Rasmus Kask"]);
  db.prepare("INSERT INTO enrollment VALUES (?, ?, ?)").run(userIds["Rasmus Kask"], cMax, 4);

  // --- Kitsaskohad ---
  const bnIds: Record<string, Record<string, string>> = {};
  for (const [tname, list] of Object.entries(BOTTLENECKS)) {
    bnIds[tname] = {};
    for (const b of list) {
      const bid = id();
      bnIds[tname][b.name] = bid;
      const people = Math.max(3, Math.round(teams[tname].size * (b.potential === "Kõrge" ? 0.7 : 0.8)));
      db.prepare("INSERT INTO bottleneck VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
        .run(bid, pg, teams[tname].id, b.name, b.question, b.reason, b.potential, people, b.baseline, b.outcome ?? null, b.source ?? null);
    }
  }

  // --- Oskuste tasemed ---
  const setLevel = (uid: string, key: SkillKey, level: number, daysBack: number) => {
    if (level <= 0) return;
    db.prepare("INSERT OR REPLACE INTO user_skill VALUES (?, ?, ?, ?, ?)").run(uid, skillIds[key], level, null, daysAgo(daysBack));
  };
  const explicit: Record<string, Partial<Record<SkillKey, number>>> = {
    "Rasmus Kask": { prompt: 4, dok: 3, cowork: 3, skillid: 2, ajast: 1 },
    "Mari Lepp": { prompt: 3, dok: 2, cowork: 3, skillid: 3, ajast: 4, autom: 1 },
    "Jaan Saar": { prompt: 3, dok: 3, cowork: 3, skillid: 1, ajast: 1, autom: 3 },
    "Kadri Mets": { prompt: 3, dok: 1, cowork: 2 },
    "Tõnis Kuusk": { prompt: 2, dok: 4, cowork: 1, skillid: 1, autom: 1 },
    "Eva Kivi": { prompt: 3, dok: 2, cowork: 4, skillid: 2, ajast: 1, autom: 1 },
    "Andres Pärn": { prompt: 1, dok: 1 },
    "Liis Org": { prompt: 3, dok: 2, cowork: 2, skillid: 1, ajast: 1 },
  };
  for (const [name, levels] of Object.entries(explicit)) {
    for (const [k, l] of Object.entries(levels)) setLevel(userIds[name], k as SkillKey, l!, between(5, 90));
  }
  const namedIds = new Set(Object.values(userIds));
  const profile: Record<SkillKey, number[]> = {
    // tõenäosused tasemetele 0..4
    prompt: [0.05, 0.3, 0.45, 0.17, 0.03],
    dok: [0.15, 0.4, 0.33, 0.1, 0.02],
    cowork: [0.2, 0.4, 0.3, 0.08, 0.02],
    skillid: [0.3, 0.4, 0.24, 0.05, 0.01],
    ajast: [0.4, 0.42, 0.15, 0.02, 0.01],
    autom: [0.4, 0.4, 0.15, 0.04, 0.01],
  };
  const sampleLevel = (p: number[]) => { const r = rnd(); let acc = 0; for (let i = 0; i < p.length; i++) { acc += p[i]; if (r < acc) return i; } return 0; };
  for (const uid of allPg) {
    if (namedIds.has(uid)) continue;
    for (const s of SKILLS) setLevel(uid, s.key, sampleLevel(profile[s.key]), between(5, 100));
  }

  // --- Lood: iga tase 3+ oskuse kohta üks enne/pärast lugu ---
  const teamOf = (uid: string) => Object.entries(teams).find(([, t]) => t.users.includes(uid))![0];
  const insertStory = (s: { uid: string; skill: SkillKey; bn: string | null; task: string; before: string; after: string; b: number; a: number; m: number; outcome?: string; stress?: string; freed?: string; days: number }) => {
    db.prepare("INSERT INTO story VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id(), pg, s.uid, skillIds[s.skill], s.bn, s.task, s.before, s.after, s.b, s.a, s.m, s.outcome ?? null, s.stress ?? pick(["Vähem stressi", "Vähem stressi", "Palju vähem stressi", "Sama"]), s.freed ?? pick(["Rohkem aega klientidele", "Arendustöö", "Vähem ületunde"]), daysAgo(s.days));
  };
  const mueuk = bnIds["Müük ja kliendisuhted"];
  // Figma prototüübi lood
  insertStory({ uid: userIds["Rasmus Kask"], skill: "cowork", bn: mueuk["Pakkumiste koostamine"], task: "Kliendipakkumise koostamine", before: "Kogusin hinnad ja tingimused neljast failist ning kopeerisin need käsitsi Wordi malli.", after: "Cowork loeb kliendi kausta failid läbi ja täidab pakkumise malli. Mina kontrollin hinnad.", b: 180, a: 40, m: 4, outcome: "Pakkumine jõuab kliendini samal päeval (enne 2 päeva)", freed: "Rohkem aega klientidele", days: 2 });
  insertStory({ uid: userIds["Rasmus Kask"], skill: "dok", bn: mueuk["Lepingute ülevaatus"], task: "Hankedokumentide võrdlus", before: "Tegin võrdlustabeli käsitsi.", after: "Claude analüüsib dokumendid ja koostab tabeli.", b: 120, a: 25, m: 2, days: 49 });
  insertStory({ uid: userIds["Rasmus Kask"], skill: "prompt", bn: mueuk["Kliendi e-kirjadele vastamine"], task: "Kliendikirja mall", before: "Kirjutasin iga kirja nullist.", after: "Prompt-mall koos kliendi kontekstiga.", b: 15, a: 5, m: 16, days: 70 });
  insertStory({ uid: userIds["Kadri Mets"], skill: "prompt", bn: mueuk["Kliendi e-kirjadele vastamine"], task: "Vastused korduvatele päringutele", before: "15 minutit kirja kohta.", after: "Claude teeb mustandi, 5 minutit kirja kohta.", b: 15, a: 5, m: 18, days: 3 });
  insertStory({ uid: userIds["Mari Lepp"], skill: "ajast", bn: mueuk["Aruanded ja kokkuvõtted"], task: "Müügi nädalaaruanne", before: "Pool päeva käsitsi igal esmaspäeval.", after: "Ajastatud ülesanne, aruanne on E hommikul valmis.", b: 240, a: 20, m: 4, days: 8 });
  const done = new Set([`${userIds["Rasmus Kask"]}:cowork`, `${userIds["Rasmus Kask"]}:dok`, `${userIds["Rasmus Kask"]}:prompt`, `${userIds["Kadri Mets"]}:prompt`, `${userIds["Mari Lepp"]}:ajast`]);

  const rows = db.prepare("SELECT us.user_id, s.id skill_id, us.level FROM user_skill us JOIN skill s ON s.id = us.skill_id WHERE us.level >= 3").all() as { user_id: string; skill_id: string; level: number }[];
  const keyOf = Object.fromEntries(Object.entries(skillIds).map(([k, v]) => [v, k])) as Record<string, SkillKey>;
  for (const r of rows) {
    const key = keyOf[r.skill_id];
    if (done.has(`${r.user_id}:${key}`)) continue;
    const tname = teamOf(r.user_id);
    const bnName = SKILL_TO_BN[tname][key];
    if (!bnName) continue;
    const t = STORY_TEMPLATES[bnName];
    insertStory({ uid: r.user_id, skill: key, bn: bnIds[tname][bnName], task: t.task, before: t.before, after: t.after, b: between(...t.b), a: between(...t.a), m: between(...t.m), days: between(5, 100) });
  }

  // --- Küsitlus enne koolitust ---
  for (const [tname, t] of Object.entries(teams)) {
    for (const uid of t.users) {
      for (const b of BOTTLENECKS[tname]) {
        const notRelevant = rnd() < 0.15 ? 1 : 0;
        const reasons = REASONS.filter((_, i) => rnd() < REASON_P[i]);
        db.prepare("INSERT INTO survey_response VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(
          id(), pg, uid, bnIds[tname][b.name], notRelevant,
          notRelevant ? null : Math.round((b.baseline / t.size) * (0.6 + rnd() * 0.8) * 10) / 10,
          JSON.stringify(notRelevant ? [] : reasons),
          !notRelevant && tname === "Klienditeenindus" && rnd() < 0.4 ? "Tõlkimine eesti, vene ja inglise keele vahel" : null,
          null, notRelevant ? null : between(3, 5), null, "2026-07-05T09:00:00.000Z",
        );
      }
    }
  }
  // Rasmuse enda vastused (nagu Figmas)
  db.prepare("UPDATE survey_response SET hours_week = 3, reasons = ?, pain = ?, stress = 4, success_metric = ?, not_relevant = 0 WHERE user_id = ? AND bottleneck_id = ?")
    .run(JSON.stringify(["Info mitmes kohas", "Käsitsi kopeerimine", "Palju kontrollimist"]), "Hinnad ja tingimused on neljas eri failis, iga kord otsin ja kopeerin uuesti.", "Pakkumine jõuab kliendini samal päeval", userIds["Rasmus Kask"], mueuk["Pakkumiste koostamine"]);

  // --- Pulss (juuni = baasjoon, oktoober = praegu) ---
  for (const t of Object.values(teams)) {
    db.prepare("INSERT INTO pulse VALUES (?, ?, ?, ?, ?, ?, ?)").run(pg, t.id, "2026-06", 52 + between(0, 5), 3.8 + rnd() * 0.3, 8 + between(0, 2), t.size - between(0, 2));
    db.prepare("INSERT INTO pulse VALUES (?, ?, ?, ?, ?, ?, ?)").run(pg, t.id, "2026-10", 66 + between(0, 9), 3.0 + rnd() * 0.3, 4 + between(0, 2), t.size - between(0, 2));
  }

  // --- Koolitaja materjalid ---
  const mat = (team: string | null, skill: SkillKey | null, bn: string | null, title: string, description: string, kind: string, minutes: number, days: number) => {
    const mid = id();
    db.prepare("INSERT INTO material VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").run(mid, pg, team, skill ? skillIds[skill] : null, bn, title, description, kind, null, minutes, trainer, daysAgo(days));
    return mid;
  };
  const m1 = mat(null, "ajast", null, "Ajastatud ülesanne: nädalaaruanne", "Seadista ajastatud ülesanne, mis koostab iga esmaspäev eelmise nädala kokkuvõtte.", "Harjutus", 5, 20);
  mat(teams["Müük ja kliendisuhted"].id, null, mueuk["Koosolekumärkmed ja järeltegevused"], "Koosolek → kokkuvõte ja ülesanded", "Lühivideo: kuidas Claude teeb koosoleku märkmetest kokkuvõtte ja järeltegevuste nimekirja.", "Video", 12, 4);
  for (const uid of teams["Müük ja kliendisuhted"].users.slice(2, 9)) db.prepare("INSERT INTO material_done VALUES (?, ?, ?)").run(m1, uid, daysAgo(between(2, 15)));

  // --- Kaldaranna Ehitus (teine klient, et koolitaja saaks organisatsiooni vahetada) ---
  const ke = insertOrg("Kaldaranna Ehitus", "kaldaranna");
  db.prepare("INSERT INTO org_settings VALUES (?, ?, ?, ?, ?, ?)").run(ke, "2026-09-20", 30, 1500, 5, 4);
  const keTeam = insertTeam(ke, "Projektijuhid", 4);
  const keOwner = await createUser("Ants Kaldaru", "omanik@kaldaranna.ee");
  addMember(ke, keOwner, "owner");
  for (let i = 0; i < 4; i++) {
    const uid = await createUser(`${FIRST[(i * 5 + 3) % FIRST.length]} ${LAST[(i * 3 + 2) % LAST.length]}`, `kasutaja${i + 1}@kaldaranna.ee`);
    addMember(ke, uid, i === 0 ? "manager" : "member", keTeam);
  }
  course(ke, "Kaldaranna Ehitus: Claude ja Cowork", "Tee koolituse harjutused oma tempos uuesti läbi: promptimine, Cowork oma failidega, Skillid ja ajastatud ülesanded.", "#E8BCCB", "diamond", 9, 3);
  addMember(ke, trainer, "trainer", undefined, 60);

  const count = (sql: string) => (db.prepare(sql).get() as { c: number }).c;
  console.log(`Valmis: ${count("SELECT count(*) c FROM user")} kasutajat, ${count("SELECT count(*) c FROM organization")} organisatsiooni, ${count("SELECT count(*) c FROM story")} lugu`);
}

main();

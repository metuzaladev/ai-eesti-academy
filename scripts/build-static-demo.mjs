// Teeb töötavast rakendusest staatilise demo GitHub Pagesi jaoks.
// Kasutus: npm run db:seed && npm run build && npm run start   (teises aknas)
//          node scripts/build-static-demo.mjs [väljundkaust]
// Iga roll logitakse sisse, lehed salvestatakse HTML-ina ja lingid kirjutatakse failide vahel ümber.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import Database from "better-sqlite3";

const BASE = process.env.DEMO_BASE ?? "http://localhost:3000";
const OUT = path.resolve(process.argv[2] ?? ".demo-out");
const PASSWORD = "academy2026";
const FIGMA = "https://www.figma.com/proto/nzWNLZelE9tCHcuwMAACyF?node-id=28-2&starting-point-node-id=28%3A2";
const GITHUB = "https://github.com/metuzaladev/ai-eesti-academy";

const ROLES = [
  { dir: "tiimiliige", email: "tootaja@pohjarannik.ee", start: ["/kursused", "/oskused", "/tiim", "/kusitlus", "/harjutus", "/lood/uus"] },
  { dir: "juht", email: "juht@pohjarannik.ee", start: ["/juht", "/kitsaskohad", "/tiim", "/kursused"] },
  { dir: "omanik", email: "omanik@pohjarannik.ee", start: ["/omanik", "/kitsaskohad", "/juht", "/tiim"] },
  { dir: "koolitaja", email: "koolitaja@aieesti.ee", org: "pohjarannik", start: ["/koolitaja", "/kitsaskohad"] },
  { dir: "koolitaja-kaldaranna", email: "koolitaja@aieesti.ee", org: "kaldaranna", start: ["/koolitaja", "/kitsaskohad"] },
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

const assets = new Set();
let htmlClass = ""; // next/font muutujad (--font-inter, --font-mono)

const sessions = new Map(); // sama kasutaja seanss korduvkasutusse (sisselogimistel on rate limit)
async function login(email, orgSlug) {
  const cookie = sessions.get(email) ?? (await signIn(email));
  sessions.set(email, cookie);
  if (orgSlug) await setActive(cookie, orgSlug);
  return cookie;
}

async function signIn(email) {
  let res;
  for (let attempt = 0; attempt < 5; attempt++) {
    res = await fetch(`${BASE}/api/auth/sign-in/email`, {
      method: "POST", headers: { "content-type": "application/json", origin: BASE }, body: JSON.stringify({ email, password: PASSWORD }),
    });
    if (res.status !== 429) break;
    await new Promise((r) => setTimeout(r, 11000)); // sisselogimise rate limit
  }
  if (!res.ok) throw new Error(`Sisselogimine ebaõnnestus: ${email} ${res.status}`);
  return res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
}

async function setActive(cookie, orgSlug) {
  {
    const db = new Database("data/academy.sqlite", { readonly: true });
    const org = db.prepare("SELECT id FROM organization WHERE slug = ?").get(orgSlug);
    db.close();
    const r = await fetch(`${BASE}/api/auth/organization/set-active`, {
      method: "POST", headers: { "content-type": "application/json", origin: BASE, cookie }, body: JSON.stringify({ organizationId: org.id }),
    });
    if (!r.ok) throw new Error(`Organisatsiooni vahetus ebaõnnestus ${r.status}`);
  }
}

// "/juht?tiim=abc" -> "juht--3f2a1c.html"
function fileFor(url) {
  const u = new URL(url, BASE);
  const name = u.pathname.replace(/^\/|\/$/g, "").replace(/\//g, "-") || "index";
  const q = u.searchParams.get("tiim") ?? u.searchParams.get("oskus");
  return q ? `${name}--${crypto.createHash("sha1").update(q).digest("hex").slice(0, 6)}.html` : `${name}.html`;
}

const HEAD_INJECT = `
<script>
// Liikumise suund: paremal olev vaheleht = edasi, vasakul = tagasi
document.addEventListener("click", function (e) {
  var a = e.target.closest && e.target.closest("a"); if (!a) return;
  var tabs = Array.prototype.slice.call(document.querySelectorAll(".tabs a"));
  var i = tabs.indexOf(a), cur = tabs.findIndex(function (t) { return t.classList.contains("on"); });
  try { sessionStorage.setItem("vt", i >= 0 && cur > i ? "nav-back" : "nav-forward"); } catch (_) {}
});
window.addEventListener("pagereveal", function (e) {
  var d; try { d = sessionStorage.getItem("vt"); sessionStorage.removeItem("vt"); } catch (_) {}
  if (e.viewTransition && d) e.viewTransition.types.add(d);
});
</script>
<style>
@view-transition { navigation: auto; }
main.wrap { view-transition-name: page; }
::view-transition-old(page) { animation: 150ms ease-in both vt-fade reverse; }
::view-transition-new(page) { animation: 260ms ease-out 100ms both vt-fade, 400ms ease-out both vt-rise; }
html:active-view-transition-type(nav-forward)::view-transition-old(page) { --slide-offset: -60px; animation: 150ms ease-in both vt-fade reverse, 400ms ease-in-out both vt-slide reverse; }
html:active-view-transition-type(nav-forward)::view-transition-new(page) { --slide-offset: 60px; animation: 210ms ease-out 150ms both vt-fade, 400ms ease-in-out both vt-slide; }
html:active-view-transition-type(nav-back)::view-transition-old(page) { --slide-offset: 60px; animation: 150ms ease-in both vt-fade reverse, 400ms ease-in-out both vt-slide reverse; }
html:active-view-transition-type(nav-back)::view-transition-new(page) { --slide-offset: -60px; animation: 210ms ease-out 150ms both vt-fade, 400ms ease-in-out both vt-slide; }
.demo-pill { position: fixed; left: 16px; bottom: 16px; z-index: 50; display: flex; gap: 10px; align-items: center; background: #141418; color: #fff; border-radius: 999px; padding: 8px 8px 8px 16px; font-size: 12px; box-shadow: 0 8px 24px rgba(20,20,40,.25); }
.demo-pill a { background: #fff; color: #141418; border-radius: 999px; padding: 6px 12px; font-weight: 600; }
.demo-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 60; background: #141418; color: #fff; border-radius: 12px; padding: 12px 18px; font-size: 13px; opacity: 0; transition: opacity .2s; pointer-events: none; max-width: 90vw; }
.demo-toast.on { opacity: 1; }
</style>`;

const BODY_INJECT = (roleDir) => `
<div class="demo-pill">Demo · andmeid ei salvestata <a href="../index.html">Vaheta rolli</a></div>
<div class="demo-toast" id="demo-toast"></div>
<script>
(function () {
  var toast = document.getElementById("demo-toast"), t;
  function say(msg) { toast.textContent = msg; toast.classList.add("on"); clearTimeout(t); t = setTimeout(function () { toast.classList.remove("on"); }, 3200); }
  document.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.target, sel = f.querySelector("select[name=orgId]");
    if (sel) { var name = sel.options[sel.selectedIndex].text; location.href = name.indexOf("Kaldaranna") >= 0 ? "../koolitaja-kaldaranna/koolitaja.html" : "../koolitaja/koolitaja.html"; return; }
    if (/Logi välja/.test(f.textContent)) { location.href = "../index.html"; return; }
    say("Demo: siin andmeid ei salvestata. Päris rakenduses (vt GitHub) see salvestub ja juht ning omanik näevad muutust.");
  }, true);
  var sel = document.querySelector("select[name=orgId]");
  if (sel) sel.value = Array.prototype.find.call(sel.options, function (o) { return ${roleDir === "koolitaja-kaldaranna" ? "o.text.indexOf('Kaldaranna') >= 0" : "o.text.indexOf('Kaldaranna') < 0"}; }).value;

  // Harjutuse kontroll (sama reeglipõhine loogika mis rakenduses)
  var ta = document.querySelector(".le textarea"); if (!ta) return;
  var checks = [
    ["Mida teha", "Ütle, mida ülesanne iga kord teeb.", /(koosta|kokkuvõt|vaata läbi|loe|analüüsi|tee)/i],
    ["Millal", "Lisa aeg ja sagedus, nt „iga esmaspäev kell 8:00“.", /(\\d{1,2}[:.]\\d{2}|iga (päev|nädal|esmaspäev|teisipäev|kolmapäev|neljapäev|reede|kuu)|igal)/i],
    ["Kuhu ja mis kujul", "Lisa, kuhu kokkuvõte saata ja mis vormis, muidu jääb see kuhugi seisma.", /(saada|e-kirjaga|e-postiga|slack|teams|salvesta|tabelina)/i]
  ];
  var start = ta.value, pane = document.querySelector(".le .rpane"), tasks = document.querySelectorAll(".le .task");
  function render(show) {
    var res = checks.map(function (c) { return c[2].test(ta.value); }), ok = res.filter(Boolean).length;
    tasks.forEach(function (el, i) { el.className = "task " + (show && res[i] ? "done" : show && !res[i] ? "now" : ""); el.querySelector(".tick").textContent = show && res[i] ? "✓" : String(i + 1); });
    if (!show) { pane.innerHTML = '<div class="eyebrow" style="margin-bottom:12px">Tagasiside</div><p class="ptext muted">Kirjuta juhis ja vajuta „Kontrolli“.</p>'; return; }
    var h = '<div class="eyebrow" style="margin-bottom:12px">Tagasiside</div><div class="score"><span class="num" style="font-size:40px">' + ok + ' / 3</span><span class="muted small">nõuet täidetud</span></div>';
    checks.forEach(function (c, i) { h += '<div class="check ' + (res[i] ? "ok2" : "bad") + '"><span class="ci">' + (res[i] ? "✓" : "!") + '</span><div><b>' + c[0] + '</b><br><span class="muted small">' + (res[i] ? "Olemas." : c[1]) + '</span></div></div>'; });
    if (ok === 3) h += '<div class="nextbox"><div class="mono small" style="color:#3B5200;margin-bottom:6px">Tehtud</div><p class="ptext" style="margin:0 0 12px 0">Oskus tõuseb tasemele <b>2 · Oskan</b>. Järgmine samm: tee sama oma päris kaustaga ja lisa enne/pärast lugu.</p><a class="btn" href="lood-uus.html">Lisa enne/pärast lugu</a></div>';
    pane.innerHTML = h;
  }
  ta.addEventListener("input", function () { render(false); });
  document.querySelectorAll(".le button").forEach(function (b) {
    b.addEventListener("click", function () { if (/Lähtesta/.test(b.textContent)) { ta.value = start; render(false); } else render(true); });
  });
})();
</script>`;

function transform(html, roleDir, linkMap) {
  htmlClass ||= (html.match(/<html[^>]*class="([^"]*)"/) ?? [])[1] ?? "";
  let out = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(/<link[^>]+as="script"[^>]*>/g, "")
    .replace(/<link[^>]+rel="modulepreload"[^>]*>/g, "");
  out = out.replace(/href="\/favicon\.ico[^"]*"/g, () => { assets.add("/favicon.ico"); return 'href="../favicon.ico"'; });
  // Varad (CSS, fondid) suhteliseks
  out = out.replace(/(href|src)="(\/_next\/[^"]+)"/g, (_, attr, p) => { assets.add(p.split("?")[0]); return `${attr}="..${p.split("?")[0]}"`; });
  // Sisemised lingid failideks
  out = out.replace(/<a([^>]*?)href="(\/[^"]*)"/g, (m, pre, href) => {
    if (href.startsWith("/api") || href.startsWith("/_next")) return m;
    const key = href.replace(/&amp;/g, "&");
    const target = linkMap.get(key) ?? linkMap.get(new URL(key, BASE).pathname);
    return target ? `<a${pre}href="${target}"` : m;
  });
  out = out.replace("</head>", `${HEAD_INJECT}</head>`).replace("</body>", `${BODY_INJECT(roleDir)}</body>`);
  return out;
}

async function crawlRole(role) {
  const cookie = await login(role.email, role.org);
  const queue = [...role.start];
  const seen = new Map(); // href -> { file, html }
  while (queue.length && seen.size < 40) {
    const href = queue.shift();
    if (seen.has(href)) continue;
    const res = await fetch(BASE + href, { headers: { cookie } });
    const finalPath = new URL(res.url).pathname + new URL(res.url).search;
    const html = await res.text();
    // Kui roll suunati mujale (õigused), osuta lingiga sinna, kuhu suunati
    const file = fileFor(finalPath);
    seen.set(href, { file, html: finalPath === href ? html : null });
    if (finalPath !== href && !seen.has(finalPath)) { seen.set(finalPath, { file, html }); }
    for (const m of html.matchAll(/<a[^>]*?href="(\/[^"]*)"/g)) {
      const h = m[1].replace(/&amp;/g, "&");
      if (h.startsWith("/api") || h.startsWith("/_next") || h.startsWith("/login") || h === "/") continue;
      if (!seen.has(h) && !queue.includes(h)) queue.push(h);
    }
  }
  const linkMap = new Map([...seen.entries()].map(([h, v]) => [h, v.file]));
  fs.mkdirSync(path.join(OUT, role.dir), { recursive: true });
  let n = 0;
  for (const [, v] of seen) {
    if (!v.html) continue;
    fs.writeFileSync(path.join(OUT, role.dir, v.file), transform(v.html, role.dir, linkMap));
    n++;
  }
  console.log(`${role.dir}: ${n} lehte`);
}

async function copyAssets() {
  const queue = [...assets];
  const done = new Set();
  while (queue.length) {
    const p = queue.shift();
    if (done.has(p)) continue;
    done.add(p);
    const res = await fetch(BASE + p);
    if (!res.ok) { console.warn("Vara puudub:", p); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    const dest = path.join(OUT, p);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (p.endsWith(".css")) {
      // CSS-is viidatud fondid ja pildid
      let css = buf.toString("utf8");
      css = css.replace(/url\((\/_next\/[^)]+)\)/g, (_, u) => { queue.push(u); return `url(${path.posix.relative(path.posix.dirname(p), u)})`; });
      for (const m of css.matchAll(/url\((\.\.\/media\/[^)]+)\)/g)) queue.push(path.posix.join(path.posix.dirname(p), m[1]));
      fs.writeFileSync(dest, css);
    } else fs.writeFileSync(dest, buf);
  }
  console.log(`varad: ${done.size}`);
}

function writeIndex(cssHref) {
  const card = (href, color, title, who, text) => `
    <a class="course" href="${href}" style="background:${color};min-height:260px">
      <div class="eyebrow" style="color:#33333D">${who}</div>
      <div class="ct">${title}</div><div class="cd">${text}</div><div class="cspacer"></div>
      <span class="btn" style="align-self:flex-start">Ava vaade →</span>
    </a>`;
  fs.writeFileSync(path.join(OUT, "index.html"), `<!doctype html>
<html lang="et" class="${htmlClass}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>AI Eesti Academy · demo</title><link rel="icon" href="favicon.ico">${cssHref.map((h) => `<link rel="stylesheet" href="${h.slice(1)}">`).join("")}
<style>@view-transition { navigation: auto; } body{font-family:var(--font-inter),system-ui,sans-serif} .wrap{padding-top:56px}</style></head>
<body><header class="top"><div class="logo"><span class="ai">AI</span><span class="ee">EESTI</span></div><div class="sep"></div><div class="prod">Academy</div><div class="spacer"></div>
<a class="search" href="${FIGMA}" target="_blank" rel="noreferrer">Figma prototüüp</a>&nbsp;<a class="search" href="${GITHUB}" target="_blank" rel="noreferrer">GitHub</a></header>
<main class="wrap">
  <div class="eyebrow">Tootejuhi kodutöö · klikitav demo</div>
  <h1 class="title" style="font-size:52px">Koolitus sai läbi. <span class="blue">Mis saab edasi?</span></h1>
  <p class="lead">Enne koolitust kaardistame iga töötaja baasjoone ja kitsaskohad. Pärast koolitust näitab Academy, mis päriselt muutus. Vali roll ja vaata, mida see inimene näeb.</p>
  <div class="courses" style="margin-top:32px">
    ${card("tiimiliige/kursused.html", "#C5DDF2", "Rasmus Kask", "Tiimiliige", "Minu kursused, koolitaja materjalid, oskuste kaart, harjutus ja enne/pärast lugu. Alusta ka küsitlusest enne koolitust.")}
    ${card("juht/juht.html", "#E8BCCB", "Liis Org", "Juht · Müük ja kliendisuhted", "Tiimi areng enne ja pärast, kes mida oskab, kitsaskohad ja koostöö koolitajaga.")}
    ${card("omanik/omanik.html", "#D6E89A", "Peeter Grünberg", "Omanik · Põhjarannik Grupp", "Kõik, mida juht näeb, ja lisaks säästetud aeg, tasuvus, tööjaotus, takistused ja heaolu.")}
    ${card("koolitaja/koolitaja.html", "#EFE5F6", "Kaia Tamm", "Koolitaja · AI Eesti", "Materjalide lisamine tiimidele ja kitsaskohad, mida materjalid veel ei kata. Kaks kliendifirmat.")}
  </div>
  <div class="card" style="margin-top:24px"><h3>Mis on demo ja mis on päris rakendus</h3>
    <p class="sub" style="margin:8px 0 0 0">See on staatiline koopia töötavast rakendusest (Next.js, SQLite, organisatsioonipõhine sisselogimine). Siin saab kõiki vaateid läbi klõpsata ja harjutust proovida, aga vorme ei salvestata. Päris rakenduse käivitamise juhend on <a href="${GITHUB}" style="text-decoration:underline">GitHubis</a>. Kõik numbrid on näidisandmed.</p></div>
</main></body></html>`);
}

for (const role of ROLES) await crawlRole(role);
const css = [...assets].filter((a) => a.endsWith(".css"));
await copyAssets();
writeIndex(css);
console.log(`Valmis: ${OUT}`);

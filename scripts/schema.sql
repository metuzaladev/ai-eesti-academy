-- Academy enda andmed. Kasutajad, organisatsioonid, liikmed ja tiimid on Better Authi tabelites.

CREATE TABLE IF NOT EXISTS org_settings (
  org_id TEXT PRIMARY KEY,
  training_date TEXT NOT NULL,      -- koolituse kuupäev (baasjoon on sellest enne)
  hourly_rate REAL NOT NULL,        -- keskmine tunnihind tasuvuse arvutamiseks
  investment_eur REAL NOT NULL,     -- koolituse + Academy hind
  licenses INTEGER NOT NULL,        -- AI tööriista litsentsid
  weekly_active INTEGER NOT NULL    -- tööriista analüütikast (MVP-s näidisväärtus)
);

CREATE TABLE IF NOT EXISTS course (
  id TEXT PRIMARY KEY,
  org_id TEXT,                      -- NULL = avatud kursus kõigile
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL,
  icon TEXT NOT NULL,
  lessons_total INTEGER NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS enrollment (
  user_id TEXT NOT NULL,
  course_id TEXT NOT NULL,
  lessons_done INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE IF NOT EXISTS skill (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);

-- Tase: 1 Tean, 2 Oskan, 3 Kasutan tööl, 4 Õpetan teisi
CREATE TABLE IF NOT EXISTS user_skill (
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  level INTEGER NOT NULL,
  evidence TEXT,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, skill_id)
);

-- Kitsaskoht tiimis: baasjoon küsitlusest. Praegune seis = baasjoon − seotud lugude kokkuhoid.
CREATE TABLE IF NOT EXISTS bottleneck (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  name TEXT NOT NULL,
  question TEXT NOT NULL,           -- koolitaja ette valmistatud küsimus
  reason TEXT NOT NULL,
  ai_potential TEXT NOT NULL,       -- 'Kõrge' | 'Keskmine'
  people INTEGER NOT NULL,
  baseline_h_week REAL NOT NULL,
  outcome TEXT,                     -- nt "vastus 4 h → 1 h 10 min"
  outcome_source TEXT               -- 'Helpdesk' | 'ERP' | 'CRM' | 'Lood'
);

CREATE TABLE IF NOT EXISTS survey_response (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  bottleneck_id TEXT NOT NULL,
  not_relevant INTEGER NOT NULL DEFAULT 0,
  hours_week REAL,
  reasons TEXT NOT NULL DEFAULT '[]', -- JSON massiiv
  other_reason TEXT,
  pain TEXT,
  stress INTEGER,
  success_metric TEXT,
  created_at TEXT NOT NULL,
  UNIQUE (user_id, bottleneck_id)
);

CREATE TABLE IF NOT EXISTS story (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  skill_id TEXT NOT NULL,
  bottleneck_id TEXT,
  task TEXT NOT NULL,
  before_text TEXT NOT NULL,
  after_text TEXT NOT NULL,
  before_min INTEGER NOT NULL,
  after_min INTEGER NOT NULL,
  per_month INTEGER NOT NULL,
  outcome TEXT,
  stress_effect TEXT,
  freed_use TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pulse (
  org_id TEXT NOT NULL,
  team_id TEXT NOT NULL,
  month TEXT NOT NULL,              -- 'YYYY-MM'
  workload_ok REAL NOT NULL,        -- % vastanutest
  stress REAL NOT NULL,             -- 1–5
  overtime_h REAL NOT NULL,         -- ületunde inimese kohta kuus
  respondents INTEGER NOT NULL,
  PRIMARY KEY (org_id, team_id, month)
);

-- Koolitaja lisatud materjalid. team_id NULL = kogu organisatsioonile
CREATE TABLE IF NOT EXISTS material (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  team_id TEXT,
  skill_id TEXT,
  bottleneck_id TEXT,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  kind TEXT NOT NULL,               -- 'Harjutus' | 'Video' | 'Juhend' | 'Link'
  url TEXT,
  minutes INTEGER NOT NULL,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS material_done (
  material_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  done_at TEXT NOT NULL,
  PRIMARY KEY (material_id, user_id)
);

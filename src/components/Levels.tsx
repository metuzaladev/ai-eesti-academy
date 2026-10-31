import { LEVELS } from "@/lib/data";

export function Levels({ level }: { level: number }) {
  return (
    <div className="levels">
      {LEVELS.map((name, i) => (
        <div key={name} className={`lv${i < level ? " done" : ""}`}><i /><small>{name}</small></div>
      ))}
    </div>
  );
}

export function Cell({ level }: { level: number }) {
  return (
    <span className={`cell${level === 4 ? " t4" : ""}`} aria-label={`Tase ${level}`}>
      {[1, 2, 3, 4].map((i) => <i key={i} className={i <= level ? "f" : ""} />)}
    </span>
  );
}

// Samad kujundid, mis praeguse Academy kursusekaartidel
export function CourseIcon({ icon }: { icon: string }) {
  if (icon === "arch")
    return <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden><path fill="#6E9FD6" d="M14 66 V34 a22 22 0 0 1 44 0 V66 h-15 V34 a7 7 0 0 0 -14 0 V66 z" /></svg>;
  if (icon === "diamond")
    return <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden><rect x="16" y="16" width="40" height="40" fill="#A8323E" transform="rotate(45 36 36)" /></svg>;
  if (icon === "hexagon")
    return <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden><polygon fill="#3E7D5A" points="20,12 52,12 68,36 52,60 20,60 4,36" /></svg>;
  const petals = [[36, 18], [36, 54], [18, 36], [54, 36], [23.3, 23.3], [48.7, 23.3], [23.3, 48.7], [48.7, 48.7]];
  return (
    <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden>
      <g fill="#6E9FD6">{petals.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="12" />)}<circle cx="36" cy="36" r="16" /></g>
    </svg>
  );
}

export const BAR_TRACK: Record<string, string> = { "#C5DDF2": "#A9C3DD", "#E8BCCB": "#D8A9B8", "#D6E89A": "#BDD27E" };

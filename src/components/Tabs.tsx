"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Tabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const pathname = usePathname();
  const current = tabs.findIndex((t) => pathname.startsWith(t.href));
  return (
    <nav className="tabs">
      {tabs.map((t, i) => (
        // Paremal olev vaheleht libiseb sisse paremalt, vasakul olev vasakult
        <Link key={t.href} href={t.href} className={`tab${i === current ? " on" : ""}`}
          transitionTypes={[current === -1 || i > current ? "nav-forward" : "nav-back"]}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

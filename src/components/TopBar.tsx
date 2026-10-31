import { signOut, switchOrg } from "@/app/actions";
import { ROLE_LABEL, type Role } from "@/lib/permissions";
import type { Ctx } from "@/lib/session";
import { Tabs } from "./Tabs";

// Iga roll näeb ainult oma vahelehti; sama kontroll on ka iga lehe serveripoolses osas
const TABS: Record<Role, { href: string; label: string }[]> = {
  member: [
    { href: "/kursused", label: "Minu kursused" },
    { href: "/oskused", label: "Minu oskused" },
    { href: "/tiim", label: "Tiimi oskused" },
    { href: "/kusitlus", label: "Enne koolitust" },
  ],
  manager: [
    { href: "/juht", label: "Tiimi ülevaade" },
    { href: "/kitsaskohad", label: "Kitsaskohad" },
    { href: "/tiim", label: "Tiimi oskused" },
    { href: "/kursused", label: "Minu kursused" },
  ],
  owner: [
    { href: "/omanik", label: "Mõju ja tasuvus" },
    { href: "/kitsaskohad", label: "Kitsaskohad" },
    { href: "/juht", label: "Tiimi ülevaade" },
    { href: "/tiim", label: "Tiimi oskused" },
  ],
  trainer: [
    { href: "/koolitaja", label: "Materjalid" },
    { href: "/kitsaskohad", label: "Kitsaskohad" },
  ],
};

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");
const AVATAR: Record<Role, string> = { member: "#F2DE7C", manager: "#E8BCCB", owner: "#C5DDF2", trainer: "#D6E89A" };

export function TopBar({ ctx }: { ctx: Ctx }) {
  return (
    <header className="top">
      <div className="logo"><span className="ai">AI</span><span className="ee">EESTI</span></div>
      <div className="sep" />
      <div className="prod">Academy</div>
      <Tabs tabs={TABS[ctx.role]} />
      <div className="spacer" />
      <div className="user">
        {ctx.memberships.length > 1 ? (
          <form action={switchOrg}>
            <select name="orgId" defaultValue={ctx.orgId} className="orgsel" aria-label="Organisatsioon">
              {ctx.memberships.map((m) => <option key={m.orgId} value={m.orgId}>{m.orgName}</option>)}
            </select>{" "}
            <button className="linkbtn" type="submit">Vaheta</button>
          </form>
        ) : null}
        <div className="who">
          <b>{ctx.user.name}</b>
          <span className="muted">{ROLE_LABEL[ctx.role]} · {ctx.memberships.length > 1 ? "AI Eesti" : ctx.orgName}</span>
        </div>
        <div className="avatar" style={{ background: AVATAR[ctx.role] }}>{initials(ctx.user.name)}</div>
        <form action={signOut}><button className="linkbtn" type="submit">Logi välja</button></form>
      </div>
    </header>
  );
}

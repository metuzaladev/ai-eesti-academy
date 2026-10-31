import { Page } from "@/components/Page";
import { requireRole } from "@/lib/session";
import { Exercise } from "./Exercise";

export default async function HarjutusPage() {
  const ctx = await requireRole(["member", "manager"]);
  return (
    <Page>
      <div className="eyebrow" style={{ marginTop: 44 }}>{ctx.orgName} · Claude Chat ja Cowork › Ajastatud ülesanded</div>
      <h1 className="title" style={{ fontSize: 40, marginBottom: 24 }}>Harjutus: <span className="blue">ajasta korduv kokkuvõte</span></h1>
      <Exercise />
    </Page>
  );
}

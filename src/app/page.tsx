import { redirect } from "next/navigation";
import { HOME_FOR_ROLE } from "@/lib/permissions";
import { getCtx } from "@/lib/session";

// Avaleht suunab rolli järgi õigesse vaatesse
export default async function Home() {
  const ctx = await getCtx();
  redirect(ctx ? HOME_FOR_ROLE[ctx.role] : "/login");
}

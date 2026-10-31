import { redirect } from "next/navigation";
import { TopBar } from "@/components/TopBar";
import { getCtx } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getCtx();
  if (!ctx) redirect("/login");
  return (
    <>
      <TopBar ctx={ctx} />
      <main className="wrap">{children}</main>
    </>
  );
}

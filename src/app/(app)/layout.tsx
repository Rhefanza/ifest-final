import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { getRuns } from "@/lib/db/queries";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const runs = await getRuns();
  // Default to run ID 4 (origin 169, Prakiraan November)
  const defaultRunId = 4;

  return (
    <div className="flex min-h-screen bg-[#F4F6F9]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header runs={runs} currentRunId={defaultRunId} />
        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}

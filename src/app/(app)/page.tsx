import { LaporanDashboard } from "@/components/laporan/laporan-dashboard";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const runId = run ? parseInt(run, 10) : 4; // Default to run 4 (origin 169)

  return <LaporanDashboard runId={runId} />;
}

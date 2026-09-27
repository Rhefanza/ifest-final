import { LaporanDashboard } from "@/components/laporan/laporan-dashboard";

export default async function LaporanRunPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const id = parseInt(runId, 10) || 4;

  return <LaporanDashboard runId={id} />;
}

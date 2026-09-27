import { getSubdasDetail, getRunById } from "@/lib/db/queries";
import { SubdasHeader } from "@/components/subdas/subdas-header";
import { WaterBalanceChart } from "@/components/subdas/water-balance-chart";
import { ShapBarChart } from "@/components/subdas/shap-bar-chart";
import { IndicatorCards } from "@/components/subdas/indicator-cards";
import { NeighborsList } from "@/components/subdas/neighbors-list";
import { InspectionCard } from "@/components/subdas/inspection-card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function SubdasDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { id: subdasId } = await params;
  const { run } = await searchParams;
  const runId = run ? parseInt(run, 10) : 4;

  const { subdas: subdasStatic, prediction, downstream, upstream } =
    await getSubdasDetail(subdasId, runId);

  if (!prediction && !subdasStatic) {
    return (
      <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center max-w-lg mx-auto mt-12 space-y-4">
        <h2 className="text-xl font-bold font-heading text-navy">
          Sub-DAS Tidak Ditemukan
        </h2>
        <p className="text-xs text-slate-500">
          ID Sub-DAS <code className="font-mono font-bold">{subdasId}</code> tidak ditemukan pada data amatan.
        </p>
        <Link
          href={`/laporan/${runId}`}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue text-white rounded-lg text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Laporan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header identity */}
      <SubdasHeader
        subdasId={subdasId}
        subdasStatic={subdasStatic}
        prediction={prediction}
        runId={runId}
      />

      {/* 2. Key Indicators */}
      <IndicatorCards indicators={prediction?.indicators} />

      {/* 3. Main Grid: Charts on left, Action & Topology on right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7 cols */}
        <div className="lg:col-span-7 space-y-6">
          <WaterBalanceChart series={prediction?.series} />
          <ShapBarChart shapTop={prediction?.shap_top} />
        </div>

        {/* Right Column: 5 cols */}
        <div className="lg:col-span-5 space-y-6">
          <InspectionCard
            runId={runId}
            subdasId={subdasId}
            initialStatus={prediction?.inspection_status}
            initialResult={prediction?.inspection_result}
            initialNote={prediction?.inspection_note}
          />
          <NeighborsList
            subdasId={subdasId}
            downstream={downstream}
            upstream={upstream}
            runId={runId}
          />
        </div>
      </div>
    </div>
  );
}

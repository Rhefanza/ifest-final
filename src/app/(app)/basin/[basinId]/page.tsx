import { getBasinGraph, getBasinList } from "@/lib/db/queries";
import { BasinDagViewer } from "@/components/basin/basin-dag-viewer";
import { BasinPlanButton } from "@/components/basin/basin-plan-button";
import { Slide11InsightCard } from "@/components/basin/slide11-insight-card";
import Link from "next/link";
import { ArrowLeft, GitFork, AlertCircle, AlertTriangle, CheckCircle2, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format";

export default async function BasinDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ basinId: string }>;
  searchParams: Promise<{ run?: string }>;
}) {
  const { basinId: basinParam } = await params;
  const { run } = await searchParams;
  const basinId = parseInt(basinParam, 10) || 40;
  const runId = run ? parseInt(run, 10) : 4;

  const { nodes, edges } = await getBasinGraph(basinId, runId);
  const basinList = await getBasinList(runId);
  const currentBasinMeta = basinList.find((b) => b.basin_id === basinId);

  // Compute counts
  let nSiaga = 0;
  let nWaspada = 0;
  let nNormal = 0;
  let nEscalated = 0;

  nodes.forEach((n) => {
    const t = n.tier_final || n.tier;
    if (t === "SIAGA") nSiaga++;
    else if (t === "WASPADA") nWaspada++;
    else nNormal++;
    if (n.is_escalated) nEscalated++;
  });

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/basin?run=${runId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Daftar Basin</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-mono font-bold text-navy">Basin {basinId}</span>
            {basinId === 40 && (
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue border border-blue-200">
                Studi Kasus Slide 11
              </span>
            )}
            {currentBasinMeta?.is_new && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Baru
              </span>
            )}
          </div>

          <h1 className="text-2xl font-black font-heading text-navy flex items-center gap-2">
            <GitFork className="w-6 h-6 text-blue" />
            <span>Peta Aliran Hidrologi Basin {basinId}</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Graf terarah (DAG) hubungan hulu ke muara hilir. Total {nodes.length} sub-DAS dan {edges.length} koneksi aliran sungai.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {basinId !== 40 && (
            <Link
              href={`/basin/40?run=${runId}`}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-blue bg-blue-50 border border-blue-200 hover:bg-blue-100 transition"
            >
              <span>Buka Basin 40 (Slide 11)</span>
            </Link>
          )}

          <BasinPlanButton
            runId={runId}
            basinId={basinId}
            initialHasPlan={currentBasinMeta?.has_plan ?? false}
          />
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Total Sub-DAS
          </div>
          <div className="font-mono text-xl font-bold text-navy mt-0.5">
            {nodes.length}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-red-50/50 border border-red-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> SIAGA (10%)
          </div>
          <div className="font-mono text-xl font-black text-red mt-0.5">
            {nSiaga}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/50 border border-amber-200 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> WASPADA
          </div>
          <div className="font-mono text-xl font-bold text-amber-900 mt-0.5">
            {nWaspada}
            {nEscalated > 0 && (
              <span className="text-xs text-amber-700 ml-1 font-sans font-normal">
                (+{nEscalated})
              </span>
            )}
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-teal" /> NORMAL
          </div>
          <div className="font-mono text-xl font-bold text-slate-700 mt-0.5">
            {nNormal}
          </div>
        </div>
      </div>

      {/* Slide 11 Insight Card */}
      <Slide11InsightCard
        basinId={basinId}
        nSubdas={nodes.length}
        nSiaga={nSiaga}
        runId={runId}
      />

      {/* ReactFlow Interactive DAG Viewer */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Gunakan scroll mouse untuk memperbesar/memperkecil (zoom), seret kanvas untuk menggeser. Klik node untuk melihat ringkasan.
          </span>
          <span className="font-mono text-[11px]">
            {nodes.length} nodes · {edges.length} edges
          </span>
        </div>
        <BasinDagViewer rawNodes={nodes} rawEdges={edges} runId={runId} />
      </div>
    </div>
  );
}

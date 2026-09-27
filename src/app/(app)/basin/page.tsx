import { getBasinList } from "@/lib/db/queries";
import { BasinTable } from "@/components/basin/basin-table";
import { GitFork, AlertCircle, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatNumber } from "@/lib/format";

export default async function BasinIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const runId = run ? parseInt(run, 10) : 4;
  const basins = await getBasinList(runId);

  const totalBasins = basins.length;
  const basinsWithSiaga = basins.filter((b) => b.n_siaga > 0).length;
  const newBasins = basins.filter((b) => b.is_new).length;
  const plannedBasins = basins.filter((b) => b.has_plan).length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue uppercase tracking-wider mb-1">
            <GitFork className="w-4 h-4 text-blue" />
            Kesatuan Pengelolaan Wilayah Sungai
          </div>
          <h1 className="text-2xl font-black font-heading text-navy">
            Jaringan Aliran Basin Sub-DAS
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Pengelolaan water stress tidak dapat dilakukan secara terisolasi per sub-DAS. Setiap kesatuan basin mengintegrasikan seluruh anak sungai dari hulu hingga muara hilir.
          </p>
        </div>

        {/* Slide 11 Quick Feature Card */}
        <Link
          href={`/basin/40?run=${runId}`}
          className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-teal-50 border border-blue-200/80 hover:border-blue transition shadow-xs group shrink-0"
        >
          <div className="text-[10px] font-bold text-blue uppercase tracking-wider">
            Demo Presentasi Slide 11
          </div>
          <div className="text-sm font-bold text-navy group-hover:text-blue flex items-center gap-1.5 mt-0.5">
            <span>Buka Basin 40 (35 Sub-DAS)</span>
            <ArrowRight className="w-4 h-4 transition transform group-hover:translate-x-0.5" />
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            12 Sub-DAS SIAGA · Efek domino hulu-hilir
          </div>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Basin</span>
            <GitFork className="w-4 h-4 text-blue" />
          </div>
          <div className="text-2xl font-bold font-heading text-navy">
            {formatNumber(totalBasins)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Kesatuan DAS nasional</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-red-200/80 shadow-xs bg-red-50/20">
          <div className="flex items-center justify-between text-red-600 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider">Basin SIAGA</span>
            <AlertCircle className="w-4 h-4 text-red" />
          </div>
          <div className="text-2xl font-black font-heading text-red">
            {formatNumber(basinsWithSiaga)}
          </div>
          <div className="text-[11px] text-red-700/80 mt-0.5 font-medium">
            Memiliki ≥1 sub-DAS SIAGA
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Basin Baru</span>
            <Sparkles className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold font-heading text-navy">
            {formatNumber(newBasins)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Tanpa riwayat di data latih</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Rencana Bersama</span>
            <CheckCircle2 className="w-4 h-4 text-teal" />
          </div>
          <div className="text-2xl font-bold font-heading text-navy">
            {formatNumber(plannedBasins)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Koordinasi alokasi air siap</div>
        </div>
      </div>

      {/* Main Basin Table */}
      <BasinTable initialData={basins} runId={runId} />
    </div>
  );
}

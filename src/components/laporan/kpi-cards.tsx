import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert, GitFork, Sparkles } from "lucide-react";
import { formatNumber } from "@/lib/format";

interface KpiProps {
  nRows: number;
  nSiaga: number;
  nWaspada: number;
  nNormal: number;
  nEscalated: number;
  nBasinSiaga: number;
  nNewSubdas: number;
}

export function KpiCards({
  nRows,
  nSiaga,
  nWaspada,
  nNormal,
  nEscalated,
  nBasinSiaga,
  nNewSubdas,
}: KpiProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Dinilai */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Sub-DAS</span>
          <CheckCircle2 className="w-4 h-4 text-blue" />
        </div>
        <div className="text-2xl font-bold font-heading text-navy">
          {formatNumber(nRows)}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Wilayah dinilai bulan ini
        </div>
      </div>

      {/* 2. SIAGA */}
      <div className="bg-red-50/50 p-4 rounded-xl border border-red-200/80 shadow-xs">
        <div className="flex items-center justify-between text-red-600 mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red animate-pulse" /> SIAGA
          </span>
          <AlertCircle className="w-4 h-4 text-red" />
        </div>
        <div className="text-2xl font-black font-heading text-red">
          {formatNumber(nSiaga)}
        </div>
        <div className="text-[11px] text-red-700/80 mt-0.5 font-medium">
          10% teratas · Prioritas H+1
        </div>
      </div>

      {/* 3. WASPADA */}
      <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 shadow-xs">
        <div className="flex items-center justify-between text-amber-700 mb-1.5">
          <span className="text-xs font-bold uppercase tracking-wider">WASPADA</span>
          <AlertTriangle className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold font-heading text-amber-900">
          {formatNumber(nWaspada)}
          {nEscalated > 0 && (
            <span className="text-xs font-semibold text-amber-700 ml-1.5 font-sans">
              (+{nEscalated} eskalasi)
            </span>
          )}
        </div>
        <div className="text-[11px] text-amber-700 mt-0.5">
          20% berikutnya + tetangga
        </div>
      </div>

      {/* 4. NORMAL */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">NORMAL</span>
          <CheckCircle2 className="w-4 h-4 text-teal" />
        </div>
        <div className="text-2xl font-bold font-heading text-slate-700">
          {formatNumber(nNormal - nEscalated)}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Kondisi aman terkendali
        </div>
      </div>

      {/* 5. Basin dengan SIAGA */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Basin SIAGA</span>
          <GitFork className="w-4 h-4 text-blue" />
        </div>
        <div className="text-2xl font-bold font-heading text-navy">
          {formatNumber(nBasinSiaga)}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Koordinasi alokasi air
        </div>
      </div>

      {/* 6. Sub-DAS Baru */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="text-xs font-semibold uppercase tracking-wider">Wilayah Baru</span>
          <Sparkles className="w-4 h-4 text-purple-500" />
        </div>
        <div className="text-2xl font-bold font-heading text-navy">
          {formatNumber(nNewSubdas)}
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Tanpa histori pelatihan
        </div>
      </div>
    </div>
  );
}

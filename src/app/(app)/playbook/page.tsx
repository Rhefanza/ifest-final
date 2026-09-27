import { getRunPredictions, getRunById } from "@/lib/db/queries";
import { formatNumber, truncateId } from "@/lib/format";
import {
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Search,
} from "lucide-react";
import Link from "next/link";
import { PlaybookTasksList } from "@/components/playbook/playbook-tasks-list";

export default async function PlaybookPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run } = await searchParams;
  const runId = run ? parseInt(run, 10) : 4;
  const runData = await getRunById(runId);
  const { data: allPreds, total } = await getRunPredictions(runId, { pageSize: 5000 });

  const siagaList = allPreds.filter((p) => (p.tier_final || p.tier) === "SIAGA");
  const waspadaList = allPreds.filter((p) => (p.tier_final || p.tier) === "WASPADA");

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue uppercase tracking-wider mb-1">
            <ClipboardList className="w-4 h-4 text-blue" />
            <span>Panduan Standar Operasional Prosedur (SOP)</span>
          </div>
          <h1 className="text-2xl font-black font-heading text-navy">
            Playbook Tindakan Lapangan 4 Pekan
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Jadwal tindakan operasional terstruktur untuk mengantisipasi water stress pada {runData?.label || "Bulan Target"}. Mengalihkan respon pasif darurat bencana menjadi mitigasi preventif terjadwal.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="px-3.5 py-2 bg-red-50 text-red border border-red-200 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-red-600">Target SIAGA</div>
            <div className="font-mono text-xl font-black">{siagaList.length} Sub-DAS</div>
          </div>
          <div className="px-3.5 py-2 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl text-center">
            <div className="text-[10px] uppercase font-bold text-amber-700">WASPADA</div>
            <div className="font-mono text-xl font-bold">{waspadaList.length} Sub-DAS</div>
          </div>
        </div>
      </div>

      {/* 4-Pekan Timeline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Pekan 1 */}
        <div className="p-4 rounded-2xl bg-white border border-red-200 shadow-xs relative overflow-hidden">
          <div className="w-1.5 h-full bg-red absolute left-0 top-0" />
          <div className="pl-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-red uppercase tracking-wider text-[10px]">
                Pekan 1 (H+1 s/d H+7)
              </span>
              <span className="font-mono text-[10px] text-slate-400">Inspeksi Intake</span>
            </div>
            <h3 className="font-bold text-navy text-sm">Validasi Visual & Ground Check</h3>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Petugas memverifikasi debit saluran primer, mata air, dan sumur pantau pada {siagaList.length} sub-DAS SIAGA.
            </p>
          </div>
        </div>

        {/* Pekan 2 */}
        <div className="p-4 rounded-2xl bg-white border border-blue-200 shadow-xs relative overflow-hidden">
          <div className="w-1.5 h-full bg-blue absolute left-0 top-0" />
          <div className="pl-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-blue uppercase tracking-wider text-[10px]">
                Pekan 2 (H+8 s/d H+14)
              </span>
              <span className="font-mono text-[10px] text-slate-400">Level Basin</span>
            </div>
            <h3 className="font-bold text-navy text-sm">Koordinasi Alokasi Terpadu</h3>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Rapat lintas pemangku kepentingan BBWS dan P3A untuk menyepakati debit transfer dari hulu ke hilir yang kritis.
            </p>
          </div>
        </div>

        {/* Pekan 3 */}
        <div className="p-4 rounded-2xl bg-white border border-amber-200 shadow-xs relative overflow-hidden">
          <div className="w-1.5 h-full bg-amber-500 absolute left-0 top-0" />
          <div className="pl-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-amber-700 uppercase tracking-wider text-[10px]">
                Pekan 3 (H+15 s/d H+21)
              </span>
              <span className="font-mono text-[10px] text-slate-400">Intervensi</span>
            </div>
            <h3 className="font-bold text-navy text-sm">Gilir-Giring & Pompa Darurat</h3>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Aktivasi rotasi jadwal pengaliran irigasi dan mobilisasi armada pompa sumur dangkal cadangan di titik paling kering.
            </p>
          </div>
        </div>

        {/* Pekan 4 */}
        <div className="p-4 rounded-2xl bg-white border border-teal/40 shadow-xs relative overflow-hidden">
          <div className="w-1.5 h-full bg-teal absolute left-0 top-0" />
          <div className="pl-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-teal uppercase tracking-wider text-[10px]">
                Pekan 4 (H+22 s/d H+30)
              </span>
              <span className="font-mono text-[10px] text-slate-400">Evaluasi</span>
            </div>
            <h3 className="font-bold text-navy text-sm">Audit Dampak & Siklus Baru</h3>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
              Pengecekan akhir ketersediaan air menjelang rilis prakiraan bulan berikutnya. Penyesuaian kuota simpanan waduk.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Tasks Table Component */}
      <PlaybookTasksList initialItems={siagaList} runId={runId} />
    </div>
  );
}

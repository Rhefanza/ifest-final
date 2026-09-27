import Link from "next/link";
import {
  FileText,
  Printer,
  ArrowRight,
  GitMerge,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { formatPercent } from "@/lib/format";

interface QuickActionProps {
  runId: number;
  nSiaga: number;
  downstreamSiagaRate: number;
  targetMonthName: string;
}

export function QuickActionPanel({
  runId,
  nSiaga,
  downstreamSiagaRate,
  targetMonthName,
}: QuickActionProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue" />
            <h3 className="font-heading font-bold text-navy text-sm">
              Yang Langsung Bisa Dilakukan
            </h3>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue px-2 py-0.5 rounded-full border border-blue-100">
            H+1 Operasional
          </span>
        </div>

        <p className="text-xs text-slate-600 mb-4 leading-relaxed">
          Tindakan cepat lapangan untuk peringatan dini bulan <strong>{targetMonthName}</strong>:
        </p>

        <div className="space-y-3 mb-5">
          <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <CheckCircle className="w-4 h-4 text-red shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-navy">Jadwalkan Inspeksi Lapangan:</span>{" "}
              {nSiaga} sub-DAS SIAGA telah dimasukkan ke daftar tugas Playbook Minggu ke-1.
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <GitMerge className="w-4 h-4 text-blue shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-navy">Koordinasi Terpadu Basin:</span>{" "}
              Sekitar <strong>{formatPercent(downstreamSiagaRate)}</strong> sub-DAS SIAGA memiliki hilir yang juga SIAGA. Tangani satu kesatuan aliran di modul Basin.
            </div>
          </div>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2">
        <Link
          href={`/playbook?run=${runId}`}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-blue text-white text-xs font-semibold hover:bg-blue-600 transition shadow-xs"
        >
          <span>Buka Playbook Tugas</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          href={`/laporan/${runId}/cetak`}
          target="_blank"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy text-xs font-semibold transition"
          title="Cetak format laporan A4 resmi"
        >
          <Printer className="w-3.5 h-3.5 text-slate-500" />
          <span>Cetak A4</span>
        </Link>

        <a
          href={`/api/runs/${runId}/export`}
          download={`laporan_siaga_run_${runId}.csv`}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-navy text-xs font-semibold transition"
          title="Unduh seluruh data tabel dalam format CSV"
        >
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>Ekspor CSV</span>
        </a>
      </div>
    </div>
  );
}

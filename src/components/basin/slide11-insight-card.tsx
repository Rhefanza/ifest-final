import { GitMerge, AlertCircle, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export function Slide11InsightCard({
  basinId,
  nSubdas,
  nSiaga,
  runId,
}: {
  basinId: number;
  nSubdas: number;
  nSiaga: number;
  runId: number;
}) {
  const isBasin40 = basinId === 40;

  return (
    <div className="bg-gradient-to-br from-white to-blue-50/40 p-6 rounded-2xl border border-blue-200/80 shadow-xs space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitMerge className="w-5 h-5 text-blue" />
          <h3 className="font-heading font-bold text-navy text-sm">
            {isBasin40
              ? "Wawasan Kritis Slide 11: Efek Domino Aliran Hulu-Hilir"
              : `Dinamika Aliran Jaringan Basin ${basinId}`}
          </h3>
        </div>
        {isBasin40 && (
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue px-2.5 py-0.5 rounded-full">
            Studi Kasus Inti IFEST
          </span>
        )}
      </div>

      <p className="text-xs text-slate-600 leading-relaxed text-justify">
        {isBasin40 ? (
          <>
            Basin 40 merepresentasikan <strong>35 sub-DAS</strong> yang saling terhubung dengan <strong>12 sub-DAS berstatus SIAGA</strong> (34,3%). Ketika sub-DAS di bagian hulu mengalami defisit debit aliran dasar (baseflow), anak sungai di bagian tengah dan hilir mengalami defisit pasokan akumulatif hingga <strong>1,4×</strong> lebih parah. Penanganan parsial di satu titik hilir tidak akan efektif tanpa koordinasi pelepasan air bendung hulu.
          </>
        ) : (
          <>
            Dalam kesatuan hidrologi Basin {basinId} yang mencakup <strong>{nSubdas} sub-DAS</strong> dengan <strong>{nSiaga} wilayah SIAGA</strong>, pola limpasan hulu secara langsung menentukan debit masukan bagi sub-DAS di hilirnya. Intervensi lapangan harus diprioritaskan sebagai satu kesatuan aliran.
          </>
        )}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">1. Tindakan Hulu</span>
          <span className="font-semibold text-navy text-[11px] mt-0.5 block">
            Penghematan intake & pemantauan mata air
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">2. Koordinasi Tengah</span>
          <span className="font-semibold text-navy text-[11px] mt-0.5 block">
            Rotasi gilir giring alokasi air irigasi
          </span>
        </div>
        <div className="p-2.5 rounded-xl bg-white border border-slate-200/80 text-xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase block">3. Mitigasi Hilir</span>
          <span className="font-semibold text-navy text-[11px] mt-0.5 block">
            Aktivasi sumur darurat & proteksi intake PDAM
          </span>
        </div>
      </div>
    </div>
  );
}

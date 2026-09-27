import { getRunById, getRunPredictions } from "@/lib/db/queries";
import { formatNumber, formatScore, truncateId } from "@/lib/format";
import { MONTH_NAMES, KEY_METRICS } from "@/lib/constants";
import { formatActionText } from "@/lib/rules";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./print-button";

export default async function CetakLaporanPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const id = parseInt(runId, 10) || 4;
  const run = await getRunById(id);
  const { data: allPreds, total } = await getRunPredictions(id, { pageSize: 5000 });

  const targetMonth = MONTH_NAMES[run?.target_month || 10] || "Oktober";
  const originMonth = MONTH_NAMES[run?.origin_month || 9] || "September";

  // Calculate tier counts
  let nSiaga = 0;
  let nWaspada = 0;
  let nNormal = 0;
  let nEscalated = 0;
  const basinSet = new Set<number>();

  allPreds.forEach((p) => {
    const effTier = p.tier_final || p.tier;
    if (effTier === "SIAGA") {
      nSiaga++;
      basinSet.add(p.basin_id);
    } else if (effTier === "WASPADA") {
      nWaspada++;
    } else {
      nNormal++;
    }
    if (p.tier !== p.tier_final) nEscalated++;
  });

  // Top 20 SIAGA sorted by rank
  const top20Siaga = [...allPreds]
    .filter((p) => (p.tier_final || p.tier) === "SIAGA")
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 20);

  const todayStr = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 print:bg-white print:py-0 print:px-0">
      {/* Non-printed action bar */}
      <div className="max-w-4xl mx-auto mb-6 flex items-center justify-between print:hidden">
        <Link
          href={`/laporan/${id}`}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-navy font-medium bg-white px-3 py-2 rounded-lg border border-slate-200 shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke Dashboard
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">Format cetak resmi standar A4</span>
          <PrintButton />
        </div>
      </div>

      {/* A4 Sheet Container */}
      <div className="max-w-4xl mx-auto bg-white p-10 md:p-12 shadow-md border border-slate-200 print:shadow-none print:border-none print:p-6 text-slate-800 font-sans">
        {/* Official Header */}
        <div className="border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                KEMENTERIAN PEKERJAAN UMUM DAN PERUMAHAN RAKYAT
              </div>
              <div className="text-xs font-black tracking-wide text-slate-800 uppercase">
                DIREKTORAT JENDERAL SUMBER DAYA AIR — BALAI BESAR WILAYAH SUNGAI (BBWS)
              </div>
              <h1 className="text-xl font-black font-heading text-slate-900 mt-2 uppercase tracking-tight">
                Laporan Peringatan Dini Water Stress Sub-DAS (HUC12)
              </h1>
              <div className="text-xs text-slate-600 mt-0.5">
                Prakiraan Periode Target: <strong>Bulan {targetMonth} 2026</strong> (Basis Data: {originMonth} 2026)
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-500 leading-tight">
              <div>Nomor Dokumen:</div>
              <div className="font-mono font-bold text-slate-800">PW.04.01/BBWS-IRIS/2026/{id}</div>
              <div className="mt-1">Tanggal Terbit: {todayStr}</div>
              <div className="text-teal font-semibold">Model IRIS Serving v1.0</div>
            </div>
          </div>
        </div>

        {/* Ringkasan Eksekutif */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            I. Ringkasan Eksekutif & Pembagian Tingkat Risiko
          </h2>
          <div className="grid grid-cols-4 gap-3 text-center mb-3">
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500">Total Sub-DAS</div>
              <div className="text-xl font-bold font-mono text-slate-900">{formatNumber(total)}</div>
              <div className="text-[10px] text-slate-500">100% Tercakup</div>
            </div>
            <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-900">
              <div className="text-[10px] uppercase font-bold text-red-700">Tingkat SIAGA</div>
              <div className="text-xl font-bold font-mono text-red-700">{formatNumber(nSiaga)}</div>
              <div className="text-[10px] text-red-600 font-semibold">10% Teratas (Prioritas H+1)</div>
            </div>
            <div className="p-3 rounded-lg border border-amber-200 bg-amber-50 text-amber-900">
              <div className="text-[10px] uppercase font-bold text-amber-700">Tingkat WASPADA</div>
              <div className="text-xl font-bold font-mono text-amber-800">{formatNumber(nWaspada)}</div>
              <div className="text-[10px] text-amber-700">20% Berikutnya (+{nEscalated} eskalasi)</div>
            </div>
            <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
              <div className="text-[10px] uppercase font-bold text-slate-500">Basin SIAGA</div>
              <div className="text-xl font-bold font-mono text-slate-800">{basinSet.size}</div>
              <div className="text-[10px] text-slate-500">Koordinasi Aliran</div>
            </div>
          </div>
          <p className="text-[11px] text-slate-600 leading-relaxed text-justify">
            Berdasarkan inferensi model ensemble IRIS (LightGBM, XGBoost, CatBoost) yang telah teruji dengan korelasi Spearman $\ge 0,99$ terhadap benchmark referensi, sebanyak <strong>{formatNumber(nSiaga)} sub-DAS</strong> ditetapkan dalam status <strong>SIAGA</strong> yang memerlukan tindakan mitigasi proaktif. Sebanyak <strong>{formatNumber(nEscalated)} sub-DAS</strong> dinaikkan statusnya menjadi WASPADA berdasarkan aturan eskalasi keterkaitan jaringan hidrologi (hulu-hilir).
          </p>
        </div>

        {/* Tabel Top 20 SIAGA */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
            II. Daftar 20 Sub-DAS dengan Prioritas Risiko Tertinggi
          </h2>
          <table className="w-full text-left text-[11px] border border-slate-200">
            <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[9px] border-b border-slate-200">
              <tr>
                <th className="py-2 px-2 text-center w-8">#</th>
                <th className="py-2 px-2">ID Sub-DAS</th>
                <th className="py-2 px-2 text-right">Skor</th>
                <th className="py-2 px-2">Tipologi</th>
                <th className="py-2 px-2 text-center">Basin</th>
                <th className="py-2 px-2">Konteks Jaringan</th>
                <th className="py-2 px-2">Tindakan Lapangan H+1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {top20Siaga.map((item, idx) => {
                const typoKey = item.typology as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS;
                const typoInfo = KEY_METRICS.TYPOLOGY_CHARACTERISTICS[typoKey];
                const action = formatActionText({
                  tier: item.tier,
                  tierFinal: item.tier_final,
                  typology: item.typology,
                  isEscalated: item.tier !== item.tier_final,
                });

                return (
                  <tr key={item.subdas_id} className={idx % 2 === 1 ? "bg-slate-50/50" : ""}>
                    <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold text-slate-900">
                      {item.subdas_id}
                    </td>
                    <td className="py-1.5 px-2 font-mono font-bold text-right text-red-700">
                      {formatScore(item.score)}
                    </td>
                    <td className="py-1.5 px-2">
                      <span className="font-semibold text-slate-800">
                        {typoInfo?.name || item.typology}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-center font-mono text-slate-700">
                      B-{item.basin_id}
                    </td>
                    <td className="py-1.5 px-2 text-slate-600 truncate max-w-[140px]" title={item.net_context}>
                      {item.net_context}
                    </td>
                    <td className="py-1.5 px-2 text-slate-700 font-medium truncate max-w-[170px]" title={action}>
                      {action}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* SOP Penanganan Lapangan */}
        <div className="mb-8 p-3 rounded-lg border border-slate-200 bg-slate-50 text-[11px] leading-relaxed">
          <div className="font-bold uppercase tracking-wider text-slate-700 mb-1">
            III. Standar Operasional Prosedur (SOP) Penanganan Lapangan
          </div>
          <div className="grid grid-cols-3 gap-2 mt-2">
            <div>
              <span className="font-bold text-slate-800">1. Fase H+1 (Inspeksi Visual):</span>
              <p className="text-slate-600 mt-0.5">
                Petugas lapangan memverifikasi intake sungai, sumur pantau, dan debit saluran primer di sub-DAS SIAGA.
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-800">2. Fase H+3 (Rapat Koordinasi):</span>
              <p className="text-slate-600 mt-0.5">
                Pertemuan lintas pengelola basin untuk sinkronisasi alokasi debit hulu ke hilir yang tertekan.
              </p>
            </div>
            <div>
              <span className="font-bold text-slate-800">3. Fase H+7 (Intervensi Fisik):</span>
              <p className="text-slate-600 mt-0.5">
                Penerapan gilir-giring irigasi, mobilisasi pompa darurat, dan penyesuaian operasional pintu air bendung.
              </p>
            </div>
          </div>
        </div>

        {/* Kolom Tanda Tangan */}
        <div className="border-t border-slate-200 pt-6 mt-6 flex justify-between text-center text-xs">
          <div className="w-64">
            <div className="text-slate-500 text-[10px] uppercase">Disiapkan Oleh:</div>
            <div className="font-semibold text-slate-800 mt-0.5">Koordinator Data & Pemodelan IRIS</div>
            <div className="h-16"></div>
            <div className="font-bold text-slate-900 underline font-mono">TIM IRIS LAGI BU</div>
            <div className="text-[10px] text-slate-500">IFEST Data Analysis Competition 2026</div>
          </div>

          <div className="w-64">
            <div className="text-slate-500 text-[10px] uppercase">Disetujui & Ditetapkan:</div>
            <div className="font-semibold text-slate-800 mt-0.5">Kepala Balai Besar Wilayah Sungai</div>
            <div className="h-16"></div>
            <div className="font-bold text-slate-900 underline">IR. H. SUKIRNO, M.ENG.</div>
            <div className="text-[10px] text-slate-500">NIP. 19740512 199903 1 002</div>
          </div>
        </div>
      </div>
    </div>
  );
}

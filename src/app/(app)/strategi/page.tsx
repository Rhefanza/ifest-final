import { getInsightsData } from "@/lib/db/queries";
import fs from "fs";
import path from "path";
import {
  Target,
  ShieldAlert,
  GitFork,
  Droplet,
  Layers,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  Info,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";

export default async function StrategiPage() {
  const insights = await getInsightsData();

  // Read subdas.csv to get the 167 R4 sub-DAS
  const subdasCsvPath = path.join(process.cwd(), "ml", "out", "subdas.csv");
  let r4Subdas: any[] = [];
  if (fs.existsSync(subdasCsvPath)) {
    const lines = fs.readFileSync(subdasCsvPath, "utf-8").split("\n");
    const header = lines[0].split(",").map((h) => h.trim());
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const parts = line.split(",").map((p) => p.trim());
      const obj: any = {};
      header.forEach((h, idx) => {
        obj[h] = parts[idx];
      });
      if (obj.r4_flag === "True" || obj.r4_flag === "true") {
        r4Subdas.push(obj);
      }
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue uppercase tracking-wider mb-1">
          <Target className="w-4 h-4 text-blue" />
          <span>Pengambilan Keputusan Berbasis Bukti (Evidence-Based Policy)</span>
        </div>
        <h1 className="text-2xl font-black font-heading text-navy">
          Rencana Strategis: 5 Rekomendasi (R1–R5) & 4 Pola Empiris (P1–P4)
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Sintesis komprehensif dari analisis 14 tahun data hidrologi (168 bulan amatan) dan inferensi ensemble model IRIS untuk perencanaan alokasi sumber daya air jangka pendek maupun struktural.
        </p>
      </div>

      {/* 4 Pola Empiris (P1 - P4) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            Temuan Kunci Data: 4 Pola Empiris Utama
          </h2>
          <p className="text-xs text-slate-500">
            Bukti statistik mengapa model peringatan dini spasial-temporal sangat dibutuhkan
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* P1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue uppercase tracking-wider text-[11px]">
                P1. Variabilitas Spasial vs Siklus Kalender
              </span>
              <span className="font-mono text-[11px] text-slate-400">Dinamika Iklim</span>
            </div>
            <div className="text-xl font-bold font-heading text-navy">
              Tingkat Kejadian 4% – 42% per Bulan
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-justify">
              Proporsi wilayah yang mengalami water stress sangat dinamis antar bulan (<strong>4% s/d 42%</strong>), sedangkan variasi rata-rata per bulan kalender hanya berkisar <strong>18% – 22%</strong>. Kalender musim statis tidak mampu mendeteksi kekeringan ekstrem; sistem membutuhkan prediksi dinamis per sub-DAS.
            </p>
          </div>

          {/* P2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue uppercase tracking-wider text-[11px]">
                P2. Peran Dominan Fluktuasi Suplai
              </span>
              <span className="font-mono text-[11px] text-slate-400">AUC Sinyal 0,30</span>
            </div>
            <div className="text-xl font-bold font-heading text-navy">
              Suplai Menentukan 300× Lebih Kuat
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-justify">
              Anomali suplai air memiliki pembeda sinyal risiko sangat kuat (<strong>AUC diff 0,30</strong>), sedangkan variabilitas pengambilan air (withdrawal) nyaris konstan (<strong>AUC diff 0,001</strong>). Risiko kekeringan dipicu oleh anjloknya suplai alami terhadap beban kebutuhan eksisting.
            </p>
          </div>

          {/* P3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue uppercase tracking-wider text-[11px]">
                P3. Persistensi & Propagasi Hulu-Hilir
              </span>
              <span className="font-mono text-[11px] text-slate-400">Efek Rantai 84%</span>
            </div>
            <div className="text-xl font-bold font-heading text-navy">
              84% Hilir Stres Terhubung ke Hulu Stres
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-justify">
              Jika sub-DAS hilir mengalami stres, probabilitas hulu terdekatnya juga mengalami stres mencapai <strong>84%</strong> (berbanding hanya <strong>6%</strong> jika hilir dalam kondisi normal). Risiko kekeringan merambat mengikuti arah gravitasi aliran air sungai.
            </p>
          </div>

          {/* P4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-blue uppercase tracking-wider text-[11px]">
                P4. Resiliensi 4 Karakter Tipologi
              </span>
              <span className="font-mono text-[11px] text-slate-400">Silhouette 0,392</span>
            </div>
            <div className="text-xl font-bold font-heading text-navy">
              4 Klaster Struktural Alami (k = 4)
            </div>
            <p className="text-xs text-slate-600 leading-relaxed text-justify">
              Sub-DAS terbagi secara objektif ke dalam 4 tipe: <strong>Rawan Kilat</strong> (hulu curam, onset cepat), <strong>Air Tanah</strong> (resiliensi tinggi tapi durasi lama), <strong>Tertekan Irigasi</strong> (beban pertanian berat), dan <strong>Campuran</strong> (sinkron dengan basin).
            </p>
          </div>
        </div>
      </div>

      {/* 5 Rekomendasi Kebijakan (R1 - R5) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
            5 Rekomendasi Kebijakan Operasional & Struktural
          </h2>
          <p className="text-xs text-slate-500">
            Pedoman aksi bagi Balai Besar Wilayah Sungai (BBWS) dan Kementerian PUPR
          </p>
        </div>

        <div className="space-y-3">
          {/* R1 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue text-white font-mono font-bold text-xs">
                R1
              </span>
              <h3 className="font-heading font-bold text-navy text-base">
                Peringatan Dini H+1 dengan SOP Bertingkat (SIAGA, WASPADA, NORMAL)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Menggantikan respon darurat setelah krisis terjadi. Begitu data akhir bulan ditutup pada tanggal 1, sistem IRIS merilis klasifikasi risiko dalam hitungan detik. <strong>SIAGA (10% teratas)</strong> langsung memicu inspeksi intake pada Pekan 1, <strong>WASPADA (20% berikutnya)</strong> mengaktifkan koordinasi pembagian air, dan <strong>NORMAL (70%)</strong> melanjutkan operasional reguler.
            </p>
          </div>

          {/* R2 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue text-white font-mono font-bold text-xs">
                R2
              </span>
              <h3 className="font-heading font-bold text-navy text-base">
                Pengelolaan Berbasis Kesatuan Basin Aliran Sungai (One River Basin)
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Melarang penanganan terisolasi per batas administrasi desa atau kabupaten. Seluruh sub-DAS diatur dalam 148 kesatuan basin hidrologi. Intervensi di hilir wajib disertai pengaturan debit pelepasan bendung hulu agar tidak terjadi defisit akumulatif berganda.
            </p>
          </div>

          {/* R3 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue text-white font-mono font-bold text-xs">
                R3
              </span>
              <h3 className="font-heading font-bold text-navy text-base">
                Diferensiasi Intervensi Menurut Karakteristik Tipologi
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tindakan tidak disamaratakan: Sub-DAS <strong>Air Tanah (A)</strong> memerlukan rencana kontinjensi multi-bulan karena 43% kekeringan berlangsung $\ge 3$ bulan; sub-DAS <strong>Rawan Kilat (K)</strong> membutuhkan respons fleksibel cepat; sub-DAS <strong>Irigasi (I)</strong> memerlukan kuota musiman dan efisiensi mekanisasi pompa.
            </p>
          </div>

          {/* R4 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue text-white font-mono font-bold text-xs">
                R4
              </span>
              <h3 className="font-heading font-bold text-navy text-base">
                Proteksi Khusus 167 Sub-DAS Tertekan Irigasi Berat
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sebanyak <strong>{r4Subdas.length} sub-DAS</strong> diidentifikasi memiliki ketergantungan ekstrem pada irigasi pertanian (rata-rata pangsa irigasi mencapai <strong>{formatPercent(insights?.R4?.avg_irrigation_share || 0.771)}</strong>). Wilayah-wilayah ini wajib diprioritaskan untuk modernisasi saluran sekunder dan penjadwalan gilir giring air resmi sebelum musim tanam.
            </p>
          </div>

          {/* R5 */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue text-white font-mono font-bold text-xs">
                R5
              </span>
              <h3 className="font-heading font-bold text-navy text-base">
                Mitigasi Titik Buta Model (Blind Spot) pada Tipologi Rawan Kilat di Hulu
              </h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Karakteristik Rawan Kilat di bagian hulu memiliki onset kekeringan mendadak (laju kemunculan 18%/bulan). Jika hanya mengandalkan ambang batas SIAGA, peringatan bisa terlambat. Kebijakan operasional IRIS menetapkan bahwa <strong>level WASPADA pada sub-DAS Rawan Kilat di hulu sudah memicu tindakan verifikasi awal</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* Tabel 167 Sub-DAS R4 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-navy text-base">
              Daftar {r4Subdas.length} Sub-DAS Tertekan Irigasi Berat (Kebijakan R4)
            </h3>
            <p className="text-xs text-slate-500">
              Wilayah dengan rasio kebutuhan irigasi tinggi (&gt;60% total demand air)
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
            Rerata Irigasi: 77,1%
          </span>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider sticky top-0 border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Sub-DAS ID</th>
                <th className="py-2.5 px-4">Basin</th>
                <th className="py-2.5 px-4">Tipologi</th>
                <th className="py-2.5 px-4 text-right">Porsi Irigasi</th>
                <th className="py-2.5 px-4 text-right">BFI</th>
                <th className="py-2.5 px-4 text-right">Luas DAS (km²)</th>
                <th className="py-2.5 px-4 text-right">Detail</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {r4Subdas.map((sub, idx) => (
                <tr key={sub.id} className="hover:bg-slate-50/60 transition">
                  <td className="py-2 px-4 text-center font-mono text-slate-400 font-bold">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-4 font-mono font-bold text-navy">
                    {sub.id}
                  </td>
                  <td className="py-2 px-4">
                    <Link
                      href={`/basin/${sub.basin}`}
                      className="text-blue hover:underline font-medium"
                    >
                      Basin {sub.basin}
                    </Link>
                  </td>
                  <td className="py-2 px-4 font-semibold text-slate-700">
                    {KEY_METRICS.TYPOLOGY_CHARACTERISTICS[sub.typology as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS]?.name || sub.typology}
                  </td>
                  <td className="py-2 px-4 font-mono font-bold text-right text-amber-700">
                    {sub.ir_share ? `${(parseFloat(sub.ir_share) * 100).toFixed(1)}%` : "-"}
                  </td>
                  <td className="py-2 px-4 font-mono text-right text-slate-600">
                    {sub.bfi ? parseFloat(sub.bfi).toFixed(2) : "-"}
                  </td>
                  <td className="py-2 px-4 font-mono text-right text-slate-600">
                    {sub.inc_aream2 ? (parseFloat(sub.inc_aream2) / 1e6).toFixed(1) : "-"}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Link
                      href={`/sub-das/${sub.id}`}
                      className="inline-flex items-center gap-1 text-blue font-semibold hover:text-blue-700"
                    >
                      <span>Lihat</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

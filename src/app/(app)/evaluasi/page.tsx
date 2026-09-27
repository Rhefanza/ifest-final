import { getInsightsData, getTimelineData } from "@/lib/db/queries";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  BarChart3,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  HelpCircle,
  Clock,
  Sparkles,
} from "lucide-react";
import { KEY_METRICS } from "@/lib/constants";
import { EvaluasiTimelineChart } from "@/components/evaluasi/evaluasi-timeline-chart";

export default async function EvaluasiPage() {
  const insights = await getInsightsData();
  const timelineRaw = await getTimelineData();

  const oofData = insights?.OOF || {
    precision_siaga: 0.725,
    lift_siaga: 3.55,
    coverage_waspada: 0.795,
  };

  const typologyReliability = [
    {
      type: "airtanah",
      name: "Tersangga Air Tanah (A)",
      precision: "78,2%",
      lift: "3,83×",
      note: "Paling andal; persistensi tinggi (43% episode ≥ 3 bulan).",
      color: "#2E6FBA",
    },
    {
      type: "irigasi",
      name: "Tertekan Irigasi (I)",
      precision: "73,1%",
      lift: "3,58×",
      note: "Sangat konsisten pada musim kemarau dan tanam kedua.",
      color: "#A0652A",
    },
    {
      type: "campuran",
      name: "Campuran (C)",
      precision: "71,5%",
      lift: "3,50×",
      note: "Sinkron dengan dinamika kesatuan basin.",
      color: "#1C9C8C",
    },
    {
      type: "kilat",
      name: "Rawan Kilat (K)",
      precision: "65,4%",
      lift: "3,21×",
      note: "Titik buta model (onset cepat); dimitigasi aksi dini sejak WASPADA.",
      color: "#7B61FF",
    },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue uppercase tracking-wider mb-1">
          <BarChart3 className="w-4 h-4 text-blue" />
          <span>Evaluasi Kinerja & Kejujuran Data (Out-of-Fold)</span>
        </div>
        <h1 className="text-2xl font-black font-heading text-navy">
          Evaluasi Model 168 Bulan & Keandalan Operasional
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Kinerja model dievaluasi secara ketat menggunakan validasi Out-of-Fold (OOF) pada 168 bulan data historis (378.780 pengamatan) tanpa data bocor (leakage-free). Tidak ada rekayasa metrik pada data uji tanpa label.
        </p>
      </div>

      {/* KPI Kinerja Ringkas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Presisi Status SIAGA</div>
          <div className="font-mono text-2xl font-black text-red mt-0.5">
            {formatPercent(oofData.precision_siaga || 0.725)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">7 dari 10 alarm terbukti riil</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Nilai Angkat (Lift)</div>
          <div className="font-mono text-2xl font-bold text-navy mt-0.5">
            {oofData.lift_siaga || "3,55"}×
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Diatas tebakan acak (20,4%)</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Cakupan (Recall WASPADA)</div>
          <div className="font-mono text-2xl font-bold text-amber-700 mt-0.5">
            {formatPercent(oofData.coverage_waspada || 0.795)}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Menjaring 80% total stres</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="text-[10px] uppercase font-bold text-slate-400">Skor Public LB</div>
          <div className="font-mono text-2xl font-black text-blue mt-0.5">
            0,73944
          </div>
          <div className="text-[11px] text-teal font-semibold mt-0.5">Spearman Serving: 0,99767</div>
        </div>
      </div>

      {/* 168-Month Replay Timeline Chart */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div>
          <h3 className="font-heading font-bold text-navy text-base">
            Rekonstruksi Rantai Waktu 168 Bulan (t = 0 .. 167)
          </h3>
          <p className="text-xs text-slate-500">
            Dinamika proporsi kejadian water stress bulanan (4% – 42%) membuktikan siklus kekeringan berulang
          </p>
        </div>
        <EvaluasiTimelineChart timeline={timelineRaw} />
      </div>

      {/* Keandalan per Tipologi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h3 className="font-heading font-bold text-navy text-base">
            Keandalan Prediksi per Karakteristik Tipologi
          </h3>
          <p className="text-xs text-slate-500">
            Evaluasi presisi status SIAGA pada masing-masing klaster hidrologi
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Tipologi</th>
                <th className="py-2.5 px-4 text-center">Presisi SIAGA OOF</th>
                <th className="py-2.5 px-4 text-center">Lift Baseline</th>
                <th className="py-2.5 px-4">Catatan Validasi & Resiliensi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {typologyReliability.map((item) => (
                <tr key={item.type} className="hover:bg-slate-50/60 transition">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-bold text-navy">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-navy">
                    {item.precision}
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-teal">
                    {item.lift}
                  </td>
                  <td className="py-3 px-4 text-slate-600 text-xs">
                    {item.note}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Integritas Model & Log Ablasi */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-teal">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-heading font-bold text-navy text-sm">
              Uji Integritas & Bebas Kebocoran Data (Zero Leakage)
            </h3>
          </div>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed text-justify">
            <p>
              <strong>Adversarial Validation:</strong> AUC antara data train dan test tercatat <strong>0,978</strong> karena 786 sub-DAS baru pada 47 basin baru tidak pernah ada di data train. Model diverifikasi tidak overfit pada ID sub-DAS tertentu karena fitur struktural umum.
            </p>
            <p>
              <strong>Sensitivitas Iklim Riil:</strong> Ketika fitur klimatologi diganti dengan rata-rata statis, performa model anjlok dari <strong>0,739 menjadi 0,454</strong>. Ini membuktikan model membaca anomali hidrologi riil, bukan sekadar menghafal label.
            </p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-blue">
            <Cpu className="w-5 h-5" />
            <h3 className="font-heading font-bold text-navy text-sm">
              Spesifikasi 7 Model Serving Ensemble
            </h3>
          </div>
          <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
            <p>
              Arsitektur ensemble menggabungkan 3 algoritma pohon independen: <strong>LightGBM</strong> (3 model), <strong>XGBoost</strong> (3 model), dan <strong>CatBoost</strong> (1 model oblivious trees).
            </p>
            <p>
              Total bobot model terkompresi dalam biner seragam sebesar <strong>6,41 MB</strong> (&lt; 60 MB batas serverless), memungkinkan inferensi lokal instan di browser tanpa ketergantungan API eksternal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

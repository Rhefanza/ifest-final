"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
} from "recharts";
import { formatScore } from "@/lib/format";
import { Info } from "lucide-react";

interface ShapItem {
  feature: string;
  value: number;
  contrib: number;
}

interface ShapProps {
  shapTop?: ShapItem[];
}

const FEATURE_LABELS: Record<string, { label: string; desc: string }> = {
  ws_clim_ratio: {
    label: "Rasio Suplai vs Normal",
    desc: "Perbandingan suplai air bulan ini terhadap median normal historis.",
  },
  ws_climnext_ratio: {
    label: "Rasio Suplai vs Normal Bulan Depan",
    desc: "Suplai air dibandingkan dengan kebutuhan normal bulan target.",
  },
  ws_vs_climnext: {
    label: "Defisit Terhadap Normal Bulan Depan",
    desc: "Selisih volume suplai air terhadap normal bulan depan (m³).",
  },
  ws_z_last: {
    label: "Z-score Deviasi Suplai",
    desc: "Tingkat keparahan anomali suplai air dalam skala standar deviasi.",
  },
  ws_decl_streak: {
    label: "Durasi Penurunan Berturut-turut",
    desc: "Berapa bulan berturut-turut suplai air terus mengalami penurunan.",
  },
  ws_drawdown: {
    label: "Akumulasi Penurunan Suplai (Drawdown)",
    desc: "Besaran penurunan kumulatif debit air dari puncak musim basah.",
  },
  deficit_last: {
    label: "Defisit Neraca Air Terakhir",
    desc: "Volume kekurangan air antara ketersediaan dan kebutuhan.",
  },
  ir_share: {
    label: "Beban Pengambilan Irigasi",
    desc: "Persentase kebutuhan air yang dialokasikan untuk sektor pertanian irigasi.",
  },
  use_ratio_last: {
    label: "Rasio Utilisasi Air",
    desc: "Tingkat pemanfaatan air terhadap total ketersediaan air setempat.",
  },
  qf_recent3: {
    label: "Limpasan Cepat 3 Bulan Terakhir",
    desc: "Indikator kontribusi hujan langsung dan respons hidrologi cepat.",
  },
  ws_pct_last: {
    label: "Persentil Suplai Air",
    desc: "Posisi ketersediaan air saat ini dalam distribusi 14 tahun terakhir.",
  },
  bfi: {
    label: "Baseflow Index (BFI)",
    desc: "Karakter penyangga air tanah alami sub-DAS.",
  },
  amp: {
    label: "Amplitudo Variabilitas Debit",
    desc: "Rasio fluktuasi musiman debit air antara musim basah dan kering.",
  },
};

export function ShapBarChart({ shapTop }: ShapProps) {
  if (!shapTop || shapTop.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400 text-xs h-64">
        Faktor kontributor risiko (TreeSHAP) tidak tersedia untuk sub-DAS ini.
      </div>
    );
  }

  // Format data for chart
  const data = shapTop.map((item) => {
    const info = FEATURE_LABELS[item.feature] || {
      label: item.feature,
      desc: `Fitur hidrologi: ${item.feature}`,
    };
    return {
      feature: item.feature,
      name: info.label,
      desc: info.desc,
      value: item.value,
      contrib: Number(item.contrib.toFixed(3)),
    };
  });

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="font-heading font-bold text-navy text-sm">
            Faktor Pendorong Risiko (TreeSHAP Top 5)
          </h3>
          <span
            className="text-slate-400 hover:text-slate-600 cursor-help"
            title="TreeSHAP menghitung kontribusi marginal tiap variabel hidrologi terhadap peningkatan (merah) atau penurunan (hijau) risiko water stress."
          >
            <Info className="w-4 h-4" />
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400">LightGBM SHAP Engine</span>
      </div>

      <p className="text-xs text-slate-500 mb-4 leading-relaxed">
        Batang <strong className="text-red">merah (+)</strong> mendorong status ke arah SIAGA, sedangkan batang <strong className="text-teal">hijau (-)</strong> meredakan risiko.
      </p>

      <div className="space-y-3">
        {data.map((item) => {
          const isRisk = item.contrib > 0;
          return (
            <div
              key={item.feature}
              className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60"
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div>
                  <span className="font-semibold text-navy">{item.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono ml-2">
                    (nilai amatan: {item.value})
                  </span>
                </div>
                <div
                  className={`font-mono font-bold ${
                    isRisk ? "text-red" : "text-teal"
                  }`}
                >
                  {isRisk ? `+${item.contrib}` : item.contrib}
                </div>
              </div>

              {/* Progress bar visualizer */}
              <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden flex">
                {isRisk ? (
                  <div
                    className="bg-red h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.abs(item.contrib) * 50, 100)}%` }}
                  />
                ) : (
                  <div
                    className="bg-teal h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(Math.abs(item.contrib) * 50, 100)}%` }}
                  />
                )}
              </div>

              <div className="text-[11px] text-slate-500 mt-1.5 leading-tight">
                {item.desc}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

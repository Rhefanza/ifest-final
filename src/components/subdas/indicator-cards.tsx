import { formatNumber, formatPercent } from "@/lib/format";
import { AlertTriangle, Droplet, ArrowDownRight, Flame, Gauge } from "lucide-react";

interface IndicatorsProps {
  indicators?: Record<string, { val: number; pct: number }>;
}

export function IndicatorCards({ indicators }: IndicatorsProps) {
  if (!indicators) return null;

  const items = [
    {
      key: "ws_climnext_ratio",
      title: "Suplai vs Normal Bln Depan",
      val: indicators.ws_climnext_ratio?.val !== undefined ? `${(indicators.ws_climnext_ratio.val * 100).toFixed(0)}%` : "-",
      pct: indicators.ws_climnext_ratio?.pct ?? 50,
      dangerLow: true, // lower ratio is worse
      icon: Droplet,
      desc: "Perbandingan suplai air bulan target thd median klimatologi.",
    },
    {
      key: "supply_clim_ratio",
      title: "Suplai vs Normal Saat Ini",
      val: indicators.supply_clim_ratio?.val !== undefined ? `${(indicators.supply_clim_ratio.val * 100).toFixed(0)}%` : "-",
      pct: indicators.supply_clim_ratio?.pct ?? 50,
      dangerLow: true,
      icon: Gauge,
      desc: "Kondisi air eksisting dibandingkan normal historis.",
    },
    {
      key: "ws_decl_streak",
      title: "Penurunan Berturut-turut",
      val: indicators.ws_decl_streak?.val !== undefined ? `${indicators.ws_decl_streak.val} bulan` : "-",
      pct: indicators.ws_decl_streak?.pct ?? 50,
      dangerLow: false, // higher is worse
      icon: ArrowDownRight,
      desc: "Bulan berturut-turut debit terus menyusut.",
    },
    {
      key: "ir_share",
      title: "Beban Kebutuhan Irigasi",
      val: indicators.ir_share?.val !== undefined ? `${(indicators.ir_share.val * 100).toFixed(1)}%` : "-",
      pct: indicators.ir_share?.pct ?? 50,
      dangerLow: false,
      icon: Flame,
      desc: "Persentase kebutuhan air untuk sektor pertanian irigasi.",
    },
  ];

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="mb-4">
        <h3 className="font-heading font-bold text-navy text-sm">
          Indikator Tekanan Hidrologi & Posisi Relatif
        </h3>
        <p className="text-xs text-slate-500">
          Persentil menunjukkan posisi sub-DAS ini dibandingkan 2.982 wilayah se-Indonesia pada bulan yang sama
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          // Determine risk level based on percentile
          const isHighRisk = item.dangerLow ? item.pct < 20 : item.pct > 80;
          const isMediumRisk = item.dangerLow ? item.pct < 40 : item.pct > 60;

          const badgeColor = isHighRisk
            ? "bg-red-50 text-red border-red-200"
            : isMediumRisk
            ? "bg-amber-50 text-amber-700 border-amber-200"
            : "bg-slate-50 text-slate-600 border-slate-200";

          return (
            <div
              key={item.key}
              className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-2">
                  <span className="text-[11px] font-semibold text-slate-600 truncate">
                    {item.title}
                  </span>
                  <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                </div>

                <div className="text-xl font-bold font-mono text-navy">{item.val}</div>
                <div className="text-[11px] text-slate-500 mt-1 leading-tight">
                  {item.desc}
                </div>
              </div>

              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase font-semibold">
                  Persentil
                </span>
                <span
                  className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}
                >
                  P{item.pct.toFixed(0)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

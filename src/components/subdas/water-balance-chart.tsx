"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import { formatNumber } from "@/lib/format";

interface SeriesProps {
  series: {
    ws?: number[];
    bf?: number[];
    qf?: number[];
    ir?: number[];
    th?: number[];
    ps?: number[];
    clim_now?: number;
    clim_next?: number;
  };
}

export function WaterBalanceChart({ series }: SeriesProps) {
  if (!series || !series.ws || series.ws.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-center text-slate-400 text-xs h-64">
        Data deret waktu 12-bulan tidak tersedia untuk sub-DAS ini.
      </div>
    );
  }

  // Build chart points from lag 11 (oldest) to lag 0 (current)
  const chartData = [];
  for (let lag = 11; lag >= 0; lag--) {
    const wsVal = series.ws[lag] || 0;
    const bfVal = series.bf?.[lag] || 0;
    const qfVal = series.qf?.[lag] || 0;
    const irVal = series.ir?.[lag] || 0;
    const label = lag === 0 ? "Bulan Ini (t)" : `t-${lag}`;

    chartData.push({
      label,
      ws: Math.round(wsVal),
      bf: Math.round(bfVal),
      qf: Math.round(qfVal),
      ir: Math.round(irVal),
      clim: lag === 0 ? Math.round(series.clim_now || 0) : undefined,
    });
  }

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-heading font-bold text-navy text-sm">
            Dinamika Neraca Air 12 Bulan Terakhir
          </h3>
          <p className="text-xs text-slate-500">
            Dekomposisi suplai air: aliran dasar (baseflow) vs limpasan cepat (quickflow) dalam m³
          </p>
        </div>

        {series.clim_now !== undefined && (
          <div className="text-right shrink-0">
            <span className="text-[11px] text-slate-400">Normal Klimatologi: </span>
            <span className="font-mono font-bold text-xs text-navy">
              {formatNumber(Math.round(series.clim_now))} m³
            </span>
          </div>
        )}
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <XAxis
              dataKey="label"
              stroke="#8A94A6"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#8A94A6"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => (v >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : v >= 1e3 ? `${(v / 1e3).toFixed(0)}k` : v)}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
              formatter={(value: any, name: any) => {
                const n = Number(value) || 0;
                let lbl = name;
                if (name === "bf") lbl = "Aliran Dasar (Baseflow)";
                if (name === "qf") lbl = "Limpasan Cepat (Quickflow)";
                if (name === "ws") lbl = "Total Suplai (Water Supply)";
                if (name === "ir") lbl = "Pengambilan Irigasi";
                return [`${formatNumber(n)} m³`, lbl];
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(value) => {
                if (value === "bf") return "Baseflow (Air Tanah)";
                if (value === "qf") return "Quickflow (Hujan Langsung)";
                if (value === "ws") return "Total Suplai Air";
                return value;
              }}
            />
            <Bar dataKey="bf" name="bf" stackId="a" fill="#2E6FBA" radius={[0, 0, 0, 0]} />
            <Bar dataKey="qf" name="qf" stackId="a" fill="#7B61FF" radius={[3, 3, 0, 0]} />
            <Line
              type="monotone"
              dataKey="ws"
              name="ws"
              stroke="#1C9C8C"
              strokeWidth={2.5}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

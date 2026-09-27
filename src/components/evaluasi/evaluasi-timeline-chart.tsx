"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { formatPercent } from "@/lib/format";

export function EvaluasiTimelineChart({ timeline }: { timeline: any[] }) {
  if (!timeline || timeline.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 text-xs">
        Data timeline 168 bulan sedang dimuat...
      </div>
    );
  }

  // Sample or plot points: timeline has 168 rows: { t, origin_id, month, label_rate }
  const data = timeline.map((item) => ({
    t: Number(item.t),
    month: Number(item.month),
    rate: Number((parseFloat(item.label_rate) * 100).toFixed(1)),
    label: `t=${item.t} (Bln ${item.month})`,
  }));

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <XAxis
            dataKey="t"
            stroke="#8A94A6"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(t) => (t % 24 === 0 ? `t=${t}` : "")}
          />
          <YAxis
            stroke="#8A94A6"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#fff",
              borderRadius: "8px",
              border: "1px solid #E2E8F0",
              fontSize: "12px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
            formatter={(value: any) => [`${value}%`, "Kejadian Stres"]}
            labelFormatter={(label: any) => `Bulan Indeks ${label}`}
          />
          <ReferenceLine
            y={20.4}
            stroke="#8A94A6"
            strokeDasharray="3 3"
            label={{
              value: "Baseline Rata-rata (20,4%)",
              position: "insideTopRight",
              fill: "#8A94A6",
              fontSize: 10,
            }}
          />
          <Line
            type="monotone"
            dataKey="rate"
            stroke="#2E6FBA"
            strokeWidth={1.8}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

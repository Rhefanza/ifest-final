"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface CompositionProps {
  data: {
    typology: string;
    label: string;
    siaga: number;
    waspada: number;
    normal: number;
    total: number;
  }[];
}

export function CompositionChart({ data }: CompositionProps) {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
      <div className="mb-3">
        <h3 className="font-heading font-bold text-navy text-sm">
          Komposisi Tingkat Risiko per Tipologi Sub-DAS
        </h3>
        <p className="text-xs text-slate-500">
          Distribusi status SIAGA (merah) dan WASPADA (kuning) di tiap karakter hidrologi
        </p>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
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
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                borderRadius: "8px",
                border: "1px solid #E2E8F0",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
              formatter={(value) => {
                if (value === "siaga") return "SIAGA (10%)";
                if (value === "waspada") return "WASPADA (20%)";
                return "NORMAL (70%)";
              }}
            />
            <Bar dataKey="siaga" name="siaga" stackId="a" fill="#C8453B" radius={[0, 0, 0, 0]} />
            <Bar dataKey="waspada" name="waspada" stackId="a" fill="#E8A33D" radius={[0, 0, 0, 0]} />
            <Bar dataKey="normal" name="normal" stackId="a" fill="#8A94A6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

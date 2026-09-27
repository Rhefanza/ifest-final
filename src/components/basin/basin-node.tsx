"use client";

import { Handle, Position } from "@xyflow/react";
import { formatScore, truncateId } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";
import { TrendingUp, Waves, ExternalLink } from "lucide-react";
import Link from "next/link";

export function BasinNode({ data }: { data: any }) {
  const effTier = data.tier_final || data.tier || "NORMAL";
  const isEscalated = data.is_escalated;
  const isOutlet = data.is_outlet;
  const typoInfo =
    KEY_METRICS.TYPOLOGY_CHARACTERISTICS[
      data.typology as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS
    ];

  // Card border & background based on tier
  const tierStyle =
    effTier === "SIAGA"
      ? "bg-red-50/95 border-red text-red-900 shadow-sm shadow-red-100"
      : effTier === "WASPADA"
      ? "bg-amber-50/95 border-amber-400 text-amber-900 shadow-sm shadow-amber-100"
      : "bg-white border-slate-300 text-slate-800 shadow-xs";

  const borderClass = isEscalated ? "border-dashed border-2" : "border";

  return (
    <div
      className={`px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer min-w-[140px] max-w-[170px] ${tierStyle} ${borderClass} hover:ring-2 hover:ring-blue/50`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="w-2.5 h-2.5 bg-blue border-2 border-white rounded-full"
      />

      <div className="flex items-center justify-between gap-1 mb-1">
        <span
          className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center shrink-0 shadow-2xs"
          style={{ backgroundColor: typoInfo?.color || "#1C9C8C" }}
          title={typoInfo?.name}
        >
          {typoInfo?.code || "C"}
        </span>

        <span
          className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
            effTier === "SIAGA"
              ? "bg-red text-white"
              : effTier === "WASPADA"
              ? "bg-amber-500 text-white"
              : "bg-slate-200 text-slate-700"
          }`}
        >
          {effTier}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1">
        <span className="font-mono font-bold text-xs truncate">
          {truncateId(data.id)}
        </span>
        <span className="font-mono text-[11px] font-semibold opacity-80">
          {data.score !== undefined ? formatScore(data.score) : "-"}
        </span>
      </div>

      <div className="flex items-center justify-between gap-1 mt-1 text-[9px] text-slate-500">
        {isOutlet ? (
          <span className="flex items-center gap-0.5 text-teal font-bold">
            <Waves className="w-3 h-3" /> Muara (Outlet)
          </span>
        ) : isEscalated ? (
          <span className="flex items-center gap-0.5 text-amber-700 font-bold">
            <TrendingUp className="w-3 h-3" /> Eskalasi
          </span>
        ) : (
          <span>#{data.rank ? `Rank ${data.rank}` : "Sub-DAS"}</span>
        )}

        <span className="text-blue font-semibold flex items-center gap-0.5 hover:underline">
          Detail <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-2.5 h-2.5 bg-teal border-2 border-white rounded-full"
      />
    </div>
  );
}

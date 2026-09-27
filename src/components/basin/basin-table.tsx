"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  GitFork,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Filter,
  ShieldCheck,
} from "lucide-react";
import { formatNumber, formatPercent } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";

interface BasinItem {
  basin_id: number;
  n_siaga: number;
  n_waspada: number;
  n_normal: number;
  n_subdas: number;
  pct_siaga: number;
  dominant_typo: string;
  is_new: boolean;
  has_plan: boolean;
  plan_note: string | null;
}

export function BasinTable({
  initialData,
  runId,
}: {
  initialData: BasinItem[];
  runId: number;
}) {
  const [search, setSearch] = useState("");
  const [onlySiaga, setOnlySiaga] = useState(false);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyPlanned, setOnlyPlanned] = useState(false);

  const filtered = initialData.filter((b) => {
    if (search) {
      if (!b.basin_id.toString().includes(search)) return false;
    }
    if (onlySiaga && b.n_siaga === 0) return false;
    if (onlyNew && !b.is_new) return false;
    if (onlyPlanned && !b.has_plan) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-navy text-base">
            Daftar 148 Kesatuan Hidrologi Basin
          </h3>
          <p className="text-xs text-slate-500">
            Menampilkan {filtered.length} kesatuan aliran DAS
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID Basin..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-navy placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </div>

          <button
            onClick={() => setOnlySiaga(!onlySiaga)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              onlySiaga
                ? "bg-red-50 text-red border-red-300 font-semibold"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Ada SIAGA
          </button>

          <button
            onClick={() => setOnlyNew(!onlyNew)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              onlyNew
                ? "bg-purple-50 text-purple-700 border-purple-300 font-semibold"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Basin Baru (Test)
          </button>

          <button
            onClick={() => setOnlyPlanned(!onlyPlanned)}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              onlyPlanned
                ? "bg-teal/10 text-teal border-teal/30 font-semibold"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Rencana Tersusun
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 w-28">Basin</th>
              <th className="py-2.5 px-4 text-center">Sub-DAS</th>
              <th className="py-2.5 px-4">Tingkat Risiko SIAGA</th>
              <th className="py-2.5 px-4 text-center">WASPADA</th>
              <th className="py-2.5 px-4">Tipologi Dominan</th>
              <th className="py-2.5 px-4 text-center">Status Rencana</th>
              <th className="py-2.5 px-4 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada basin yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              filtered.map((b) => {
                const typoInfo =
                  KEY_METRICS.TYPOLOGY_CHARACTERISTICS[
                    b.dominant_typo as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS
                  ];

                return (
                  <tr key={b.basin_id} className="hover:bg-slate-50/60 transition">
                    {/* Basin ID */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <Link
                          href={`/basin/${b.basin_id}?run=${runId}`}
                          className="font-mono font-bold text-navy hover:text-blue"
                        >
                          Basin {b.basin_id}
                        </Link>
                        {b.basin_id === 40 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-blue-50 text-blue border border-blue-200">
                            Slide 11
                          </span>
                        )}
                        {b.is_new && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200"
                            title="Basin baru pada data test"
                          >
                            Baru
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Subdas Count */}
                    <td className="py-3 px-4 text-center font-mono font-semibold text-slate-700">
                      {b.n_subdas}
                    </td>

                    {/* SIAGA Bar */}
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-bold text-red">
                            {b.n_siaga} SIAGA
                          </span>
                          <span className="font-mono text-slate-400">
                            {formatPercent(b.pct_siaga)}
                          </span>
                        </div>
                        <div className="w-36 bg-slate-100 h-1.5 rounded-full overflow-hidden flex">
                          <div
                            className="bg-red h-full rounded-full"
                            style={{ width: `${Math.min(b.pct_siaga * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* WASPADA */}
                    <td className="py-3 px-4 text-center font-mono font-semibold text-amber-700">
                      {b.n_waspada}
                    </td>

                    {/* Dominant Typology */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-4 h-4 rounded text-[9px] font-bold text-white flex items-center justify-center shrink-0"
                          style={{ backgroundColor: typoInfo?.color || "#1C9C8C" }}
                        >
                          {typoInfo?.code || "C"}
                        </span>
                        <span className="text-slate-700 truncate max-w-[120px]">
                          {typoInfo?.name || b.dominant_typo}
                        </span>
                      </div>
                    </td>

                    {/* Plan Status */}
                    <td className="py-3 px-4 text-center">
                      {b.has_plan ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Tersusun
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">Belum Ada</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/basin/${b.basin_id}?run=${runId}`}
                        className="inline-flex items-center gap-1 text-blue font-semibold hover:text-blue-700"
                      >
                        <span>Buka Graf</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

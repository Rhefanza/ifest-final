"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  ArrowUpDown,
  Copy,
  Check,
  TrendingUp,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Info,
} from "lucide-react";
import { formatNumber, formatScore, truncateId } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";
import { formatActionText } from "@/lib/rules";

interface PredictionItem {
  subdas_id: string;
  basin_id: number;
  score: number;
  rank: number;
  pct: number;
  tier: "SIAGA" | "WASPADA" | "NORMAL";
  tier_final: "SIAGA" | "WASPADA" | "NORMAL";
  escalated_reason: string | null;
  typology: "kilat" | "airtanah" | "irigasi" | "campuran";
  is_new: boolean;
  net_context: string;
  indicators?: any;
}

interface TableProps {
  initialData: PredictionItem[];
  totalCount: number;
  runId: number;
}

export function PredictionTable({ initialData, totalCount, runId }: TableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [typologyFilter, setTypologyFilter] = useState("ALL");
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlyEscalated, setOnlyEscalated] = useState(false);
  const [sortOrder, setSortOrder] = useState<"rank_asc" | "score_desc" | "score_asc">("rank_asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const pageSize = 50;

  // Filter & Search
  let filtered = initialData.filter((item) => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      if (!item.subdas_id.toLowerCase().includes(q)) return false;
    }
    if (tierFilter !== "ALL") {
      const effTier = item.tier_final || item.tier;
      if (effTier !== tierFilter) return false;
    }
    if (typologyFilter !== "ALL") {
      if (item.typology !== typologyFilter) return false;
    }
    if (onlyNew && !item.is_new) return false;
    if (onlyEscalated && item.tier === item.tier_final) return false;
    return true;
  });

  // Sort
  if (sortOrder === "rank_asc") {
    filtered.sort((a, b) => a.rank - b.rank);
  } else if (sortOrder === "score_desc") {
    filtered.sort((a, b) => b.score - a.score);
  } else if (sortOrder === "score_asc") {
    filtered.sort((a, b) => a.score - b.score);
  }

  const totalFiltered = filtered.length;
  const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-slate-100 flex flex-col lg:flex-row gap-3 items-start lg:items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-navy text-base">
              Daftar Prioritas Risiko 2.982 Sub-DAS
            </h3>
            <span
              className="text-slate-400 hover:text-slate-600 cursor-help"
              title="SIAGA = 10% teratas (skor relatif tertinggi), WASPADA = 20% berikutnya dalam bulan ini. Skor adalah peringkat relatif, bukan peluang."
            >
              <Info className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Menampilkan {totalFiltered} wilayah tersaring
          </p>
        </div>

        {/* Filter controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID sub-DAS..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue text-navy placeholder:text-slate-400"
            />
          </div>

          {/* Tier filter */}
          <select
            value={tierFilter}
            onChange={(e) => {
              setTierFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-navy font-medium focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="SIAGA">SIAGA</option>
            <option value="WASPADA">WASPADA</option>
            <option value="NORMAL">NORMAL</option>
          </select>

          {/* Typology filter */}
          <select
            value={typologyFilter}
            onChange={(e) => {
              setTypologyFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-navy font-medium focus:outline-none"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="kilat">Rawan Kilat (K)</option>
            <option value="airtanah">Air Tanah (A)</option>
            <option value="irigasi">Tertekan Irigasi (I)</option>
            <option value="campuran">Campuran (C)</option>
          </select>

          {/* Quick toggle chips */}
          <button
            onClick={() => {
              setOnlyNew(!onlyNew);
              setCurrentPage(1);
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              onlyNew
                ? "bg-purple-50 text-purple-700 border-purple-300 font-semibold"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Wilayah Baru
          </button>

          <button
            onClick={() => {
              setOnlyEscalated(!onlyEscalated);
              setCurrentPage(1);
            }}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-medium transition ${
              onlyEscalated
                ? "bg-amber-50 text-amber-700 border-amber-300 font-semibold"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            Eskalasi Tetangga
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50/80 text-slate-500 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-3 w-14 text-center">#</th>
              <th className="py-2.5 px-3">Sub-DAS</th>
              <th className="py-2.5 px-3">Skor Risiko</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Tipologi</th>
              <th className="py-2.5 px-3">Basin</th>
              <th className="py-2.5 px-3">Konteks Jaringan</th>
              <th className="py-2.5 px-3">Aksi Disarankan</th>
              <th className="py-2.5 px-3 text-right">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-400">
                  Tidak ada sub-DAS yang cocok dengan filter.
                </td>
              </tr>
            ) : (
              paginated.map((item) => {
                const effTier = item.tier_final || item.tier;
                const isEscalated = item.tier !== item.tier_final;
                const typoInfo = KEY_METRICS.TYPOLOGY_CHARACTERISTICS[item.typology];
                const actionText = formatActionText({
                  tier: item.tier,
                  tierFinal: item.tier_final,
                  typology: item.typology,
                  isEscalated,
                });

                return (
                  <tr key={item.subdas_id} className="hover:bg-slate-50/60 transition">
                    {/* Rank */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-slate-500 text-center">
                      {item.rank}
                    </td>

                    {/* Sub-DAS ID */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono font-bold text-navy hover:text-blue cursor-pointer"
                          title={item.subdas_id}
                          onClick={() => handleCopy(item.subdas_id)}
                        >
                          {truncateId(item.subdas_id)}
                        </span>
                        <button
                          onClick={() => handleCopy(item.subdas_id)}
                          className="text-slate-300 hover:text-slate-500"
                          title="Salin ID lengkap"
                        >
                          {copiedId === item.subdas_id ? (
                            <Check className="w-3 h-3 text-teal" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                        {item.is_new && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-50 text-purple-700 border border-purple-200"
                            title="Sub-DAS baru di bulan test, tidak pernah ada di data latih"
                          >
                            Baru
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Risk Score */}
                    <td className="py-2.5 px-3 font-mono font-semibold text-navy">
                      {formatScore(item.score)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          effTier === "SIAGA"
                            ? "bg-red-50 text-red border border-red-200"
                            : effTier === "WASPADA"
                            ? "bg-amber-50 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {effTier}
                        {isEscalated && (
                          <span title={item.escalated_reason || "Dinaikkan dari NORMAL karena bertetangga langsung dengan SIAGA"}>
                            <TrendingUp className="w-3 h-3 text-amber-600" />
                          </span>
                        )}
                      </span>
                    </td>

                    {/* Typology */}
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5" title={typoInfo?.description}>
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] text-white shrink-0"
                          style={{ backgroundColor: typoInfo?.color || "#1C9C8C" }}
                        >
                          {typoInfo?.code || "C"}
                        </span>
                        <span className="text-slate-700 text-xs truncate max-w-[110px]">
                          {typoInfo?.name}
                        </span>
                      </div>
                    </td>

                    {/* Basin */}
                    <td className="py-2.5 px-3">
                      <Link
                        href={`/basin/${item.basin_id}?run=${runId}`}
                        className="font-medium text-blue hover:underline"
                        title="Lihat graf aliran basin ini"
                      >
                        Basin {item.basin_id}
                      </Link>
                    </td>

                    {/* Network Context */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-[180px] truncate" title={item.net_context}>
                      {item.net_context}
                    </td>

                    {/* Recommended Action */}
                    <td className="py-2.5 px-3 text-slate-600 max-w-[200px] truncate" title={actionText}>
                      {actionText}
                    </td>

                    {/* Action link */}
                    <td className="py-2.5 px-3 text-right">
                      <Link
                        href={`/sub-das/${item.subdas_id}?run=${runId}`}
                        className="inline-flex items-center gap-1 text-blue font-semibold hover:text-blue-700"
                      >
                        <span>Lihat</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> (
          {totalFiltered} sub-DAS)
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="p-1 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-40"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

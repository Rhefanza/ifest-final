"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatScore, truncateId } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";
import { formatActionText } from "@/lib/rules";

interface TaskItem {
  subdas_id: string;
  basin_id: number;
  score: number;
  rank: number;
  typology: string;
  inspection_status?: string;
  inspection_result?: string | null;
  inspection_note?: string | null;
}

export function PlaybookTasksList({
  initialItems,
  runId,
}: {
  initialItems: TaskItem[];
  runId: number;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 25;

  const filtered = initialItems.filter((item) => {
    if (search && !item.subdas_id.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    const currentStatus = item.inspection_status || "belum";
    if (statusFilter !== "ALL" && currentStatus !== statusFilter) {
      return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-heading font-bold text-navy text-sm">
            Daftar Tugas Lapangan Sub-DAS SIAGA ({initialItems.length} Wilayah)
          </h3>
          <p className="text-xs text-slate-500">
            Pilih baris untuk mencatat hasil verifikasi dan status intervensi lapangan
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-44">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari ID sub-DAS..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-navy placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-navy font-medium focus:outline-none"
          >
            <option value="ALL">Semua Status Tugas</option>
            <option value="belum">Belum Diinspeksi</option>
            <option value="terjadwal">Terjadwal</option>
            <option value="selesai">Selesai</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-500 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="py-2.5 px-4 w-12 text-center">Rank</th>
              <th className="py-2.5 px-4">Sub-DAS</th>
              <th className="py-2.5 px-4">Basin</th>
              <th className="py-2.5 px-4">Tipologi</th>
              <th className="py-2.5 px-4">SOP Tindakan Disarankan</th>
              <th className="py-2.5 px-4 text-center">Status Inspeksi</th>
              <th className="py-2.5 px-4 text-right">Form Tindakan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  Tidak ada tugas yang cocok dengan filter pencarian.
                </td>
              </tr>
            ) : (
              paginated.map((item) => {
                const typoInfo =
                  KEY_METRICS.TYPOLOGY_CHARACTERISTICS[
                    item.typology as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS
                  ];
                const action = formatActionText({
                  tier: "SIAGA",
                  tierFinal: "SIAGA",
                  typology: item.typology as any,
                  isEscalated: false,
                });

                const inspStatus = item.inspection_status || "belum";

                return (
                  <tr key={item.subdas_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-500 text-center">
                      #{item.rank}
                    </td>

                    <td className="py-2.5 px-4 font-mono font-bold text-navy">
                      {truncateId(item.subdas_id)}
                    </td>

                    <td className="py-2.5 px-4">
                      <Link
                        href={`/basin/${item.basin_id}?run=${runId}`}
                        className="text-blue hover:underline font-medium"
                      >
                        Basin {item.basin_id}
                      </Link>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="font-semibold text-slate-700">
                        {typoInfo?.name || item.typology}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-slate-600 truncate max-w-[220px]" title={action}>
                      {action}
                    </td>

                    <td className="py-2.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          inspStatus === "selesai"
                            ? "bg-teal/10 text-teal"
                            : inspStatus === "terjadwal"
                            ? "bg-blue-50 text-blue border border-blue-200"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {inspStatus === "selesai" ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : inspStatus === "terjadwal" ? (
                          <Clock className="w-3 h-3" />
                        ) : null}
                        {inspStatus === "selesai"
                          ? "Selesai"
                          : inspStatus === "terjadwal"
                          ? "Terjadwal"
                          : "Belum"}
                      </span>
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <Link
                        href={`/sub-das/${item.subdas_id}?run=${runId}`}
                        className="inline-flex items-center gap-1 text-blue font-semibold hover:text-blue-700"
                      >
                        <span>Update Form</span>
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

      {/* Pagination */}
      <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <div>
          Halaman <strong>{currentPage}</strong> dari <strong>{totalPages}</strong> ({filtered.length} sub-DAS)
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

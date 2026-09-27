import Link from "next/link";
import { formatScore, truncateId } from "@/lib/format";
import { GitFork, ArrowDown, ArrowRight, Waves } from "lucide-react";

interface NeighborProps {
  subdasId: string;
  downstream: any;
  upstream: any[];
  runId: number;
}

export function NeighborsList({
  subdasId,
  downstream,
  upstream,
  runId,
}: NeighborProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div>
        <h3 className="font-heading font-bold text-navy text-sm">
          Konteks Jaringan Aliran Sungai
        </h3>
        <p className="text-xs text-slate-500">
          Hubungan topologi hulu (anak sungai masuk) dan hilir (tujuan limpasan air)
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Upstream tributaries */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
            <span className="flex items-center gap-1.5">
              <GitFork className="w-4 h-4 text-blue rotate-180" /> Sub-DAS Hulu (Inflow)
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {upstream.length} anak sungai
            </span>
          </div>

          {upstream.length === 0 ? (
            <div className="py-4 text-center text-xs text-slate-400 italic">
              Sub-DAS hulu paling puncak (headwater, tidak ada aliran masuk dari hulu).
            </div>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {upstream.map((up) => {
                const effTier = up.tier_final || up.tier;
                return (
                  <Link
                    key={up.subdas_id}
                    href={`/sub-das/${up.subdas_id}?run=${runId}`}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-white border border-slate-200 hover:border-blue transition text-xs group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-navy group-hover:text-blue">
                        {truncateId(up.subdas_id)}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                          effTier === "SIAGA"
                            ? "bg-red-50 text-red border border-red-200"
                            : effTier === "WASPADA"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {effTier}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                      <span>{formatScore(up.score)}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-blue" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Downstream receiver */}
        <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-600 mb-2">
              <span className="flex items-center gap-1.5">
                <ArrowDown className="w-4 h-4 text-teal" /> Sub-DAS Hilir (Outflow)
              </span>
              <span className="text-[11px] font-mono text-slate-400">Muara Aliran</span>
            </div>

            {downstream ? (
              <div className="p-3 rounded-lg bg-white border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-navy text-xs">
                    {downstream.subdas_id}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      (downstream.tier_final || downstream.tier) === "SIAGA"
                        ? "bg-red-50 text-red border border-red-200"
                        : (downstream.tier_final || downstream.tier) === "WASPADA"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {downstream.tier_final || downstream.tier}
                  </span>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between">
                  <span>Skor Risiko Hilir:</span>
                  <span className="font-mono font-bold text-navy">
                    {formatScore(downstream.score)}
                  </span>
                </div>

                <Link
                  href={`/sub-das/${downstream.subdas_id}?run=${runId}`}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold text-blue bg-blue-50 rounded-lg hover:bg-blue-100 transition"
                >
                  <span>Buka Detail Hilir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-white border border-teal/20 text-center space-y-1">
                <Waves className="w-6 h-6 text-teal mx-auto mb-1" />
                <div className="font-bold text-navy text-xs">Muara Aliran (Outlet Basin)</div>
                <div className="text-[11px] text-slate-500">
                  Sub-DAS ini merupakan titik keluar (outlet) akhir basin ke laut atau danau utama.
                </div>
              </div>
            )}
          </div>

          <div className="p-2.5 rounded-lg bg-blue-50/60 border border-blue-100 text-[11px] text-slate-600">
            <strong>Kaidah Keterkaitan:</strong> Defisit air di sub-DAS ini berdampak langsung pada pasokan debit ke sub-DAS hilir.
          </div>
        </div>
      </div>
    </div>
  );
}

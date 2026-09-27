"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Calendar, ChevronDown, Check } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface RunOption {
  id: number;
  label: string;
  source: string;
  target_month: number;
}

export function RunSelector({ runs, currentRunId }: { runs: RunOption[]; currentRunId: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentRun = runs.find((r) => r.id === currentRunId) || runs[3] || runs[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRun = (runId: number) => {
    setIsOpen(false);
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("run", runId.toString());
    
    // Navigate with updated query parameter
    if (pathname.startsWith("/laporan/")) {
      router.push(`/laporan/${runId}`);
    } else {
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  const testRuns = runs.filter((r) => r.source === "test");
  const uploadRuns = runs.filter((r) => r.source === "upload");
  const historyRuns = runs.filter((r) => r.source === "history");

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-navy hover:bg-slate-50 transition shadow-sm"
      >
        <Calendar className="w-4 h-4 text-blue" />
        <span className="max-w-[200px] truncate">{currentRun?.label || "Pilih Run"}</span>
        <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue border border-blue-100">
          {currentRun?.source === "test" ? "Bulan Test" : currentRun?.source === "upload" ? "Unggahan" : "OOF"}
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-72 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5">
          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Bulan Test Resmi (4 Origin)
          </div>
          {testRuns.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectRun(r.id)}
              className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-slate-50 text-left transition"
            >
              <div>
                <div className="font-semibold text-navy">{r.label}</div>
                <div className="text-[11px] text-slate-400">Prakiraan Sub-DAS 2.982 wilayah</div>
              </div>
              {r.id === currentRunId && <Check className="w-4 h-4 text-blue shrink-0" />}
            </button>
          ))}

          {uploadRuns.length > 0 && (
            <>
              <div className="border-t border-slate-100 my-1"></div>
              <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Unggahan Mandiri
              </div>
              {uploadRuns.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleSelectRun(r.id)}
                  className="w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg hover:bg-slate-50 text-left transition"
                >
                  <div className="font-semibold text-navy truncate">{r.label}</div>
                  {r.id === currentRunId && <Check className="w-4 h-4 text-blue shrink-0" />}
                </button>
              ))}
            </>
          )}

          <div className="border-t border-slate-100 my-1"></div>
          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Riwayat 168 Bulan (Sampel OOF)
          </div>
          {historyRuns.slice(0, 10).map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelectRun(r.id)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg hover:bg-slate-50 text-left transition"
            >
              <span className="text-slate-600 truncate">{r.label}</span>
              {r.id === currentRunId && <Check className="w-3.5 h-3.5 text-blue shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

import { RunSelector } from "./run-selector";
import { RoleSwitcher } from "./role-switcher";
import { ShieldAlert, Cpu } from "lucide-react";

interface HeaderProps {
  runs: any[];
  currentRunId: number;
}

export function Header({ runs, currentRunId }: HeaderProps) {
  const currentRun = runs.find((r) => r.id === currentRunId) || runs[3] || runs[0];

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Left: Run Selector + Model version tag */}
      <div className="flex items-center gap-3">
        <RunSelector runs={runs} currentRunId={currentRunId} />
        
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-50 text-slate-500 border border-slate-200 text-xs">
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono text-[11px]">{currentRun?.model_version || "iris-serving-v1"}</span>
        </div>
      </div>

      {/* Right: Demo banner + Role switcher */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Mode demo</span>
        </div>

        <RoleSwitcher />
      </div>
    </header>
  );
}

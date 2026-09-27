"use client";

import { useState } from "react";
import { CheckCircle2, ShieldCheck, Plus } from "lucide-react";
import { toggleBasinPlanAction } from "@/app/actions/basin";

export function BasinPlanButton({
  runId,
  basinId,
  initialHasPlan,
}: {
  runId: number;
  basinId: number;
  initialHasPlan: boolean;
}) {
  const [hasPlan, setHasPlan] = useState(initialHasPlan);
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    const nextState = !hasPlan;
    setHasPlan(nextState); // optimistic
    try {
      await toggleBasinPlanAction(runId, basinId, nextState);
    } catch (err) {
      setHasPlan(!nextState); // rollback
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-xs ${
        hasPlan
          ? "bg-teal text-white hover:bg-teal-600"
          : "bg-white text-navy border border-slate-200 hover:bg-slate-50"
      }`}
    >
      {hasPlan ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>Rencana Bersama Tersusun</span>
        </>
      ) : (
        <>
          <Plus className="w-4 h-4 text-slate-400" />
          <span>Tandai Rencana Bersama</span>
        </>
      )}
    </button>
  );
}

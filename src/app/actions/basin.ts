"use server";

import { setMemoryBasinPlan } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export async function toggleBasinPlanAction(
  runId: number,
  basinId: number,
  hasPlan: boolean,
  note: string | null = null
) {
  setMemoryBasinPlan(runId, basinId, hasPlan, note);
  revalidatePath(`/basin/${basinId}`);
  revalidatePath(`/basin`);
  revalidatePath(`/laporan/${runId}`);
  return { success: true, hasPlan };
}

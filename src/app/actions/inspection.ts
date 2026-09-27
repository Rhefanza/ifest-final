"use server";

import { setMemoryInspection } from "@/lib/db/queries";
import { revalidatePath } from "next/cache";

export async function updateInspectionAction(
  runId: number,
  subdasId: string,
  status: string,
  result: string | null,
  note: string | null
) {
  setMemoryInspection(runId, subdasId, status, result, note);
  revalidatePath(`/sub-das/${subdasId}`);
  revalidatePath(`/laporan/${runId}`);
  revalidatePath(`/playbook`);
  return { success: true };
}

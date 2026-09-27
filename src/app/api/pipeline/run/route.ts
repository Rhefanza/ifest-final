import { NextRequest, NextResponse } from "next/server";
import { runInferencePipeline } from "@/lib/pipeline/run";
import { registerCustomRun } from "@/lib/db/queries";

export const maxDuration = 60; // Allow sufficient time for inference

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const label = (formData.get("label") as string) || "Unggahan Mandiri";

    if (!file) {
      return NextResponse.json(
        { error: "File CSV tidak ditemukan" },
        { status: 400 }
      );
    }

    const text = await file.text();
    const startTime = performance.now();

    const { runMeta, predictions, audit } = runInferencePipeline(text, label);
    const durationMs = Math.round(performance.now() - startTime);

    // Register run in memory store so it appears in RunSelector and navigation
    const registeredRun = registerCustomRun(runMeta, predictions);

    return NextResponse.json({
      success: true,
      runId: registeredRun.id,
      runMeta: registeredRun,
      audit,
      durationMs,
      summary: {
        n_rows: runMeta.n_rows,
        n_siaga: runMeta.n_siaga,
        n_waspada: runMeta.n_waspada,
        n_normal: runMeta.n_normal,
        n_escalated: runMeta.n_escalated,
      },
    });
  } catch (err: any) {
    console.error("Pipeline error:", err);
    return NextResponse.json(
      { error: err.message || "Gagal memproses file inferensi" },
      { status: 500 }
    );
  }
}

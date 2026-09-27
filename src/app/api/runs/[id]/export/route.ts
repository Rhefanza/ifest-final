import { NextRequest, NextResponse } from "next/server";
import { getRunById, getRunPredictions } from "@/lib/db/queries";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const runId = parseInt(id, 10) || 4;
  const run = await getRunById(runId);
  const { data: predictions } = await getRunPredictions(runId, { pageSize: 5000 });

  if (!predictions || predictions.length === 0) {
    return new NextResponse("Tidak ada data untuk run ini", { status: 404 });
  }

  // Build CSV content
  const headers = [
    "subdas_id",
    "basin_id",
    "score",
    "rank",
    "pct",
    "tier",
    "tier_final",
    "is_escalated",
    "escalated_reason",
    "typology",
    "is_new",
    "net_context",
  ];

  const csvRows = [headers.join(",")];

  // Sort by rank ascending
  const sorted = [...predictions].sort((a, b) => a.rank - b.rank);

  for (const row of sorted) {
    const isEscalated = row.tier !== row.tier_final;
    const values = [
      row.subdas_id,
      row.basin_id,
      row.score.toFixed(4),
      row.rank,
      row.pct.toFixed(4),
      row.tier,
      row.tier_final,
      isEscalated ? "true" : "false",
      `"${(row.escalated_reason || "").replace(/"/g, '""')}"`,
      row.typology,
      row.is_new ? "true" : "false",
      `"${(row.net_context || "").replace(/"/g, '""')}"`,
    ];
    csvRows.push(values.join(","));
  }

  const csvString = "\uFEFF" + csvRows.join("\r\n"); // UTF-8 BOM for Excel compatibility

  return new NextResponse(csvString, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan_siaga_run_${runId}_${run?.origin_month || "data"}.csv"`,
    },
  });
}

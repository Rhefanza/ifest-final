export interface ActionRule {
  id: string;
  source: string; // e.g. 'R1', 'R2, P4', 'P3'
  text: string;
}

export interface RuleContext {
  tier: "SIAGA" | "WASPADA" | "NORMAL";
  tierFinal?: "SIAGA" | "WASPADA" | "NORMAL";
  typology: "kilat" | "airtanah" | "irigasi" | "campuran";
  isEscalated?: boolean;
  hasNeighborSiaga?: boolean;
  episodeLen?: number | null;
}

export function evaluateActionRules(ctx: RuleContext): ActionRule[] {
  const rules: ActionRule[] = [];
  const effectiveTier = ctx.tierFinal || ctx.tier;

  if (effectiveTier === "SIAGA") {
    // Base SIAGA rule
    rules.push({
      id: "RULE_SIAGA_BASE",
      source: "R1",
      text: "Inspeksi lapangan minggu ini; sosialisasi hemat air; siapkan pembatasan izin sementara.",
    });

    // Typology-specific enhancements
    if (ctx.typology === "airtanah") {
      rules.push({
        id: "RULE_SIAGA_AIRTANAH",
        source: "R2, P4",
        text: "Siapkan kontinjensi ≥ 3 bulan (43% episode bertahan ≥ 3 bulan).",
      });
    } else if (ctx.typology === "irigasi") {
      rules.push({
        id: "RULE_SIAGA_IRIGASI",
        source: "R4",
        text: "Prioritaskan efisiensi irigasi & kuota musiman.",
      });
    } else if (ctx.typology === "campuran") {
      rules.push({
        id: "RULE_SIAGA_CAMPURAN",
        source: "R3",
        text: "Masukkan ke rencana penanganan bersama basin.",
      });
    }

    if (ctx.hasNeighborSiaga) {
      rules.push({
        id: "RULE_SIAGA_NEIGHBOR",
        source: "R3",
        text: "Tangani dalam satu rencana terpadu basin bersama tetangga SIAGA.",
      });
    }

    if (ctx.episodeLen && ctx.episodeLen >= 2) {
      rules.push({
        id: "RULE_EPISODE_CONTINUE",
        source: "R2",
        text: `Episode bulan ke-${ctx.episodeLen}: aktifkan cadangan waduk & kontinjensi 2–3 bulan (peluang berlanjut 63%).`,
      });
    }
  } else if (effectiveTier === "WASPADA") {
    if (ctx.isEscalated) {
      rules.push({
        id: "RULE_WASPADA_ESCALATED",
        source: "R3",
        text: "Pantau ketat: tetangga SIAGA (risiko mulai stress 2,6–3,2×).",
      });
    } else if (ctx.typology === "kilat") {
      rules.push({
        id: "RULE_WASPADA_KILAT",
        source: "R1, P4",
        text: "Aksi ringan sekarang — tipe kilat adalah titik buta model (cakupan SIAGA hanya 28%).",
      });
    } else {
      rules.push({
        id: "RULE_WASPADA_DEFAULT",
        source: "R1",
        text: "Tingkatkan frekuensi pemantauan debit dan siapkan koordinasi lapangan.",
      });
    }
  } else {
    // NORMAL
    rules.push({
      id: "RULE_NORMAL",
      source: "R1",
      text: "Tidak ada aksi mendesak; tetap dipantau pada siklus bulan depan.",
    });
  }

  return rules;
}

export function formatActionText(ctx: RuleContext): string {
  const rules = evaluateActionRules(ctx);
  return rules.map((r) => r.text).join(" ");
}

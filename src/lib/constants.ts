export const MONTH_NAMES: Record<number, string> = {
  1: "Januari",
  2: "Februari",
  3: "Maret",
  4: "April",
  5: "Mei",
  6: "Juni",
  7: "Juli",
  8: "Agustus",
  9: "September",
  10: "Oktober",
  11: "November",
  12: "Desember",
};

export const KEY_METRICS = {
  SUBDAS_PER_MONTH: 2982,
  BASE_RATE: 0.204, // 20.4%
  PRECISION_SIAGA_OOF: 0.725, // 72-73%
  LIFT_SIAGA: 3.55, // 3.5-3.6x
  COVERAGE_WASPADA_OOF: 0.795, // 79-80%
  PUBLIC_LB_SCORE: 0.73944,
  TIER_COUNTS: {
    SIAGA: 298,
    WASPADA: 596,
    NORMAL: 2088,
  },
  P1_LABEL_RATE_RANGE: "4%–42%",
  P1_CALENDAR_RATE_RANGE: "18%–22%",
  P3_PERSISTENCE: {
    CONTINUE: 0.63,
    ONSET: 0.09,
    UPSTREAM_IF_DOWNSTREAM_STRESS: 0.84,
    UPSTREAM_IF_DOWNSTREAM_NORMAL: 0.06,
    NEIGHBOR_MULTIPLIER: "2,6–3,2×",
    HOTSPOT_RATIO: "32% / 68%",
  },
  P2_DEMAND_SUPPLY_RISK: {
    HI_RISK_RATIO: 1.6, // 32% vs 20%
    AUC_DIFF_SUPPLY: 0.30,
    AUC_DIFF_WITHDRAWAL: 0.001,
  },
  TYPOLOGY_TARGETS: {
    train: {
      kilat: 218,
      airtanah: 1110,
      irigasi: 73,
      campuran: 795,
    },
    test_new: {
      kilat: 206,
      airtanah: 287,
      irigasi: 10,
      campuran: 283,
    },
  },
  TYPOLOGY_CHARACTERISTICS: {
    kilat: {
      name: "Rawan kilat",
      code: "K",
      color: "#7B61FF",
      tagline: "BFI rendah, suplai naik-turun ekstrem, 72% di hulu.",
      description:
        "Sering mulai stress (≈ 18%/bulan) tetapi cepat pulih. Titik buta model → WASPADA sudah memicu aksi ringan.",
    },
    airtanah: {
      name: "Tersangga air tanah",
      code: "A",
      color: "#2E6FBA",
      tagline: "BFI tinggi, aliran stabil dari air tanah.",
      description:
        "Jarang mulai (≈ 6%/bulan), tetapi 43% episode bertahan ≥ 3 bulan. SIAGA = kontinjensi multi-bulan. Model paling andal (presisi 78%).",
    },
    irigasi: {
      name: "Tertekan irigasi",
      code: "I",
      color: "#A0652A",
      tagline: "Pengambilan ≈ 100% irigasi, beban demand tinggi.",
      description:
        "Pengambilan air melebihi kapasitas suplai lokal → prioritaskan efisiensi irigasi & kuota musiman.",
    },
    campuran: {
      name: "Campuran",
      code: "C",
      color: "#1C9C8C",
      tagline: "Karakter menengah, sinkron dengan basin.",
      description:
        "Karakteristik hidrologi moderat, paling serempak dengan dinamika basinnya (0,77) → koordinasi per basin.",
    },
  },
  BASINS: {
    TRAIN: 101,
    TEST: 148,
    NEW: 47,
    NEW_SUBDAS: 786,
  },
  VALIDATION: {
    ADVERSARIAL_AUC: 0.978,
    SRI_AUC: 0.955,
    CLIM_REPLACE_DROP: "0,739 → 0,454",
  },
  R4: {
    COUNT: 167, // ≈ 163
    IRRIGATION_SHARE: 0.77, // 77%
  },
};

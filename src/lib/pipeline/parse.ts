import Papa from "papaparse";

export interface DQAuditReport {
  rowCount: number;
  totalCells: number;
  commaCells: number;
  commaRate: number;
  monthVariants: number;
  toIdDirty: number;
  auxColsDropped: string[];
}

const MONTH_MAP: Record<string, number> = {
  jan: 1, januari: 1, january: 1, "01": 1, "1": 1,
  feb: 2, februari: 2, february: 2, "02": 2, "2": 2,
  mar: 3, maret: 3, march: 3, "03": 3, "3": 3,
  apr: 4, april: 4, "04": 4, "4": 4,
  may: 5, mei: 5, "05": 5, "5": 5,
  jun: 6, juni: 6, june: 6, "06": 6, "6": 6,
  jul: 7, juli: 7, july: 7, "07": 7, "7": 7,
  aug: 8, agustus: 8, august: 8, "08": 8, "8": 8,
  sep: 9, sept: 9, september: 9, "09": 9, "9": 9,
  oct: 10, okt: 10, oktober: 10, october: 10, "10": 10,
  nov: 11, nop: 11, november: 11, "11": 11,
  dec: 12, des: 12, desember: 12, december: 12, "12": 12,
};

export function normalizeMonth(val: any): number {
  if (val === undefined || val === null) return 1;
  const s = String(val).trim().toLowerCase();
  if (MONTH_MAP[s] !== undefined) return MONTH_MAP[s];
  const num = parseInt(s, 10);
  if (!isNaN(num) && num >= 1 && num <= 12) return num;
  const p3 = s.slice(0, 3);
  if (MONTH_MAP[p3] !== undefined) return MONTH_MAP[p3];
  return 1;
}

export function parseNumberCell(strVal: any): { val: number; hadComma: boolean } {
  if (strVal === undefined || strVal === null || strVal === "") {
    return { val: 0.0, hadComma: false };
  }
  if (typeof strVal === "number") {
    return { val: isFinite(strVal) ? strVal : 0.0, hadComma: false };
  }

  const s = String(strVal).trim();
  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Standard thousands separator e.g. "1,234.56" -> remove comma
    const cleaned = s.replace(/,/g, "");
    const parsed = parseFloat(cleaned);
    return { val: isNaN(parsed) ? 0.0 : parsed, hadComma: true };
  } else if (hasComma && !hasDot) {
    // Indonesian decimal or thousands without decimal e.g. "123,45"
    const asDec = parseFloat(s.replace(/,/g, "."));
    return { val: isNaN(asDec) ? 0.0 : asDec, hadComma: true };
  } else {
    const parsed = parseFloat(s);
    return { val: isNaN(parsed) ? 0.0 : parsed, hadComma: false };
  }
}

export function cleanToId(toIdVal: any): { toId: string; wasDirty: boolean } {
  if (!toIdVal) return { toId: "OUTLET", wasDirty: false };
  const raw = String(toIdVal);
  const trimmed = raw.trim();
  const upper = trimmed.toUpperCase();
  const wasDirty = raw !== trimmed || (upper !== "OUTLET" && trimmed !== trimmed.toLowerCase());

  if (upper === "OUTLET") {
    return { toId: "OUTLET", wasDirty };
  }
  return { toId: trimmed.toLowerCase(), wasDirty };
}

export function parseCsvInput(csvString: string): {
  rows: any[];
  audit: DQAuditReport;
} {
  const parsed = Papa.parse(csvString, {
    header: true,
    skipEmptyLines: true,
  });

  const rawRows = parsed.data as Record<string, string>[];
  if (rawRows.length === 0) {
    throw new Error("File CSV kosong atau format tidak valid");
  }

  const sampleHeaders = Object.keys(rawRows[0] || {});
  const auxColsDropped = sampleHeaders.filter((h) => h.startsWith("aux_"));
  const coreCols = sampleHeaders.filter(
    (h) => !["id", "to_id", "origin_id", "month", "row_id", "label", ...auxColsDropped].includes(h)
  );

  let commaCells = 0;
  let toIdDirty = 0;
  const monthSet = new Set<string>();

  const cleanRows = rawRows.map((raw) => {
    // 1. IDs
    const id = String(raw.id || "").trim().toLowerCase();
    const { toId, wasDirty } = cleanToId(raw.to_id);
    if (wasDirty) toIdDirty++;

    // 2. Month
    if (raw.month) monthSet.add(String(raw.month).trim());
    const month = normalizeMonth(raw.month);
    const originId = parseInt(String(raw.origin_id || "0"), 10) || 0;

    // 3. Numeric columns
    const cleanObj: Record<string, any> = {
      id,
      to_id: toId,
      month,
      origin_id: originId,
    };

    for (const c of coreCols) {
      const { val, hadComma } = parseNumberCell(raw[c]);
      if (hadComma) commaCells++;
      cleanObj[c] = val;
    }

    return cleanObj;
  });

  const totalCells = cleanRows.length * coreCols.length;
  const audit: DQAuditReport = {
    rowCount: cleanRows.length,
    totalCells,
    commaCells,
    commaRate: totalCells > 0 ? commaCells / totalCells : 0,
    monthVariants: monthSet.size,
    toIdDirty,
    auxColsDropped,
  };

  return { rows: cleanRows, audit };
}

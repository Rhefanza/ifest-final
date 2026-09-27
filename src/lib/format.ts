export const MONTH_NAMES = [
  "",
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const MONTH_SHORT_NAMES = [
  "",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export function getMonthName(monthNumber: number): string {
  if (monthNumber < 1 || monthNumber > 12) return "";
  return MONTH_NAMES[monthNumber];
}

export function formatNumber(
  val: number | null | undefined,
  decimals: number = 0
): string {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatPercent(
  val: number | null | undefined,
  decimals: number = 0
): string {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return new Intl.NumberFormat("id-ID", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(val);
}

export function formatScore(val: number | null | undefined): string {
  if (val === null || val === undefined || isNaN(val)) return "–";
  return formatNumber(val, 3);
}

export function truncateId(id: string, len: number = 6): string {
  if (!id) return "";
  return id.substring(0, len);
}

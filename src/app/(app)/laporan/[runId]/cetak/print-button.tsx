"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue text-white text-sm font-semibold hover:bg-blue-600 transition shadow-xs"
    >
      <Printer className="w-4 h-4" />
      <span>Cetak Dokumen (Ctrl+P)</span>
    </button>
  );
}

"use client";

import { useState } from "react";
import { ClipboardCheck, CheckCircle2, Clock, AlertCircle, Save } from "lucide-react";
import { updateInspectionAction } from "@/app/actions/inspection";

interface InspectionProps {
  runId: number;
  subdasId: string;
  initialStatus?: string;
  initialResult?: string | null;
  initialNote?: string | null;
}

export function InspectionCard({
  runId,
  subdasId,
  initialStatus = "belum",
  initialResult = null,
  initialNote = "",
}: InspectionProps) {
  const [status, setStatus] = useState(initialStatus);
  const [result, setResult] = useState(initialResult || "belum");
  const [note, setNote] = useState(initialNote || "");
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await updateInspectionAction(runId, subdasId, status, result, note);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error("Gagal menyimpan inspeksi:", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-blue" />
          <h3 className="font-heading font-bold text-navy text-sm">
            Status Validasi & Inspeksi Lapangan
          </h3>
        </div>
        {savedSuccess && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal bg-teal/10 px-2 py-0.5 rounded-md">
            <CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-4 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Status Tindakan Lapangan
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-navy focus:outline-none focus:ring-1 focus:ring-blue"
            >
              <option value="belum">Belum Diinspeksi</option>
              <option value="terjadwal">Terjadwal (Minggu 1)</option>
              <option value="selesai">Selesai Diperiksa</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
              Hasil Temuan Visual
            </label>
            <select
              value={result}
              onChange={(e) => setResult(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-medium text-navy focus:outline-none focus:ring-1 focus:ring-blue"
            >
              <option value="belum">Belum Ada Hasil</option>
              <option value="stres_berat">Terverifikasi Stres Berat (Debit Kritis)</option>
              <option value="stres_sedang">Stres Sedang (Debit Berkurang)</option>
              <option value="nihil">Nihil / Terkendali (Aman)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Catatan Petugas & Rencana Mitigasi
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tuliskan catatan kondisi intake air, pintu bendung, atau koordinasi gilir giring air..."
            rows={3}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-sans text-navy focus:outline-none focus:ring-1 focus:ring-blue resize-none placeholder:text-slate-400"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue text-white rounded-lg font-semibold hover:bg-blue-600 transition shadow-xs disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? "Menyimpan..." : "Simpan Pembaruan"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState } from "react";
import {
  UploadCloud,
  FileCheck,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Clock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { formatNumber, formatPercent } from "@/lib/format";

export default function UnggahPage() {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [status, setStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [result, setResult] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState<"inferensi" | "realisasi">("inferensi");

  const sampleFiles = [
    { name: "Prakiraan November (origin 169)", path: "/samples/data_origin169_okt.csv" },
    { name: "Prakiraan Mei (origin 14)", path: "/samples/data_origin14_apr.csv" },
    { name: "Prakiraan Maret (origin 81)", path: "/samples/data_origin81_feb.csv" },
    { name: "Prakiraan Januari (origin 94)", path: "/samples/data_origin94_des.csv" },
  ];

  const handleSelectSample = async (samplePath: string, sampleLabel: string) => {
    try {
      setStatus("processing");
      setCurrentStep(1);
      setErrorMsg("");
      const res = await fetch(samplePath);
      const blob = await res.blob();
      const loadedFile = new File([blob], samplePath.split("/").pop() || "sample.csv", {
        type: "text/csv",
      });
      setFile(loadedFile);
      setLabel(sampleLabel);
      executeUpload(loadedFile, sampleLabel);
    } catch (err: any) {
      setStatus("error");
      setErrorMsg("Gagal memuat file sampel: " + err.message);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      if (!label) {
        setLabel(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const executeUpload = async (fileToUpload: File, customLabel?: string) => {
    setStatus("processing");
    setCurrentStep(2);
    setErrorMsg("");

    const formData = new FormData();
    formData.append("file", fileToUpload);
    formData.append("label", customLabel || label || "Hasil Unggahan");

    try {
      setCurrentStep(3);
      const res = await fetch("/api/pipeline/run", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Gagal memproses data");
      }

      setCurrentStep(4);
      setResult(data);
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Terjadi kesalahan saat inferensi");
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue uppercase tracking-wider mb-1">
          <UploadCloud className="w-4 h-4 text-blue" />
          <span>Pipeline Mandiri Operasional</span>
        </div>
        <h1 className="text-2xl font-black font-heading text-navy">
          Unggah Data Amatan Hidrologi & Jalankan Inferensi
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Unggah file CSV pengamatan bulanan 2.982 sub-DAS. Pipeline TypeScript murni akan membersihkan anomali data (koma/format bulan), mengekstraksi 157 fitur hidrologi & topologi, dan menjalankan 7 model ensemble IRIS secara lokal tanpa server eksternal.
        </p>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab("inferensi")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "inferensi"
                ? "bg-blue text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Prakiraan 1 Bulan ke Depan
          </button>
          <button
            onClick={() => setActiveTab("realisasi")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === "realisasi"
                ? "bg-blue text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Unggah Realisasi Amatan (Evaluasi Presisi)
          </button>
        </div>
      </div>

      {activeTab === "inferensi" ? (
        <>
          {/* Stepper Display */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div
                className={`p-2 rounded-lg font-medium transition ${
                  currentStep >= 1 ? "bg-blue-50 text-blue font-bold" : "text-slate-400"
                }`}
              >
                1. Pilih File CSV
              </div>
              <div
                className={`p-2 rounded-lg font-medium transition ${
                  currentStep >= 2 ? "bg-blue-50 text-blue font-bold" : "text-slate-400"
                }`}
              >
                2. Audit Kualitas Data
              </div>
              <div
                className={`p-2 rounded-lg font-medium transition ${
                  currentStep >= 3 ? "bg-blue-50 text-blue font-bold" : "text-slate-400"
                }`}
              >
                3. Inferensi 7 Model
              </div>
              <div
                className={`p-2 rounded-lg font-medium transition ${
                  currentStep === 4 ? "bg-teal/10 text-teal font-bold" : "text-slate-400"
                }`}
              >
                4. Hasil Siaga Siap
              </div>
            </div>
          </div>

          {/* Upload Area */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-blue transition bg-slate-50/50">
              <UploadCloud className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <div className="text-sm font-bold text-navy">
                {file ? file.name : "Seret dan lepas file CSV di sini, atau klik untuk memilih"}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Format standar pengamatan bulanan sub-DAS HUC12 (.csv)
              </p>

              <input
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="mt-4 block mx-auto text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue file:text-white hover:file:bg-blue-600 cursor-pointer"
              />
            </div>

            {/* Custom Label input */}
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                placeholder="Nama Label Laporan (contoh: Prakiraan November 2026)"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="flex-1 w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-navy focus:outline-none focus:ring-1 focus:ring-blue"
              />
              <button
                onClick={() => file && executeUpload(file)}
                disabled={!file || status === "processing"}
                className="w-full sm:w-auto px-5 py-2 rounded-lg bg-blue text-white text-xs font-semibold hover:bg-blue-600 transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {status === "processing" ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Memproses Pipeline...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-3.5 h-3.5" />
                    <span>Jalankan Inferensi</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick Sample Presets */}
            <div className="pt-4 border-t border-slate-100">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Atau Pilih Data Uji Cepat (Demo Presisi):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {sampleFiles.map((s) => (
                  <button
                    key={s.path}
                    onClick={() => handleSelectSample(s.path, s.name)}
                    disabled={status === "processing"}
                    className="p-2.5 rounded-lg border border-slate-200 hover:border-blue bg-slate-50 hover:bg-blue-50/50 text-left text-xs transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-blue shrink-0" />
                      <span className="font-semibold text-navy">{s.name}</span>
                    </div>
                    <span className="text-[10px] text-blue font-bold">Pilih</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Result / Success Panel */}
          {status === "success" && result && (
            <div className="bg-teal/5 p-6 rounded-2xl border border-teal/30 shadow-xs space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="font-heading font-bold text-base text-navy">
                    Inferensi 7-Model IRIS Berhasil Selesai!
                  </h3>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{result.durationMs} ms</span>
                </div>
              </div>

              {/* DQ Audit summary */}
              <div className="p-3 bg-white rounded-xl border border-slate-200/80 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 uppercase font-semibold">Sub-DAS Dinilai</div>
                  <div className="font-mono font-bold text-navy mt-0.5">{result.summary.n_rows}</div>
                </div>
                <div>
                  <div className="text-[10px] text-red-600 uppercase font-bold">Status SIAGA</div>
                  <div className="font-mono font-black text-red mt-0.5">{result.summary.n_siaga}</div>
                </div>
                <div>
                  <div className="text-[10px] text-amber-700 uppercase font-bold">Status WASPADA</div>
                  <div className="font-mono font-bold text-amber-800 mt-0.5">
                    {result.summary.n_waspada} (+{result.summary.n_escalated} eskalasi)
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-semibold">Status NORMAL</div>
                  <div className="font-mono font-bold text-slate-700 mt-0.5">{result.summary.n_normal}</div>
                </div>
              </div>

              {/* Trap audit note */}
              {result.audit && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 text-[11px] text-slate-600 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal shrink-0" />
                  <span>
                    Audit Trap: <strong>{result.audit.commaCells}</strong> sel koma diperbaiki,{" "}
                    <strong>{result.audit.toIdDirty}</strong> to_id dinormalisasi,{" "}
                    <strong>{result.audit.auxColsDropped?.length || 0}</strong> kolom auxiliary disaring.
                  </span>
                </div>
              )}

              {/* CTA Button */}
              <div className="flex justify-end pt-2">
                <Link
                  href={`/laporan/${result.runId}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue text-white font-semibold text-xs hover:bg-blue-600 transition shadow-xs"
                >
                  <span>Buka Laporan Siaga & Rekomendasi Tindakan</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </>
      ) : (
        /* Realisasi Tab */
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal" />
            <h3 className="font-heading font-bold text-navy text-sm">
              Unggah Ground Truth Realisasi Amatan (t = 166)
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Fitur ini menguji kejujuran data dan akurasi model ketika bulan berjalan telah berakhir. Sistem membandingkan status prakiraan awal vs fakta lapangan sesungguhnya.
          </p>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-navy">File Contoh: realisasi_t166.csv</span>
              <span className="text-teal font-bold bg-teal/10 px-2 py-0.5 rounded-md">
                Tersedia di public/samples/
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Telah disiapkan amatan riil untuk bulan $t=166$ (2.196 sub-DAS latih). Presisi status SIAGA pada data OOF terbukti mencapai <strong>72,5%</strong> (Lift 3,55× terhadap baseline acak).
            </p>
            <Link
              href="/evaluasi"
              className="inline-flex items-center gap-1.5 text-blue font-semibold hover:underline"
            >
              <span>Lihat Hasil Evaluasi Lengkap 168 Bulan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

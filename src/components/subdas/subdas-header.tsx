"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Copy,
  Check,
  ArrowLeft,
  GitFork,
  TrendingUp,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  MapPin,
} from "lucide-react";
import { formatNumber, formatScore, truncateId } from "@/lib/format";
import { KEY_METRICS } from "@/lib/constants";

interface HeaderProps {
  subdasId: string;
  subdasStatic: any;
  prediction: any;
  runId: number;
}

export function SubdasHeader({
  subdasId,
  subdasStatic,
  prediction,
  runId,
}: HeaderProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(subdasId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const effTier = prediction?.tier_final || prediction?.tier || "NORMAL";
  const isEscalated = prediction?.tier !== prediction?.tier_final;
  const typo = prediction?.typology || subdasStatic?.typology || "campuran";
  const typoInfo =
    KEY_METRICS.TYPOLOGY_CHARACTERISTICS[
      typo as keyof typeof KEY_METRICS.TYPOLOGY_CHARACTERISTICS
    ];

  const areaKm2 = subdasStatic?.inc_aream2
    ? (parseFloat(subdasStatic.inc_aream2) / 1e6).toFixed(1)
    : "-";
  const cumAreaKm2 = subdasStatic?.cum_aream2
    ? (parseFloat(subdasStatic.cum_aream2) / 1e6).toFixed(1)
    : "-";
  const bfiVal = subdasStatic?.bfi ? parseFloat(subdasStatic.bfi).toFixed(2) : "-";

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
      {/* Top breadcrumb & back */}
      <div className="flex items-center justify-between">
        <Link
          href={`/laporan/${runId}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali ke Laporan Siaga</span>
        </Link>

        <div className="flex items-center gap-2">
          {prediction?.is_new && (
            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              <Sparkles className="w-3 h-3" /> Sub-DAS Baru (Test)
            </span>
          )}
          <Link
            href={`/basin/${prediction?.basin_id ?? subdasStatic?.basin ?? 0}?run=${runId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Lihat Basin {prediction?.basin_id ?? subdasStatic?.basin}</span>
          </Link>
        </div>
      </div>

      {/* Main identity row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-1">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold tracking-wide uppercase ${
                effTier === "SIAGA"
                  ? "bg-red-50 text-red border border-red-200"
                  : effTier === "WASPADA"
                  ? "bg-amber-50 text-amber-800 border border-amber-200"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {effTier === "SIAGA" ? (
                <AlertCircle className="w-4 h-4 text-red" />
              ) : effTier === "WASPADA" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-teal" />
              )}
              {effTier}
            </span>

            {isEscalated && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <TrendingUp className="w-3 h-3 text-amber-600" />
                Eskalasi Tetangga
              </span>
            )}

            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-xs"
              style={{ backgroundColor: typoInfo?.color || "#1C9C8C" }}
              title={typoInfo?.description}
            >
              <span>{typoInfo?.code}</span>
              <span className="text-[11px] font-medium opacity-90">· {typoInfo?.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black font-mono tracking-tight text-navy">
              {subdasId}
            </h1>
            <button
              onClick={handleCopy}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-navy transition"
              title="Salin ID sub-DAS"
            >
              {copied ? <Check className="w-4 h-4 text-teal" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
            {prediction?.net_context || "Sub-DAS hidrologi HUC12 dalam jaringan aliran sungai."}
          </p>
        </div>

        {/* Quick metrics cards */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Skor Risiko
            </div>
            <div className="font-mono text-xl font-black text-navy mt-0.5">
              {prediction?.score !== undefined ? formatScore(prediction.score) : "-"}
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Peringkat
            </div>
            <div className="font-mono text-xl font-bold text-navy mt-0.5">
              #{prediction?.rank ?? "-"}
              <span className="text-[10px] font-sans font-normal text-slate-400 block">
                Top {prediction?.pct ? (prediction.pct * 100).toFixed(1) + "%" : "-"}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl px-4 py-2.5 text-center min-w-[100px]">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Luas Lokal / Kumulatif
            </div>
            <div className="font-mono text-sm font-bold text-navy mt-0.5">
              {areaKm2} / {cumAreaKm2}
              <span className="text-[10px] font-sans font-normal text-slate-400 block">
                km² · BFI {bfiVal}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

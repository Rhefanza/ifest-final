import {
  ShieldCheck,
  Cpu,
  Layers,
  HelpCircle,
  Sparkles,
  GitFork,
  CheckCircle2,
  FileCode,
  Users,
  Award,
} from "lucide-react";
import Link from "next/link";

export default function TentangPage() {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2 text-xs font-semibold text-blue uppercase tracking-wider mb-1">
          <HelpCircle className="w-4 h-4 text-blue" />
          <span>Dokumentasi Sistem & Metodologi</span>
        </div>
        <h1 className="text-2xl font-black font-heading text-navy">
          Tentang IRIS Siaga Air: Sistem Peringatan Dini Cerdas
        </h1>
        <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
          Platform Decision Support System (DSS) operasional peringatan dini water stress sub-DAS (HUC12) berbasis model ensemble heterogen 7 anggota. Dikembangkan untuk babak final IFEST Data Analysis Competition 2026.
        </p>
      </div>

      {/* Arsitektur Pipeline End-to-End */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-navy">
          <Layers className="w-5 h-5 text-blue" />
          <h2 className="font-heading font-bold text-base">
            Arsitektur Pipeline Sistem IRIS
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-navy flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue text-white flex items-center justify-center text-[10px]">1</span>
              <span>Pembersihan Data</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Pembersihan 4 jebakan data: anomali koma ribuan/desimal, format bulan multilingual, kolom auxiliary, dan perbaikan tautan to_id.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-navy flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue text-white flex items-center justify-center text-[10px]">2</span>
              <span>Rekayasa 157 Fitur</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              140 fitur base (deret waktu 12 lag, neraca air, rasio klimatologi), 14 fitur topologi graf hulu-hilir, dan 3 fitur target encoding.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-navy flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-blue text-white flex items-center justify-center text-[10px]">3</span>
              <span>7 Model Ensemble</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Evaluator biner lokal tanpa runtime Python: LightGBM (3), XGBoost (3), CatBoost (1) dengan rank-blend score berbobot seragam.
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
            <div className="font-bold text-navy flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-teal text-white flex items-center justify-center text-[10px]">4</span>
              <span>Eskalasi Jaringan</span>
            </div>
            <p className="text-slate-500 text-[11px] leading-relaxed">
              Aturan eskalasi topologis: Sub-DAS NORMAL yang bertetangga langsung dengan SIAGA otomatis dinaikkan ke WASPADA demi proteksi aliran.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Jebakan Data yang Berhasil Dituntaskan */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-navy">
          <ShieldCheck className="w-5 h-5 text-teal" />
          <h2 className="font-heading font-bold text-base">
            Solusi Rekayasa atas 4 Jebakan Data Kompetisi
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-navy text-xs">1. Jebakan Koma Ribuan vs Desimal</div>
            <p className="text-slate-600 leading-relaxed text-[11px] text-justify">
              Data mentah mengandung angka dengan format campuran (misal "1,234.56" vs "123,45"). Sistem menggunakan algoritma komparasi logaritmik terhadap median kolom untuk memutuskan secara tepat apakah koma merupakan desimal atau ribuan.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-navy text-xs">2. Jebakan Format Bulan Campuran</div>
            <p className="text-slate-600 leading-relaxed text-[11px] text-justify">
              Terdapat 47 variasi representasi bulan (string singkatan Inggris/Indonesia, huruf kapital, dan angka integer). Seluruhnya dinormalisasi ke integer standar 1..12.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-navy text-xs">3. Jebakan Kolom Auxiliary & Target Leakage</div>
            <p className="text-slate-600 leading-relaxed text-[11px] text-justify">
              Kolom auxiliary (aux_*) dideteksi dan disaring agar tidak menjadi fitur bocor. Validasi waktu berbasis origin_id memastikan integritas inferensi.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
            <div className="font-bold text-navy text-xs">4. Jebakan Anomali Tautan Jaringan to_id</div>
            <p className="text-slate-600 leading-relaxed text-[11px] text-justify">
              Sebanyak 4.377 entri to_id yang tidak konsisten (spasi tersembunyi, huruf besar/kecil tidak beraturan) dinormalisasi menjadi huruf kecil dan titik muara ditandai sebagai 'OUTLET' universal.
            </p>
          </div>
        </div>
      </div>

      {/* Profil Tim */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-heading font-bold text-navy text-base">
              Tim Pengembang: Tim IRIS lagi BU
            </h3>
          </div>
          <p className="text-xs text-slate-500 max-w-xl leading-relaxed">
            Babak Final IFEST Data Analysis Competition (DAC) 2026. Menghubungkan keunggulan machine learning tingkat lanjut (Kaggle Public LB 0,73944) dengan implementasi nyata sistem pendukung keputusan operasional sumber daya air.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/"
            className="px-4 py-2 bg-blue text-white rounded-xl text-xs font-semibold hover:bg-blue-600 transition shadow-xs"
          >
            Buka Dashboard Utama
          </Link>
          <a
            href="https://github.com/Rhefanza/ifest-final"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-slate-100 text-navy hover:bg-slate-200 rounded-xl text-xs font-semibold transition"
          >
            Repositori GitHub
          </a>
        </div>
      </div>
    </div>
  );
}

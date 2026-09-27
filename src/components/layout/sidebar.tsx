"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  GitFork,
  ClipboardList,
  Target,
  BarChart3,
  UploadCloud,
  HelpCircle,
  Droplet,
} from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const runParam = searchParams ? searchParams.get("run") : null;
  const queryString = runParam ? `?run=${runParam}` : "";

  const navItems = [
    {
      title: "Laporan Siaga",
      href: `/${queryString}`,
      matchPrefix: ["/laporan", "/"],
      icon: AlertTriangle,
      badge: "Utama",
    },
    {
      title: "Jaringan Basin",
      href: `/basin${queryString}`,
      matchPrefix: ["/basin"],
      icon: GitFork,
    },
    {
      title: "Playbook Bulanan",
      href: `/playbook${queryString}`,
      matchPrefix: ["/playbook"],
      icon: ClipboardList,
      badge: "KPI",
    },
    {
      title: "Rencana Strategis",
      href: `/strategi${queryString}`,
      matchPrefix: ["/strategi"],
      icon: Target,
    },
    {
      title: "Evaluasi & Replay",
      href: `/evaluasi${queryString}`,
      matchPrefix: ["/evaluasi"],
      icon: BarChart3,
      badge: "Q&A",
    },
    {
      title: "Unggah & Realisasi",
      href: `/unggah${queryString}`,
      matchPrefix: ["/unggah"],
      icon: UploadCloud,
    },
    {
      title: "Metodologi & Tim",
      href: `/tentang${queryString}`,
      matchPrefix: ["/tentang"],
      icon: HelpCircle,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0 min-h-screen">
      {/* Brand logo */}
      <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue to-teal flex items-center justify-center shadow-md shadow-blue/20">
          <Droplet className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="font-heading font-black text-lg text-navy tracking-tight leading-none block">
            IRIS Siaga Air
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mt-0.5">
            Sistem Peringatan Dini
          </span>
        </div>
      </div>

      {/* Nav menu */}
      <nav className="flex-1 p-3 space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Modul Operasional
        </div>
        {navItems.slice(0, 3).map((item) => {
          const isActive =
            item.href === `/${queryString}`
              ? pathname === "/" || pathname.startsWith("/laporan")
              : pathname.startsWith(item.matchPrefix[0]);
          const Icon = item.icon;

          return (
            <a
              key={item.title}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-navy"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue" : "text-slate-400"}`} />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  isActive ? "bg-blue/10 text-blue" : "bg-slate-100 text-slate-500"
                }`}>
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}

        <div className="px-3 pt-4 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Keputusan & Dampak
        </div>
        {navItems.slice(3, 5).map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix[0]);
          const Icon = item.icon;

          return (
            <a
              key={item.title}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-navy"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue" : "text-slate-400"}`} />
                <span>{item.title}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider ${
                  isActive ? "bg-blue/10 text-blue" : "bg-slate-100 text-slate-500"
                }`}>
                  {item.badge}
                </span>
              )}
            </a>
          );
        })}

        <div className="px-3 pt-4 pb-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Data & Sistem
        </div>
        {navItems.slice(5).map((item) => {
          const isActive = pathname.startsWith(item.matchPrefix[0]);
          const Icon = item.icon;

          return (
            <a
              key={item.title}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-blue font-semibold shadow-xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-navy"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-blue" : "text-slate-400"}`} />
                <span>{item.title}</span>
              </div>
            </a>
          );
        })}
      </nav>

      {/* Footer credit & LB score */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Kaggle Public LB</span>
          <span className="font-mono font-bold text-blue">0,73944</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span>Tim IRIS lagi BU</span>
          <span>IFEST DAC 2026</span>
        </div>
      </div>
    </aside>
  );
}

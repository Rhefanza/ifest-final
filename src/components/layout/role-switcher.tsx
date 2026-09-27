"use client";

import { useState, useEffect, useRef } from "react";
import { UserCheck, ChevronDown, Check, Shield } from "lucide-react";

export type UserRole = "analis" | "petugas" | "basin" | "pimpinan";

const ROLE_CONFIG: Record<UserRole, { title: string; subtitle: string; badge: string }> = {
  analis: {
    title: "Analis Data",
    subtitle: "Akses penuh pipeline, audit DQ, evaluasi model",
    badge: "Analis",
  },
  petugas: {
    title: "Petugas Lapangan",
    subtitle: "Daftar inspeksi SIAGA, konfirmasi lapangan",
    badge: "Lapangan",
  },
  basin: {
    title: "Forum Basin",
    subtitle: "Koordinasi hulu-hilir, tandai rencana bersama",
    badge: "Basin",
  },
  pimpinan: {
    title: "Pimpinan / Eksekutif",
    subtitle: "Ringkasan KPI, strategi R4/R5 & kebijakan",
    badge: "Pimpinan",
  },
};

export function RoleSwitcher() {
  const [role, setRole] = useState<UserRole>("analis");
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("iris_demo_role") as UserRole;
    if (saved && ROLE_CONFIG[saved]) {
      setRole(saved);
    }
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectRole = (newRole: UserRole) => {
    setRole(newRole);
    localStorage.setItem("iris_demo_role", newRole);
    setIsOpen(false);
    window.dispatchEvent(new Event("iris_role_change"));
  };

  const current = ROLE_CONFIG[role];

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-navy hover:bg-slate-50 transition shadow-sm"
      >
        <UserCheck className="w-4 h-4 text-teal" />
        <span className="font-semibold">{current.title}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-64 bg-white border border-slate-200 rounded-xl shadow-xl z-50 p-1.5">
          <div className="px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Shield className="w-3 h-3" /> Ganti Peran Demo
          </div>
          {(Object.keys(ROLE_CONFIG) as UserRole[]).map((rKey) => {
            const item = ROLE_CONFIG[rKey];
            const isSelected = rKey === role;
            return (
              <button
                key={rKey}
                onClick={() => handleSelectRole(rKey)}
                className={`w-full flex items-center justify-between px-2.5 py-2 text-xs rounded-lg text-left transition ${
                  isSelected ? "bg-slate-100 text-navy font-semibold" : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <div>
                  <div className="font-medium text-navy">{item.title}</div>
                  <div className="text-[11px] text-slate-400">{item.subtitle}</div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-teal shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

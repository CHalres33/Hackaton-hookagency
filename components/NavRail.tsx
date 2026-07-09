"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Fil d'actualité", dot: "#ff3d8b" },
  { href: "/radar", label: "Radar pipeline", dot: "#f0b429" },
  { href: "/validation", label: "File de validation", dot: "#a970ff" },
  { href: "/prospects", label: "Prospects", dot: "#4f8bff" },
];

export default function NavRail() {
  const pathname = usePathname();

  return (
    <nav className="flex w-[214px] shrink-0 flex-col gap-1 border-r border-bdr bg-black/20 p-3">
      <div className="px-2.5 pb-2 pt-1.5 font-head text-[9.5px] font-bold tracking-[.14em] text-[#5c5c66]">
        COCKPIT
      </div>
      {NAV.map((n) => {
        const active = pathname === n.href;
        return (
          <Link
            key={n.href}
            href={n.href}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
              active ? "bg-pink/12 text-pink" : "text-muted hover:bg-panel2 hover:text-txt"
            }`}
          >
            <span
              className="h-2 w-2 shrink-0 rounded-[3px]"
              style={{ background: n.dot, boxShadow: `0 0 8px ${n.dot}` }}
            />
            <span className="flex-1">{n.label}</span>
          </Link>
        );
      })}

      <div className="flex-1" />

      <div className="rounded-xl border border-bdr bg-white/[.03] p-3">
        <div className="mb-2 font-head text-[10px] font-bold tracking-[.1em] text-muted">
          CETTE SEMAINE
        </div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-muted">Comptes suivis</span>
          <span className="font-head text-[15px] font-bold">20</span>
        </div>
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-xs text-muted">Prospects</span>
          <span className="font-head text-[15px] font-bold">64</span>
        </div>
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-muted">Gestes envoyés</span>
          <span className="font-head text-[15px] font-bold text-[#ff7fb2]">5</span>
        </div>
      </div>
    </nav>
  );
}

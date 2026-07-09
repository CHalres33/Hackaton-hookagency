"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { SIGNAL_LABELS, type Signal } from "@/lib/types";
import RarityBadge from "@/components/RarityBadge";

export default function Feed() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [running, setRunning] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("signals")
      .select("*, accounts(*), contacts(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    setSignals((data as Signal[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("signals-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function treat(s: Signal) {
    setRunning((r) => ({ ...r, [s.id]: true }));
    try {
      await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signal_id: s.id }),
      });
    } finally {
      setRunning((r) => ({ ...r, [s.id]: false }));
      load();
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fil d&apos;actualité</h1>
          <p className="mt-1 text-sm text-muted">
            Signaux détectés par Sillage sur les 20 comptes suivis. Le physique se mérite.
          </p>
        </div>
        <Link href="/validation" className="text-sm text-pink hover:underline">
          Voir la file de validation →
        </Link>
      </div>

      <div className="space-y-3">
        {signals.map((s) => {
          const meta = SIGNAL_LABELS[s.type] ?? { label: s.type, emoji: "📡" };
          const summary =
            (s.payload?.summary as string) ??
            `${meta.label} chez ${s.accounts?.name ?? "un compte suivi"}`;
          const isLeg = s.rarity === "legendaire";
          return (
            <div
              key={s.id}
              className={`slide-in flex items-center gap-4 rounded-2xl border border-bdr bg-panel p-4 ${
                isLeg ? "halo-legendaire" : ""
              }`}
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel2 text-xl">
                {meta.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">
                    {s.contacts ? `${s.contacts.firstname} ${s.contacts.lastname}` : s.accounts?.name}
                  </span>
                  {s.contacts?.job_title && (
                    <span className="truncate text-sm text-muted">· {s.contacts.job_title}</span>
                  )}
                  <RarityBadge rarity={s.rarity} score={s.score} />
                </div>
                <p className="mt-0.5 truncate text-sm text-muted">{summary}</p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.contact_id && (
                  <Link
                    href={`/prospect/${s.contact_id}`}
                    className="rounded-full border border-bdr px-3 py-1.5 text-xs text-muted hover:text-txt"
                  >
                    Fiche
                  </Link>
                )}
                {s.status === "new" && (
                  <button
                    onClick={() => treat(s)}
                    disabled={running[s.id]}
                    className="rounded-full bg-pink px-4 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    {running[s.id] ? "Madeleine réfléchit…" : "Traiter"}
                  </button>
                )}
                {s.status === "processing" && (
                  <span className="pulse-soft rounded-full bg-pink/15 px-3 py-1.5 text-xs text-pink">
                    Agent en cours…
                  </span>
                )}
                {s.status === "treated" && (
                  <Link
                    href="/validation"
                    className="rounded-full bg-grn/15 px-3 py-1.5 text-xs text-grn"
                  >
                    Proposition prête ✓
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {signals.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr p-12 text-center text-muted">
            Aucun signal pour l&apos;instant. Ils arrivent en temps réel dès que Sillage détecte du
            mouvement.
          </div>
        )}
      </div>
    </div>
  );
}

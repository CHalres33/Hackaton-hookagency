"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { CHANNEL_META, SIGNAL_LABELS, type Action, type Signal } from "@/lib/types";
import RarityBadge from "@/components/RarityBadge";

export default function Feed() {
  const router = useRouter();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [recentActions, setRecentActions] = useState<Action[]>([]);
  const [running, setRunning] = useState<Record<number, boolean>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("signals")
      .select("*, accounts(*), contacts(*)")
      .order("created_at", { ascending: false })
      .limit(50);
    setSignals((data as Signal[]) ?? []);
  }, []);

  const loadActions = useCallback(async () => {
    const { data } = await supabase
      .from("actions")
      .select("*, contacts(*, accounts(*))")
      .order("created_at", { ascending: false })
      .limit(6);
    setRecentActions((data as Action[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    loadActions();
    const ch = supabase
      .channel("signals-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "signals" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "actions" }, loadActions)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, loadActions]);

  async function treat(s: Signal) {
    setRunning((r) => ({ ...r, [s.id]: true }));
    // Lance l'agent SANS attendre (le run dure 2-3 min) et emmène direct sur la fiche
    // du prospect (ou du compte) : les passions/actions s'y afficheront en realtime.
    fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signal_id: s.id }),
    }).catch(() => {});
    if (s.contact_id) router.push(`/prospect/${s.contact_id}`);
    else if (s.account_id) router.push(`/prospects?account=${s.account_id}`);
  }

  const topAccounts = Object.values(
    signals.reduce<Record<number, { name: string; score: number; count: number }>>((acc, s) => {
      if (!s.account_id || !s.accounts) return acc;
      const cur = acc[s.account_id] ?? { name: s.accounts.name, score: 0, count: 0 };
      cur.score = Math.max(cur.score, s.score ?? 0);
      cur.count += 1;
      acc[s.account_id] = cur;
      return acc;
    }, {})
  )
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);

  return (
    <div className="flex gap-8">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center gap-3">
          <h1 className="font-head text-[26px] font-bold tracking-tight">Fil d&apos;actualité</h1>
          <span className="flex items-center gap-1.5 rounded-full border border-grn/28 bg-grn/12 px-2.5 py-1 text-[11px] font-bold text-[#5ee7b0]">
            <span className="pulse-soft h-[7px] w-[7px] rounded-full bg-grn" />
            EN DIRECT
          </span>
        </div>
        <p className="mb-6 text-sm text-muted">
          Signaux détectés par Sillage sur les 20 comptes suivis. Le physique se mérite.
        </p>

        <div className="space-y-3">
          {signals.map((s) => {
            const meta = SIGNAL_LABELS[s.type] ?? { label: s.type, emoji: "📡" };
            const summary =
              (s.payload?.summary as string) ??
              `${meta.label} chez ${s.accounts?.name ?? "un compte suivi"}`;
            const isLeg = (s.score ?? 0) >= 90;
            return (
              <div
                key={s.id}
                className={`slide-in relative flex items-center gap-4 overflow-hidden rounded-2xl border border-bdr bg-panel p-4 pl-5 ${
                  isLeg ? "halo-legendaire" : ""
                }`}
              >
                <div
                  className="absolute inset-y-0 left-0 w-1"
                  style={{
                    background:
                      (s.score ?? 0) >= 90
                        ? "#f0b429"
                        : (s.score ?? 0) >= 70
                          ? "#a970ff"
                          : (s.score ?? 0) >= 45
                            ? "#4f8bff"
                            : "#9aa0aa",
                  }}
                />
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-panel2 text-xl">
                  {meta.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {s.contacts ? `${s.contacts.firstname} ${s.contacts.lastname}` : s.accounts?.name}
                    </span>
                    {s.contacts?.job_title && (
                      <span className="truncate text-sm text-muted">· {s.contacts.job_title}</span>
                    )}
                    <RarityBadge rarity={s.rarity} score={s.score} />
                  </div>
                  <p className="mt-0.5 truncate text-sm text-[#d4d4dd]">{summary}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-[#6a6a74]">
                    {new Date(s.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
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
                      {running[s.id] ? "Madeleine réfléchit…" : "Traiter →"}
                    </button>
                  )}
                  {s.status === "processing" && (
                    <span className="pulse-soft rounded-full bg-orange/15 px-3 py-1.5 text-xs text-[#ffcb7d]">
                      Agent en cours…
                    </span>
                  )}
                  {s.status === "treated" && (
                    <Link href="/validation" className="rounded-full bg-grn/15 px-3 py-1.5 text-xs text-grn">
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

      <aside className="w-[288px] shrink-0 border-l border-bdr pl-6">
        <div className="mb-3 font-head text-[11px] font-bold tracking-[.1em] text-muted">
          🏆 TOP COMPTES · SEMAINE
        </div>
        <div className="mb-7 space-y-2">
          {topAccounts.map((a) => (
            <div key={a.name} className="flex items-center justify-between rounded-xl border border-bdr bg-panel p-2.5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{a.name}</div>
                <div className="text-[11px] text-muted">{a.count} signal{a.count > 1 ? "aux" : ""}</div>
              </div>
              <span
                className="shrink-0 font-head text-sm font-bold"
                style={{ color: a.score >= 90 ? "#f0b429" : a.score >= 70 ? "#a970ff" : "#4f8bff" }}
              >
                {a.score}
              </span>
            </div>
          ))}
          {topAccounts.length === 0 && <p className="text-xs text-muted">Pas encore de signal.</p>}
        </div>

        <div className="mb-3 font-head text-[11px] font-bold tracking-[.1em] text-muted">
          ✦ DERNIÈRES ACTIONS
        </div>
        <div className="space-y-2">
          {recentActions.map((a) => (
            <div key={a.id} className="flex items-start gap-2.5 text-xs">
              <span className="mt-0.5 shrink-0">{CHANNEL_META[a.channel]?.emoji ?? "🎁"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[#d4d4dd]">
                  {a.contacts?.firstname} {a.contacts?.lastname} · {CHANNEL_META[a.channel]?.label}
                </p>
                <p className="font-mono text-[10.5px] text-[#6a6a74]">
                  {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          ))}
          {recentActions.length === 0 && <p className="text-xs text-muted">Aucune action pour l&apos;instant.</p>}
        </div>
      </aside>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import type { Contact, Relationship } from "@/lib/types";

type Row = Contact & { relationships: Relationship | Relationship[] | null };

function rel(r: Row): Relationship | null {
  if (!r.relationships) return null;
  return Array.isArray(r.relationships) ? r.relationships[0] ?? null : r.relationships;
}

function heat(r: Row): number {
  const rl = rel(r);
  return Math.round(((rl?.warmth ?? 0) + (rl?.opportunity ?? 0)) / 2);
}

function treatment(h: number): { label: string; cls: string } {
  if (h >= 65) return { label: "🧁 Mérite une madeleine", cls: "bg-gold/15 text-gold" };
  if (h >= 45) return { label: "✍️ Attention personnalisée", cls: "bg-pink/15 text-pink" };
  return { label: "✉️ Outbound classique", cls: "bg-panel2 text-muted" };
}

export default function Radar() {
  const [rows, setRows] = useState<Row[]>([]);
  const [scanning, setScanning] = useState<Record<number, boolean>>({});

  useEffect(() => {
    supabase
      .from("contacts")
      .select("*, accounts(*), relationships(*)")
      .then(({ data }) => setRows((data as Row[]) ?? []));
  }, []);

  const vitrines = rows.filter((r) => [1, 2, 3].includes(r.id));
  const vip = rows.filter((r) => r.id >= 4 && r.id <= 20);
  const pipeline = rows
    .filter((r) => r.origin === "pipedrive")
    .sort((a, b) => heat(b) - heat(a));

  async function scan(id: number) {
    setScanning((s) => ({ ...s, [id]: true }));
    fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: id }),
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Radar pipeline</h1>
        <p className="mt-1 text-sm text-muted">
          Ton vrai pipeline, scanné : chaleur (échanges réels) × opportunité (stage du deal).
          Chacun mérite une attention différente.
        </p>
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">
        Comptes vitrines — Sillage &amp; FullEnrich
      </h2>
      <div className="mb-8 grid gap-3 md:grid-cols-3">
        {vitrines.map((r) => (
          <Link
            key={r.id}
            href={`/prospect/${r.id}`}
            className="halo-legendaire rounded-2xl border border-bdr bg-panel p-4 hover:border-gold/60"
          >
            <div className="font-medium">
              {r.firstname} {r.lastname}
            </div>
            <div className="text-xs text-muted">{r.job_title} · {r.accounts?.name}</div>
            <div className="mt-2 text-[11px] text-gold">🎁 cadeau proposé — voir la fiche</div>
          </Link>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pink">
        Jury &amp; invités Station F
      </h2>
      <div className="mb-8 grid gap-2 md:grid-cols-4">
        {vip.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between gap-2 rounded-2xl border border-bdr bg-panel p-3"
          >
            <Link href={`/prospect/${r.id}`} className="min-w-0 flex-1 hover:text-pink">
              <div className="truncate text-sm font-medium">
                {r.firstname} {r.lastname}
              </div>
              <div className="truncate text-[11px] text-muted">
                {r.job_title} · {r.accounts?.name}
              </div>
            </Link>
            <button
              onClick={() => scan(r.id)}
              disabled={scanning[r.id]}
              className="shrink-0 rounded-full border border-bdr px-2.5 py-1 text-[11px] text-muted hover:border-pink hover:text-pink disabled:opacity-50"
            >
              {scanning[r.id] ? "…" : "🔍 Scanner"}
            </button>
          </div>
        ))}
      </div>

      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-pink">
        Ton pipeline Pipedrive ({pipeline.length} deals ouverts, temps réel)
      </h2>
      <div className="space-y-2">
        {pipeline.map((r) => {
          const rl = rel(r);
          const h = heat(r);
          const t = treatment(h);
          return (
            <div key={r.id} className="flex items-center gap-4 rounded-2xl border border-bdr bg-panel p-4">
              <div
                className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl text-sm font-bold ${
                  h >= 65 ? "bg-gold/15 text-gold" : h >= 45 ? "bg-pink/15 text-pink" : "bg-panel2 text-muted"
                }`}
              >
                {h}
                <span className="text-[9px] font-normal opacity-70">chaud</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/prospect/${r.id}`} className="font-medium hover:text-pink">
                    {r.firstname} {r.lastname}
                  </Link>
                  {r.accounts?.name && <span className="text-sm text-muted">· {r.accounts.name}</span>}
                  {r.deal_stage && (
                    <span className="rounded-full bg-panel2 px-2 py-0.5 text-[11px] text-muted">
                      {r.deal_stage}
                    </span>
                  )}
                  {r.deal_value_eur ? (
                    <span className="text-[11px] text-gold">{Math.round(r.deal_value_eur)}€</span>
                  ) : null}
                </div>
                <p className="mt-0.5 truncate text-xs text-muted" title={`${rl?.warmth_reason ?? ""} — ${rl?.opportunity_reason ?? ""}`}>
                  {rl?.warmth_reason} {rl?.opportunity_reason ? `— ${rl.opportunity_reason}` : ""}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium ${t.cls}`}>{t.label}</span>
              {h >= 45 && (
                <button
                  onClick={() => scan(r.id)}
                  disabled={scanning[r.id]}
                  className="shrink-0 rounded-full bg-pink px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {scanning[r.id] ? "Scan…" : "Scanner passions"}
                </button>
              )}
            </div>
          );
        })}
        {pipeline.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr p-10 text-center text-muted">
            Aucun deal synchronisé. Lance <code>scripts/sync-pipedrive.mjs</code>.
          </div>
        )}
      </div>
    </div>
  );
}

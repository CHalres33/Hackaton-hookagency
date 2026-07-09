"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase-browser";
import { CHANNEL_META, type Action } from "@/lib/types";
import EscalationLadder from "@/components/EscalationLadder";
import HandwrittenCard from "@/components/HandwrittenCard";

const XP_BY_CHANNEL = { email: 10, linkedin: 15, carte_manuscrite: 40, cadeau: 60, cadeau_legendaire: 100 };

export default function ValidationQueue() {
  const [actions, setActions] = useState<Action[]>([]);
  const [editing, setEditing] = useState<Record<number, string>>({});

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("actions")
      .select("*, contacts(*, accounts(*)), signals(*), passions(*)")
      .eq("status", "proposed")
      .order("contact_id", { ascending: true })
      .order("sequence_order", { ascending: true });
    setActions((data as Action[]) ?? []);
  }, []);

  useEffect(() => {
    load();
    const ch = supabase
      .channel("actions-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "actions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  async function decide(a: Action, status: "approved" | "rejected") {
    const message = editing[a.id] ?? a.message;
    await supabase.from("actions").update({ status, message }).eq("id", a.id);
    if (status === "approved") {
      if (a.channel === "carte_manuscrite") {
        fetch("/api/actions/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action_id: a.id }),
        });
      }
      const xp = XP_BY_CHANNEL[a.channel] ?? 10;
      const { data: g } = await supabase.from("game_state").select("*").eq("id", 1).single();
      const badges: string[] = g?.badges ?? [];
      if (!badges.includes("🧁") && (a.channel === "carte_manuscrite" || a.channel.startsWith("cadeau")))
        badges.push("🧁");
      await supabase
        .from("game_state")
        .update({ team_xp: (g?.team_xp ?? 0) + xp, streak: (g?.streak ?? 0) + 1, badges })
        .eq("id", 1);
      const { data: rel } = await supabase
        .from("relationships")
        .select("*")
        .eq("contact_id", a.contact_id)
        .maybeSingle();
      if (rel) {
        await supabase
          .from("relationships")
          .update({ xp: rel.xp + xp, warmth: Math.min(100, rel.warmth + 5) })
          .eq("contact_id", a.contact_id);
      } else {
        await supabase
          .from("relationships")
          .insert({ contact_id: a.contact_id, xp, warmth: 5, level: "contact" });
      }
    }
    load();
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">File de validation</h1>
        <p className="mt-1 text-sm text-muted">
          Madeleine propose, l&apos;humain dispose. Chaque geste part uniquement après ton feu vert.
        </p>
      </div>

      <div className="space-y-6">
        {actions.map((a) => (
          <div key={a.id} className="slide-in rounded-2xl border border-bdr bg-panel p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Link href={`/prospect/${a.contact_id}`} className="font-medium hover:text-pink">
                  {a.contacts?.firstname} {a.contacts?.lastname}
                </Link>
                <span className="text-sm text-muted">
                  {" "}
                  · {a.contacts?.job_title} · {a.contacts?.accounts?.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {a.sequence_order != null && (
                  <span className="rounded-full bg-panel2 px-2.5 py-1 text-[11px] text-muted">
                    Étape {a.sequence_order} du chemin
                  </span>
                )}
                <EscalationLadder selected={a.channel} />
              </div>
            </div>

            {a.gift_name && (
              <div className="mt-4 flex items-center justify-between rounded-xl border border-gold/30 bg-gold/5 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-gold">
                    {CHANNEL_META[a.channel].emoji} {a.gift_name}
                  </div>
                  {a.gift_url && (
                    <a
                      href={a.gift_url}
                      target="_blank"
                      className="text-xs text-muted underline hover:text-txt"
                    >
                      {a.gift_url.slice(0, 60)}…
                    </a>
                  )}
                </div>
                {a.gift_price_eur != null && (
                  <div className="text-lg font-semibold text-gold">{a.gift_price_eur}€</div>
                )}
              </div>
            )}

            {(a.gift_alternatives?.length ?? 0) > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-muted">Alternatives :</span>
                {a.gift_alternatives.map((alt, i) => (
                  <button
                    key={i}
                    title={alt.passion ? `passion : ${alt.passion}` : undefined}
                    onClick={async () => {
                      await supabase
                        .from("actions")
                        .update({
                          gift_name: alt.name,
                          gift_url: alt.url ?? null,
                          gift_price_eur: alt.price_eur ?? null,
                        })
                        .eq("id", a.id);
                      load();
                    }}
                    className="rounded-full border border-bdr px-3 py-1 text-[11px] text-muted hover:border-gold hover:text-gold"
                  >
                    {alt.name}
                    {alt.price_eur != null && ` · ${alt.price_eur}€`}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Le mot (éditable)
                </div>
                {a.channel === "carte_manuscrite" || a.channel.startsWith("cadeau") ? (
                  <HandwrittenCard
                    message={editing[a.id] ?? a.message}
                    recipient={`${a.contacts?.firstname} ${a.contacts?.lastname}`}
                    address={a.contacts?.postal_address}
                  />
                ) : null}
                <textarea
                  defaultValue={a.message}
                  onChange={(e) => setEditing((s) => ({ ...s, [a.id]: e.target.value }))}
                  rows={4}
                  className={`w-full rounded-xl border border-bdr bg-panel2 px-3 py-2 text-sm outline-none focus:border-pink ${
                    a.channel === "carte_manuscrite" || a.channel.startsWith("cadeau") ? "mt-2" : ""
                  }`}
                />
              </div>
              <div>
                <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                  Pourquoi Madeleine propose ça
                </div>
                <div className="rounded-xl border border-bdr bg-panel2 p-3 text-sm leading-6 text-txt/90 whitespace-pre-wrap">
                  {a.justification}
                </div>
                {a.passions && (
                  <div className="mt-2 text-xs text-muted">
                    Passion source : <span className="text-txt">{a.passions.value}</span>{" "}
                    <span
                      className={
                        a.passions.source_context === "pro_public" ? "text-grn" : "text-gold"
                      }
                    >
                      {a.passions.source_context === "pro_public"
                        ? "· pro-public, nommable"
                        : "· hors pro, jamais révélée"}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <button
                onClick={() => decide(a, "approved")}
                className="rounded-full bg-grn px-5 py-2 text-sm font-semibold text-black hover:opacity-90"
              >
                Approuver · +{XP_BY_CHANNEL[a.channel] ?? 10} XP
              </button>
              <button
                onClick={() => decide(a, "rejected")}
                className="rounded-full border border-bdr px-4 py-2 text-sm text-muted hover:text-txt"
              >
                Rejeter
              </button>
              <span className="ml-auto text-xs text-muted">
                {new Date(a.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}
        {actions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-bdr p-12 text-center text-muted">
            File vide. Traite un signal depuis le{" "}
            <Link href="/" className="text-pink hover:underline">
              fil d&apos;actualité
            </Link>
            .
          </div>
        )}
      </div>
    </div>
  );
}

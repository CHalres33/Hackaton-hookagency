"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import { LEVELS, type Contact, type Passion, type Relationship, type Signal } from "@/lib/types";
import RarityBadge from "@/components/RarityBadge";

type JourneyItem = {
  contact_id: number;
  at: string;
  kind: "interaction" | "signal" | "action";
  label: string;
  detail: string | null;
  cost: number | null;
  escalation_level: number;
};

const KIND_EMOJI: Record<string, string> = { interaction: "💬", signal: "📡", action: "🎁" };

const CAT_EMOJI: Record<string, string> = {
  musique: "🎸",
  sport_pratique: "🏃",
  sport_suivi: "📣",
  equipe: "🏟️",
  nationalite: "🌍",
  cause: "💚",
  hobby: "🎯",
  gastronomie: "🍷",
  tech: "🤖",
};

function EnrichField({ label, value, status }: { label: string; value: string | null; status: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-bdr bg-panel2 px-3 py-2">
      <span className="text-xs text-muted">{label}</span>
      {status === "found" && <span className="max-w-[60%] truncate text-xs text-grn">{value} ✓</span>}
      {status === "pending" && <span className="pulse-soft text-xs text-muted">en cours…</span>}
      {status === "failed" && <span className="text-xs text-red-400/80">introuvable</span>}
    </div>
  );
}

export default function ProspectPage() {
  const { id } = useParams<{ id: string }>();
  const contactId = Number(id);
  const [contact, setContact] = useState<Contact | null>(null);
  const [passions, setPassions] = useState<Passion[]>([]);
  const [rel, setRel] = useState<Relationship | null>(null);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [journey, setJourney] = useState<JourneyItem[]>([]);
  const [scanning, setScanning] = useState(false);

  const load = useCallback(async () => {
    const [{ data: c }, { data: p }, { data: r }, { data: s }, { data: j }] = await Promise.all([
      supabase.from("contacts").select("*, accounts(*)").eq("id", contactId).single(),
      supabase.from("passions").select("*").eq("contact_id", contactId).order("confidence", { ascending: false }),
      supabase.from("relationships").select("*").eq("contact_id", contactId).maybeSingle(),
      supabase.from("signals").select("*, accounts(*)").eq("contact_id", contactId).order("created_at", { ascending: false }),
      supabase.from("v_contact_journey").select("*").eq("contact_id", contactId).order("at", { ascending: false }).limit(15),
    ]);
    setContact(c as Contact);
    setPassions((p as Passion[]) ?? []);
    setRel(r as Relationship | null);
    setSignals((s as Signal[]) ?? []);
    setJourney((j as JourneyItem[]) ?? []);
  }, [contactId]);

  useEffect(() => {
    load();
    const ch = supabase
      .channel(`prospect-${contactId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "passions" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "contacts" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [load, contactId]);

  async function scan() {
    setScanning(true);
    try {
      await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact_id: contactId }),
      });
    } finally {
      setScanning(false);
      load();
    }
  }

  if (!contact) return <div className="text-muted">Chargement…</div>;

  const levelIdx = LEVELS.indexOf(rel?.level ?? "inconnu");

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-1 space-y-4">
        <div className="rounded-2xl border border-bdr bg-panel p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel2 text-lg font-semibold">
              {contact.firstname[0]}
              {contact.lastname[0]}
            </div>
            <div>
              <h1 className="text-lg font-semibold">
                {contact.firstname} {contact.lastname}
              </h1>
              <p className="text-sm text-muted">
                {contact.job_title} · {contact.accounts?.name}
              </p>
              <p className="text-xs text-muted">{[contact.city, contact.country].filter(Boolean).join(", ")}</p>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="text-muted">Relation</span>
              <span className="font-medium capitalize text-gold">
                {rel?.level ?? "inconnu"} · {rel?.warmth ?? 0}/100
              </span>
            </div>
            <div className="flex gap-1">
              {LEVELS.map((l, i) => (
                <div
                  key={l}
                  title={l}
                  className={`h-2 flex-1 rounded-full ${
                    i <= levelIdx ? "bg-gradient-to-r from-pink to-gold" : "bg-panel2"
                  }`}
                />
              ))}
            </div>
            <div className="mt-2 text-right text-xs text-muted">⚡ {rel?.xp ?? 0} XP relation</div>
          </div>
        </div>

        <div className="rounded-2xl border border-bdr bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Enrichissement</h2>
          <div className="space-y-2">
            <EnrichField label="Email" value={contact.email} status={contact.email_status} />
            <EnrichField label="Téléphone" value={contact.phone} status={contact.phone_status} />
            <EnrichField label="Adresse bureau" value={contact.postal_address} status={contact.address_status} />
            <EnrichField
              label="LinkedIn"
              value={contact.linkedin_url}
              status={contact.linkedin_url ? "found" : "failed"}
            />
          </div>
          {contact.enrichment_confidence != null && (
            <div className="mt-2 text-right text-xs text-muted">
              confiance {Math.round(contact.enrichment_confidence * 100)}%
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-bdr bg-panel p-5">
          <h2 className="mb-3 text-sm font-semibold">Signaux liés</h2>
          <div className="space-y-2">
            {signals.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm">
                <span className="truncate text-muted">{(s.payload?.summary as string) ?? s.type}</span>
                <RarityBadge rarity={s.rarity} score={s.score} />
              </div>
            ))}
            {signals.length === 0 && <p className="text-xs text-muted">Aucun signal pour l&apos;instant.</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Profil de passions</h2>
          <button
            onClick={scan}
            disabled={scanning}
            className="rounded-full bg-pink px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {scanning ? "🔍 Scan en cours… (web + réseaux)" : "🔍 Scanner le prospect"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {passions.map((p) => (
            <div key={p.id} className="slide-in rounded-2xl border border-bdr bg-panel p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-medium">
                  <span className="text-xl">{CAT_EMOJI[p.category] ?? "✨"}</span> {p.value}
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    p.source_context === "pro_public"
                      ? "bg-grn/15 text-grn"
                      : "bg-gold/15 text-gold"
                  }`}
                >
                  {p.source_context === "pro_public" ? "nommable" : "guide seulement"}
                </span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel2">
                <div
                  className="h-full bg-gradient-to-r from-pink to-gold"
                  style={{ width: `${(p.confidence ?? 0) * 100}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-muted">
                <span>confiance {Math.round((p.confidence ?? 0) * 100)}%</span>
                <span>giftability {Math.round((p.giftability ?? 0) * 100)}%</span>
              </div>
              {p.proof && <p className="mt-2 text-xs italic text-txt/70">« {p.proof} »</p>}
              {p.source_url && (
                <a
                  href={p.source_url}
                  target="_blank"
                  className="mt-1 block truncate text-[11px] text-blu hover:underline"
                >
                  {p.source_url}
                </a>
              )}
            </div>
          ))}
          {passions.length === 0 && !scanning && (
            <div className="col-span-2 rounded-2xl border border-dashed border-bdr p-10 text-center text-muted">
              Profil vierge. Lance un scan : Madeleine croise LinkedIn, interviews, podcasts et
              résultats sportifs publics, avec preuve pour chaque passion.
            </div>
          )}
          {scanning && (
            <div className="col-span-2 rounded-2xl border border-pink/30 bg-pink/5 p-6 text-sm text-pink pulse-soft">
              Résolution d&apos;identité → sources publiques → extraction des passions avec preuves →
              matching cadeau… (30-90s)
            </div>
          )}
        </div>

        <h2 className="mb-3 mt-8 text-lg font-semibold">Frise de la relation</h2>
        <div className="rounded-2xl border border-bdr bg-panel p-5">
          <div className="space-y-0">
            {journey.map((j, i) => (
              <div key={i} className="relative flex gap-4 pb-5 last:pb-0">
                {i < journey.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-px bg-bdr" />
                )}
                <div
                  className={`z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${
                    j.kind === "action" ? "bg-gold/15" : j.kind === "signal" ? "bg-pink/15" : "bg-panel2"
                  }`}
                >
                  {KIND_EMOJI[j.kind]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium capitalize">{j.label.replace(/_/g, " ")}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {new Date(j.at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    </span>
                  </div>
                  {j.detail && <p className="mt-0.5 text-xs text-muted">{j.detail}</p>}
                  {j.cost != null && <span className="text-xs text-gold">{j.cost}€</span>}
                </div>
              </div>
            ))}
            {journey.length === 0 && (
              <p className="text-sm text-muted">Aucune interaction enregistrée pour l&apos;instant.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

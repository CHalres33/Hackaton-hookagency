"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import type { GameState } from "@/lib/types";

const BADGES = [
  { icon: "🎯", name: "Premier geste" },
  { icon: "⚡", name: "10 signaux traités" },
  { icon: "🏆", name: "Chasseur légendaire" },
  { icon: "🔥", name: "Streak 7 jours" },
];

const XP_MAX = 500;

export default function Header() {
  const [game, setGame] = useState<GameState | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showCrm, setShowCrm] = useState(false);

  useEffect(() => {
    const load = () =>
      supabase.from("game_state").select("*").eq("id", 1).single().then(({ data }) => {
        if (data) setGame(data as GameState);
      });
    load();
    const ch = supabase
      .channel("game")
      .on("postgres_changes", { event: "*", schema: "public", table: "actions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const xp = game?.team_xp ?? 0;
  const level = Math.floor(xp / XP_MAX) + 1;
  const xpCurrent = xp % XP_MAX;

  return (
    <header className="sticky top-0 z-40 flex h-[66px] shrink-0 items-center gap-6 border-b border-bdr bg-bg/85 px-5 backdrop-blur">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="text-[23px] drop-shadow-[0_2px_6px_rgba(255,61,139,.4)]">🧁</span>
        <span className="font-head text-[19px] font-bold tracking-tight">Madeleine</span>
      </Link>

      <div className="flex items-center gap-2.5 pl-2">
        <div className="flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-gradient-to-br from-pink to-fuchsia-600 font-head text-xs font-bold shadow-[0_3px_10px_-2px_rgba(255,61,139,.6)]">
          {level}
        </div>
        <div className="flex w-[190px] flex-col gap-1">
          <div className="flex justify-between text-[10.5px] font-semibold text-muted">
            <span>XP ÉQUIPE · Niv. {level}</span>
            <span className="text-[#c9c9d2]">{xpCurrent} / {XP_MAX}</span>
          </div>
          <div className="h-[7px] overflow-hidden rounded-full bg-white/[.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink to-gold shadow-[0_0_12px_rgba(255,61,139,.6)] transition-all duration-700"
              style={{ width: `${(xpCurrent / XP_MAX) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div
        title="Notifications traitées < 24h"
        className="flex items-center gap-1.5 rounded-[10px] border border-orange/25 bg-orange/10 px-2.5 py-1.5"
      >
        <span className="text-[15px]">🔥</span>
        <span className="font-head text-sm font-bold text-[#ffb774]">{game?.streak ?? 0}</span>
        <span className="text-[10.5px] font-semibold text-[#c99a6a]">streak</span>
      </div>

      <div className="flex items-center gap-1.5">
        {BADGES.map((b) => (
          <div
            key={b.icon}
            title={b.name}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px] border border-gold/25 bg-gold/10 text-sm"
          >
            {b.icon}
          </div>
        ))}
      </div>

      <div className="flex-1" />

      <button
        onClick={() => setShowCrm(true)}
        className="whitespace-nowrap rounded-[11px] border border-white/[.14] bg-white/[.04] px-3.5 py-2 text-[13px] font-semibold text-txt/90 hover:bg-white/[.08]"
      >
        Connecter votre CRM
      </button>
      <button
        onClick={() => setShowAdd(true)}
        className="flex items-center gap-1.5 whitespace-nowrap rounded-[11px] bg-gradient-to-br from-pink to-[#e0247a] px-4 py-2 text-[13px] font-bold text-white shadow-[0_6px_18px_-6px_rgba(255,61,139,.7)] hover:opacity-95"
      >
        <span className="text-base leading-none">＋</span> Ajouter un prospect
      </button>

      <div className="flex h-[38px] w-[38px] items-center justify-center rounded-full border-[1.5px] border-white/[.14] bg-gradient-to-br from-[#3a3a44] to-[#22222a] text-[13px] font-bold">
        ML
      </div>

      {showAdd && <AddProspectModal onClose={() => setShowAdd(false)} />}
      {showCrm && <ConnectCrmModal onClose={() => setShowCrm(false)} />}
    </header>
  );
}

function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-bdr bg-panel p-6 slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function AddProspectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [state, setState] = useState<"idle" | "creating" | "scanning">("idle");

  async function submit() {
    if (!url.includes("linkedin.com/in/")) return alert("Colle une URL de profil LinkedIn (…/in/…)");
    setState("creating");
    const slug = url.split("/in/")[1]?.replace(/\/$/, "").split("?")[0] ?? "prospect";
    const guess = slug.replace(/-\w{6,}$/, "").split("-");
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        firstname: guess[0] ? guess[0][0].toUpperCase() + guess[0].slice(1) : "Prospect",
        lastname: guess.slice(1).join(" ") || "LinkedIn",
        linkedin_url: url,
      })
      .select("id")
      .single();
    if (error || !data) {
      alert(error?.message);
      setState("idle");
      return;
    }
    setState("scanning");
    fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_id: data.id }),
    });
    router.push(`/prospect/${data.id}`);
    onClose();
  }

  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold">Ajouter un prospect</h2>
      <p className="mt-1 text-sm text-muted">
        Colle une URL LinkedIn : Madeleine crée le contact dans le CRM, l&apos;enrichit et lance le
        scan passions.
      </p>
      <input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="https://www.linkedin.com/in/…"
        className="mt-4 w-full rounded-xl border border-bdr bg-panel2 px-4 py-2.5 text-sm outline-none focus:border-pink"
      />
      <button
        onClick={submit}
        disabled={state !== "idle"}
        className="mt-4 w-full rounded-xl bg-pink py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {state === "idle" ? "Créer et scanner" : state === "creating" ? "Création du contact…" : "Scan lancé…"}
      </button>
    </Modal>
  );
}

const CRMS = [
  { name: "HubSpot", color: "#ff7a59", connected: false },
  { name: "Pipedrive", color: "#1aae9f", connected: true },
  { name: "Salesforce", color: "#00a1e0", connected: false },
];

function ConnectCrmModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose}>
      <h2 className="text-lg font-semibold">Connecter votre CRM</h2>
      <p className="mt-1 text-sm text-muted">
        Madeleine est CRM-agnostic : les contacts, signaux et actions se synchronisent dans votre
        outil.
      </p>
      <div className="mt-4 space-y-2">
        {CRMS.map((c) => (
          <div
            key={c.name}
            className="flex items-center justify-between rounded-xl border border-bdr bg-panel2 px-4 py-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
                style={{ background: c.color }}
              >
                {c.name[0]}
              </span>
              <span className="text-sm font-medium">{c.name}</span>
            </div>
            {c.connected ? (
              <span className="text-sm text-grn">Connecté ✓</span>
            ) : (
              <button className="rounded-full border border-bdr px-3 py-1 text-xs text-muted hover:text-txt">
                Connecter
              </button>
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase-browser";
import type { GameState } from "@/lib/types";

const NAV = [
  { href: "/", label: "Fil d'actualité" },
  { href: "/validation", label: "File de validation" },
  { href: "/prospects", label: "Prospects" },
];

export default function Header() {
  const pathname = usePathname();
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
  const levelPct = xp % 500;

  return (
    <header className="sticky top-0 z-40 border-b border-bdr bg-bg/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-6 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="text-2xl">🧁</span> Madeleine
        </Link>

        <nav className="flex items-center gap-1 text-sm">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-full px-3 py-1.5 transition ${
                pathname === n.href
                  ? "bg-pink/15 text-pink"
                  : "text-muted hover:text-txt hover:bg-panel2"
              }`}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex flex-col">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="font-medium text-gold">⚡ {xp} XP</span>
                <span>🔥 streak {game?.streak ?? 0}</span>
                <span title="badges">{(game?.badges ?? []).slice(0, 3).join(" ")}</span>
              </div>
              <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-panel2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-pink to-gold transition-all"
                  style={{ width: `${(levelPct / 500) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowCrm(true)}
            className="rounded-full border border-bdr px-3 py-1.5 text-sm text-muted hover:text-txt"
          >
            Connecter votre CRM
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-full bg-pink px-4 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            + Ajouter un prospect
          </button>
        </div>
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

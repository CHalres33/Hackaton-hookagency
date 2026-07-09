import { CHANNEL_META, type Channel } from "@/lib/types";

const ORDER: Channel[] = ["email", "linkedin", "carte_manuscrite", "cadeau", "cadeau_legendaire"];

export default function EscalationLadder({ selected }: { selected: Channel }) {
  return (
    <div className="flex items-center gap-1">
      {ORDER.map((c, i) => {
        const active = c === selected;
        return (
          <div key={c} className="flex items-center gap-1">
            {i > 0 && <span className="text-xs text-muted">‹</span>}
            <span
              title={CHANNEL_META[c].label}
              className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] ${
                active
                  ? c === "cadeau_legendaire"
                    ? "bg-gold/20 text-gold font-semibold"
                    : "bg-pink/20 text-pink font-semibold"
                  : "bg-panel2 text-muted"
              }`}
            >
              {CHANNEL_META[c].emoji}
              {active && <span>{CHANNEL_META[c].label}</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

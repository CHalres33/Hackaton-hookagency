export type DisplayRarity = "commun" | "rare" | "epique" | "legendaire";

export function tierFromScore(score: number | null, fallback: string | null): DisplayRarity {
  if (score != null) {
    if (score >= 90) return "legendaire";
    if (score >= 70) return "epique";
    if (score >= 45) return "rare";
    return "commun";
  }
  return (fallback as DisplayRarity) ?? "commun";
}

export default function RarityBadge({
  rarity,
  score,
}: {
  rarity: "commun" | "rare" | "legendaire" | null;
  score: number | null;
}) {
  const tier = tierFromScore(score, rarity);
  const styles: Record<DisplayRarity, string> = {
    commun: "bg-panel2 text-muted",
    rare: "bg-blu/15 text-blu",
    epique: "bg-violet/15 text-violet",
    legendaire: "bg-gold/15 text-gold",
  };
  const labels: Record<DisplayRarity, string> = {
    commun: "Commun",
    rare: "Rare",
    epique: "Épique",
    legendaire: "★ Légendaire",
  };
  if (!rarity && score == null) return null;
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[tier]}`}>
      {labels[tier]}
      {score != null && <span className="opacity-70"> · {score}</span>}
    </span>
  );
}

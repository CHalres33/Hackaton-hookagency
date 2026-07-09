export default function RarityBadge({
  rarity,
  score,
}: {
  rarity: "commun" | "rare" | "legendaire" | null;
  score: number | null;
}) {
  const styles: Record<string, string> = {
    commun: "bg-panel2 text-muted",
    rare: "bg-blu/15 text-blu",
    legendaire: "bg-gold/15 text-gold",
  };
  const labels: Record<string, string> = {
    commun: "Commun",
    rare: "Rare",
    legendaire: "★ Légendaire",
  };
  if (!rarity && score == null) return null;
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[rarity ?? "commun"]}`}
    >
      {labels[rarity ?? "commun"]}
      {score != null && <span className="opacity-70"> · {score}</span>}
    </span>
  );
}

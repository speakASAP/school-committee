const TIER_STYLES: Record<string, string> = {
  gold:   "bg-yellow-100 text-yellow-800 border border-yellow-300",
  silver: "bg-gray-100 text-gray-700 border border-gray-300",
  bronze: "bg-orange-50 text-orange-700 border border-orange-200",
};

const TIER_EMOJI: Record<string, string> = {
  gold: "🥇", silver: "🥈", bronze: "🥉",
};

interface BadgeIconProps {
  achievementKey: string;
  tier: string;
  labelCs: string;
  size?: "sm" | "md";
}

export function BadgeIcon({ achievementKey: _key, tier, labelCs, size = "md" }: BadgeIconProps) {
  const style = TIER_STYLES[tier] ?? TIER_STYLES.bronze;
  const emoji = TIER_EMOJI[tier] ?? "🏅";
  const px = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${style} ${px}`}>
      <span>{emoji}</span>
      <span>{labelCs}</span>
    </span>
  );
}

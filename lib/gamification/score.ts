const TIER_POINTS: Record<string, number> = { gold: 3, silver: 2, bronze: 1 };

export function calcUserScore(
  achievements: { achievementKey?: string; tier?: string }[],
  tierMap: Record<string, string>,
): number {
  return achievements.reduce((sum, a) => {
    const tier = a.tier ?? (a.achievementKey ? tierMap[a.achievementKey] : undefined) ?? "bronze";
    return sum + (TIER_POINTS[tier] ?? 1);
  }, 0);
}

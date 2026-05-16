import { BadgeIcon } from "./BadgeIcon";

interface Achievement {
  key: string;
  tier: string;
  labelCs: string;
}

interface AchievementListProps {
  achievements: Achievement[];
}

export function AchievementList({ achievements }: AchievementListProps) {
  if (achievements.length === 0) {
    return <p className="text-sm text-gray-500">Zatím žádné odznaky.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {achievements.map((a) => (
        <BadgeIcon key={a.key} achievementKey={a.key} tier={a.tier} labelCs={a.labelCs} />
      ))}
    </div>
  );
}

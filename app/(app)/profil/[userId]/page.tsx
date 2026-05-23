"use client";
import { useState, useEffect, use } from "react";
import { AchievementList } from "@/components/gamification/AchievementList";
import { UserAvatar } from "@/components/UserAvatar";

interface ProfileData {
  userId: string;
  titleBefore: string | null;
  titleAfter: string | null;
  firstName: string;
  lastName: string;
  bio: string | null;
  avatarUrl: string | null;
  joinedAt: string;
  roles: string[];
  achievements: { key: string; tier: string; labelCs: string; awardedAt: string }[];
  stats: {
    ideasPosted: number;
    votesCast: number;
    commentsLeft: number;
    tasksCompleted: number;
  };
}

const ROLE_LABEL: Record<string, string> = {
  committee: "Člen výboru",
  teacher: "Učitel",
  school_staff: "Školní personál",
  admin: "Administrátor",
  parent: "Rodič",
};

export default function ProfilePage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/profile/${userId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then(setProfile)
      .catch(() => setError("Uživatel nebyl nalezen."))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <main className="max-w-xl mx-auto px-4 py-8"><p className="text-gray-400">Načítám...</p></main>;
  if (error || !profile) return <main className="max-w-xl mx-auto px-4 py-8"><p className="text-red-600">{error}</p></main>;

  return (
    <main className="max-w-xl mx-auto px-4 py-8">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <div className="flex items-center gap-4 mb-3">
          <UserAvatar avatarUrl={profile.avatarUrl} firstName={profile.firstName} lastName={profile.lastName} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {[profile.titleBefore, profile.firstName, profile.lastName, profile.titleAfter].filter(Boolean).join(" ")}
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Člen od {new Date(profile.joinedAt).toLocaleDateString("cs-CZ")}
            </p>
          </div>
        </div>

        {profile.roles.filter((r: string) => r !== "parent").length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {profile.roles.filter((r: string) => r !== "parent").map((r: string) => (
              <span key={r} className="rounded-full bg-blue-50 text-blue-700 px-3 py-0.5 text-xs font-medium border border-blue-200">
                {ROLE_LABEL[r] ?? r}
              </span>
            ))}
          </div>
        )}

        {profile.bio && (
          <p className="mt-4 text-sm text-gray-600 whitespace-pre-line leading-relaxed">{profile.bio}</p>
        )}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-900 mb-4">Odznaky ({profile.achievements.length})</h2>
        <AchievementList achievements={profile.achievements} />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        {(() => {
          const totalStars = profile.achievements.reduce(
            (s, a) => s + (a.tier === "gold" ? 3 : a.tier === "silver" ? 2 : 1),
            0
          );
          return (
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Statistiky</h2>
              <div className="text-right">
                <p className="text-yellow-500 font-bold text-lg leading-tight">
                  {"★".repeat(Math.min(totalStars, 10))}{totalStars > 10 ? `+${totalStars - 10}` : ""}
                </p>
                <p className="text-xs text-gray-400">{totalStars} hvězd celkem</p>
              </div>
            </div>
          );
        })()}
        <dl className="grid grid-cols-2 gap-4">
          <div>
            <dt className="text-xs text-gray-500">Nápady <span className="text-yellow-400">★★</span></dt>
            <dd className="text-xl font-bold text-gray-900">{profile.stats.ideasPosted}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Hlasy <span className="text-yellow-400">★★</span></dt>
            <dd className="text-xl font-bold text-gray-900">{profile.stats.votesCast}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Komentáře <span className="text-yellow-400">★</span></dt>
            <dd className="text-xl font-bold text-gray-900">{profile.stats.commentsLeft}</dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">Úkoly <span className="text-yellow-400">★★★</span></dt>
            <dd className="text-xl font-bold text-gray-900">{profile.stats.tasksCompleted}</dd>
          </div>
        </dl>
      </div>
    </main>
  );
}

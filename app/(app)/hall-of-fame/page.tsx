"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { BadgeIcon } from "@/components/gamification/BadgeIcon";
import { UserAvatar } from "@/components/UserAvatar";
import { formatName } from "@/lib/format-name";

const KNOWN_TIERS: Record<string, string> = {
  role_committee: "gold", role_teacher: "silver",
  idea_20: "gold", voter_50: "gold", task_champion_20: "gold", best_commenter: "gold", popular_idea_50: "gold",
  idea_5: "silver", voter_10: "silver", comment_10: "silver", task_champion_5: "silver", popular_idea_10: "silver",
};
function tierOf(key: string): string { return KNOWN_TIERS[key] ?? "bronze"; }

const KNOWN_LABELS: Record<string, string> = {
  registered: "Registrovaný",
  profile_complete: "Kompletní profil",
  child_added: "Přidal dítě",
  role_committee: "Člen výboru",
  role_teacher: "Učitel",
  idea_first: "První nápad",
  idea_5: "5 nápadů",
  idea_20: "20 nápadů",
  voter_first: "První hlas",
  voter_10: "10 hlasů",
  voter_50: "50 hlasů",
  comment_first: "První komentář",
  comment_10: "10 komentářů",
  popular_idea_10: "Oblíbený nápad (10)",
  popular_idea_50: "Oblíbený nápad (50)",
  task_accepted: "Přijal úkol",
  task_completed: "Splněný úkol",
  task_champion_5: "5 úkolů",
  task_champion_20: "20 úkolů",
  best_commenter: "Nejlepší komentátor",
  early_adopter: "Průkopník",
};

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

interface HofResponse {
  items: HofEntry[];
  currentUserId?: string | null;
  currentUserOptOut?: boolean;
}

interface HofEntry {
  rank: number;
  userId: string;
  titleBefore: string | null;
  titleAfter: string | null;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  score: number;
  achievementKeys: string[];
}

export default function HallOfFamePage() {
  const [entries, setEntries] = useState<HofEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [optOut, setOptOut] = useState(false);
  const [optOutSaving, setOptOutSaving] = useState(false);
  const [optOutError, setOptOutError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/hall-of-fame")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d: HofResponse) => {
        setEntries(d.items ?? []);
        setCurrentUserId(d.currentUserId ?? null);
        setOptOut(d.currentUserOptOut ?? false);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleOptOut(next: boolean) {
    setOptOutSaving(true);
    setOptOutError(null);
    const previous = optOut;
    setOptOut(next);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ hallOfFameOptOut: next }),
      });
      if (!res.ok) {
        setOptOut(previous);
        setOptOutError("Uložení selhalo. Zkuste to prosím znovu.");
        return;
      }
      load();
    } catch {
      setOptOut(previous);
      setOptOutError("Chyba sítě. Zkuste to prosím znovu.");
    } finally {
      setOptOutSaving(false);
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Síň slávy</h1>
      <p className="text-sm text-gray-500 mb-6">Nejaktivnější členové komunity</p>

      {loading && <p className="text-gray-400 text-sm">Načítám...</p>}

      {!loading && optOut && (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 mb-4">
          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
              checked
              disabled={optOutSaving}
              onChange={() => toggleOptOut(false)}
            />
            <span className="text-sm text-gray-700">
              Jste skrytý ze Síně slávy
              <span className="block text-xs text-gray-400">Odškrtnutím se do žebříčku vrátíte.</span>
            </span>
          </label>
          {optOutError && <p className="text-red-600 text-xs mt-2">{optOutError}</p>}
        </div>
      )}

      <div className="space-y-3">
        {entries.map((e) => (
          <div key={e.userId} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:shadow-md transition-shadow">
            <Link href={`/profil/${e.userId}`} className="flex items-center gap-4 p-4">
              <span className="text-xl font-bold w-8 text-center shrink-0">
                {e.rank <= 3 ? RANK_MEDAL[e.rank - 1] : `#${e.rank}`}
              </span>
              <UserAvatar avatarUrl={e.avatarUrl} firstName={e.firstName} lastName={e.lastName} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">
                  {formatName(e)}
                </p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {e.achievementKeys.slice(0, 5).map((k) => (
                    <BadgeIcon key={k} achievementKey={k} tier={tierOf(k)} labelCs={KNOWN_LABELS[k] ?? k} size="sm" />
                  ))}
                  {e.achievementKeys.length > 5 && (
                    <span className="text-xs text-gray-400">+{e.achievementKeys.length - 5}</span>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="font-bold text-yellow-500 text-lg leading-tight">
                  {"★".repeat(Math.min(e.score, 10))}{e.score > 10 ? `+${e.score - 10}` : ""}
                </p>
                <p className="text-xs text-gray-400">{e.score} hvězd</p>
              </div>
            </Link>
            {e.userId === currentUserId && (
              <label className="flex items-center gap-2 border-t border-gray-100 px-4 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-400"
                  checked={optOut}
                  disabled={optOutSaving}
                  onChange={(ev) => toggleOptOut(ev.target.checked)}
                />
                <span className="text-xs text-gray-500">Skrýt mě ze Síně slávy</span>
                {optOutError && <span className="text-xs text-red-600">{optOutError}</span>}
              </label>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}

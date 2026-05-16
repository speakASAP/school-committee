"use client";
import { useState, useEffect, useCallback } from "react";
import { IdeaCard } from "@/components/ideas/IdeaCard";
import { CreateIdeaModal } from "@/components/ideas/CreateIdeaModal";

interface IdeaItem {
  id: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  authorId: string | null;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  hasVoted: boolean;
}

export default function IdeasPage() {
  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d?.user?.id) { setIsAuthenticated(true); setCurrentUserId(d.user.id); }
      })
      .catch(() => {});
  }, []);

  const loadIdeas = useCallback(async (cursor?: string) => {
    const url = `/api/ideas${cursor ? `?cursor=${cursor}` : ""}`;
    const res = await fetch(url);
    if (!res.ok) return;
    const data = await res.json() as { items: IdeaItem[]; nextCursor: string | null };
    setIdeas((prev) => cursor ? [...prev, ...data.items] : data.items);
    setNextCursor(data.nextCursor);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadIdeas().finally(() => setLoading(false));
  }, [loadIdeas]);

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nápady</h1>
          <p className="text-sm text-gray-500 mt-1">Hlasujte pro nápady a přidávejte vlastní</p>
        </div>
        {isAuthenticated && (
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
          >
            + Přidat nápad
          </button>
        )}
      </div>

      {loading && <p className="text-sm text-gray-400">Načítám nápady...</p>}

      <div className="space-y-3">
        {ideas.map((idea) => (
          <IdeaCard
            key={idea.id}
            id={idea.id}
            title={idea.title}
            description={idea.description}
            isAnonymous={idea.isAnonymous}
            authorId={idea.authorId}
            voteCount={idea.voteCount}
            commentCount={idea.commentCount}
            createdAt={idea.createdAt}
            hasVoted={idea.hasVoted}
            isOwnIdea={isAuthenticated && idea.authorId === currentUserId}
            isAuthenticated={isAuthenticated}
          />
        ))}
      </div>

      {nextCursor && (
        <button
          onClick={() => loadIdeas(nextCursor)}
          className="mt-6 w-full rounded-xl border border-gray-300 py-2 text-sm text-gray-600 hover:bg-gray-50"
        >
          Načíst další
        </button>
      )}

      <CreateIdeaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={() => { setIdeas([]); loadIdeas(); }}
      />
    </main>
  );
}

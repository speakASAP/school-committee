"use client";
import { useState, useEffect, use } from "react";
import Link from "next/link";
import { VoteButton } from "@/components/ideas/VoteButton";
import { CommentThread } from "@/components/ideas/CommentThread";

interface Idea {
  id: string;
  title: string;
  description: string;
  isAnonymous: boolean;
  authorId: string | null;
  voteCount: number;
  commentCount: number;
  createdAt: string;
  voiceTranscript: string | null;
  photos: { fileId: string; fileExt: string }[];
  videos: { fileId: string; fileExt: string }[];
  hasVoted?: boolean;
}

export default function IdeaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [idea, setIdea] = useState<Idea | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d?.user?.id) { setIsAuthenticated(true); setCurrentUserId(d.user.id); } })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/ideas/${id}`)
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((d: Idea) => { setIdea(d); setHasVoted(d.hasVoted ?? false); })
      .catch(() => setError("Nápad nebyl nalezen."))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!isAuthenticated || !idea || idea.isAnonymous || !idea.authorId) return;
    fetch(`/api/profile/${idea.authorId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d: { firstName: string; lastName: string } | null) => {
        if (d?.firstName != null) setAuthorName(`${d.firstName} ${d.lastName}`);
      })
      .catch(() => {});
  }, [isAuthenticated, idea]);

  if (loading) return <main className="max-w-2xl mx-auto px-4 py-8"><p className="text-gray-400">Načítám...</p></main>;
  if (error || !idea) return <main className="max-w-2xl mx-auto px-4 py-8"><p className="text-red-600">{error ?? "Chyba"}</p></main>;

  const displayAuthor = !isAuthenticated ? "Anonymní" : (idea.isAnonymous ? "Anonymní" : (authorName ?? "..."));
  const isOwnIdea = isAuthenticated && idea.authorId === currentUserId;

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <Link href="/ideas" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Zpět na nápady</Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-2">{idea.title}</h1>
      <p className="text-xs text-gray-400 mb-4">
        {displayAuthor} · {new Date(idea.createdAt).toLocaleDateString("cs-CZ")}
      </p>

      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{idea.description}</p>

      {idea.voiceTranscript && (
        <div className="rounded-lg bg-gray-50 p-3 mb-4 text-sm text-gray-600 italic">
          🎙 {idea.voiceTranscript}
        </div>
      )}

      {idea.photos.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {idea.photos.map((p, i) => (
            <img
              key={i}
              src={`/api/storage/file/ideas/photos/${p.fileId}.${p.fileExt}`}
              alt=""
              className="h-32 w-32 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      {idea.videos.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-4">
          {idea.videos.map((v, i) => (
            <video
              key={i}
              src={`/api/storage/file/ideas/videos/${v.fileId}.${v.fileExt}`}
              controls
              className="h-32 w-32 object-cover rounded-lg"
            />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mb-6">
        <VoteButton
          ideaId={idea.id}
          initialCount={idea.voteCount}
          initialVoted={hasVoted}
          disabled={!isAuthenticated || isOwnIdea}
        />
        {!isAuthenticated && (
          <Link href="/login" className="text-sm text-blue-600 hover:underline">Přihlaste se pro hlasování</Link>
        )}
      </div>

      {isAuthenticated ? (
        <CommentThread ideaId={idea.id} />
      ) : (
        <div className="rounded-lg border border-gray-200 p-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-blue-600 hover:underline">Přihlaste se</Link> pro zobrazení diskuse
        </div>
      )}
    </main>
  );
}

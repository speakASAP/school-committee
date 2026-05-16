"use client";
import { useState, useEffect } from "react";

interface AdminIdea {
  id: string;
  title: string;
  submittedBy: string | null;
  isAnonymous: boolean;
  voteCount: number;
  commentCount: number;
  status: string;
  createdAt: string;
}

export default function AdminIdeasPage() {
  const [ideas, setIdeas] = useState<AdminIdea[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/ideas?limit=200")
      .then((r) => r.ok ? r.json() : { items: [] })
      .then((d: { items: AdminIdea[] }) => setIdeas(d.items))
      .finally(() => setLoading(false));
  }, []);

  async function deleteIdea(id: string) {
    if (!confirm("Smazat tento nápad?")) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/ideas/${id}`, { method: "DELETE" });
      if (res.ok) setIdeas((prev) => prev.filter((i) => i.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-6">Správa nápadů</h1>

      {loading && <p className="text-gray-400">Načítám...</p>}

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left border-b border-gray-200 text-gray-600">
            <th className="py-2 pr-4">Název</th>
            <th className="py-2 pr-4">Autor</th>
            <th className="py-2 pr-4 text-center">Hlasy</th>
            <th className="py-2 pr-4 text-center">Komentáře</th>
            <th className="py-2 pr-4">Datum</th>
            <th className="py-2"></th>
          </tr>
        </thead>
        <tbody>
          {ideas.map((idea) => (
            <tr key={idea.id} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="py-2 pr-4 font-medium text-gray-900 max-w-xs truncate">{idea.title}</td>
              <td className="py-2 pr-4 text-gray-500">{idea.isAnonymous ? "Anonymní" : (idea.submittedBy ?? "–")}</td>
              <td className="py-2 pr-4 text-center">{idea.voteCount}</td>
              <td className="py-2 pr-4 text-center">{idea.commentCount}</td>
              <td className="py-2 pr-4 text-gray-400">{new Date(idea.createdAt).toLocaleDateString("cs-CZ")}</td>
              <td className="py-2">
                <button
                  onClick={() => deleteIdea(idea.id)}
                  disabled={deletingId === idea.id}
                  className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                >
                  {deletingId === idea.id ? "..." : "Smazat"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

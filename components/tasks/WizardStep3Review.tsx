"use client";
import { useState, useEffect } from "react";

interface DraftTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  deadline?: string;
  rawTranscript?: string;
  photos: { id: string; fileId: string }[];
  videos: { id: string; fileId: string }[];
  aiFailed?: boolean;
}

interface WizardStep3ReviewProps {
  draft: DraftTask;
  schoolId: string;
  tenantId: string;
  onPublished: () => void;
  onRedo: () => void;
}

export function WizardStep3Review({ draft, schoolId, tenantId, onPublished, onRedo }: WizardStep3ReviewProps) {
  const [title, setTitle] = useState(draft.title);
  const [description, setDescription] = useState(draft.description);
  const [priority, setPriority] = useState(draft.priority);
  const [deadline, setDeadline] = useState(draft.deadline ?? "");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [videoUrls, setVideoUrls] = useState<string[]>([]);

  useEffect(() => {
    if (!draft.photos.length && !draft.videos.length) return;
    fetch(`/api/tasks/${draft.id}/media-urls`)
      .then((r) => r.ok ? r.json() as Promise<{ photos: { url: string }[]; videos: { url: string }[] }> : Promise.reject())
      .then(({ photos, videos }) => {
        setPhotoUrls(photos.map((p) => p.url));
        setVideoUrls(videos.map((v) => v.url));
      })
      .catch(() => {});
  }, [draft.id, draft.photos.length, draft.videos.length]);

  async function publish() {
    setPublishing(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${draft.id}/publish`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, priority, deadline: deadline || undefined, tenantId, schoolId }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Publikování selhalo");
      }
      onPublished();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {draft.aiFailed && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
          AI formátování selhalo — upravte úkol ručně před publikováním.
        </div>
      )}

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Název úkolu</label>
        <input
          className="w-full rounded-lg border border-gray-200 p-3 text-sm focus:outline-none focus:border-blue-400"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={80}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Popis</label>
        <textarea
          className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
          rows={5}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Priorita</label>
          <select
            className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:outline-none"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="low">Nízká</option>
            <option value="normal">Normální</option>
            <option value="high">Vysoká</option>
          </select>
        </div>
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Termín</label>
          <input
            type="date"
            className="w-full rounded-lg border border-gray-200 p-2 text-sm focus:outline-none"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
          />
        </div>
      </div>

      {draft.photos.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Fotografie ({draft.photos.length})</p>
          {photoUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photoUrls.map((url, i) => (
                <img key={i} src={url} alt="" className="rounded-lg object-cover w-full aspect-square border border-gray-200" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nahráno a připraveno k publikaci.</p>
          )}
        </div>
      )}
      {draft.videos.length > 0 && (
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">Videa ({draft.videos.length})</p>
          {videoUrls.length > 0 ? (
            <div className="flex flex-col gap-2">
              {videoUrls.map((url, i) => (
                <video key={i} src={url} controls className="rounded-lg w-full border border-gray-200" />
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Nahráno a připraveno k publikaci.</p>
          )}
        </div>
      )}

      {draft.rawTranscript && (
        <div>
          <button type="button" onClick={() => setShowTranscript(!showTranscript)} className="text-xs text-gray-400 hover:underline">
            {showTranscript ? "Skrýt přepis" : "Zobrazit přepis"}
          </button>
          {showTranscript && (
            <p className="mt-1 text-xs text-gray-500 bg-gray-50 rounded p-2 whitespace-pre-wrap">{draft.rawTranscript}</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onRedo} className="flex-1 py-3 rounded-xl border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Přenahrát
        </button>
        <button
          type="button"
          onClick={publish}
          disabled={publishing || !title.trim() || !description.trim()}
          className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
        >
          {publishing ? "Publikuji..." : "Publikovat úkol"}
        </button>
      </div>
    </div>
  );
}

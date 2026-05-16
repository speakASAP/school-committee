"use client";
import { useState, useCallback } from "react";
import { MediaUploader } from "@/components/tasks/MediaUploader";
import { useVoiceRecorder } from "@/lib/hooks/use-voice-recorder";

interface CreateIdeaModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateIdeaModal({ open, onClose, onCreated }: CreateIdeaModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [photoKeys, setPhotoKeys] = useState<string[]>([]);
  const [videoKeys, setVideoKeys] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { state: voiceState, fileKey: voiceKey, start: startVoice, stop: stopVoice, clear: clearVoice } = useVoiceRecorder();

  const handlePhotoKeys = useCallback((keys: string[]) => setPhotoKeys(keys), []);
  const handleVideoKeys = useCallback((keys: string[]) => setVideoKeys(keys), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("Název je povinný"); return; }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/ideas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          isAnonymous,
          voiceFileKey: voiceKey ?? undefined,
          photoFileKeys: photoKeys,
          videoFileKeys: videoKeys,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: { message?: string } };
        throw new Error(d.error?.message ?? "Chyba při odeslání");
      }
      setTitle(""); setDescription(""); setIsAnonymous(false);
      setPhotoKeys([]); setVideoKeys([]);
      clearVoice();
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba");
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nový nápad</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Název *</label>
            <input
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Krátký název nápadu"
              maxLength={200}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Popis</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Popište svůj nápad..."
            />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Fotografie</p>
            <MediaUploader type="photo" onFilesChange={handlePhotoKeys} maxFiles={5} />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Video</p>
            <MediaUploader type="video" onFilesChange={handleVideoKeys} maxFiles={2} />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 mb-1">Hlasová zpráva</p>
            <div className="flex items-center gap-2">
              {voiceState === "idle" && (
                <button type="button" onClick={startVoice} className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm hover:bg-gray-200">
                  🎙 Nahrát hlas
                </button>
              )}
              {voiceState === "recording" && (
                <button type="button" onClick={stopVoice} className="rounded-lg bg-red-100 text-red-700 px-3 py-1.5 text-sm animate-pulse">
                  ⏹ Zastavit
                </button>
              )}
              {voiceState === "uploading" && (
                <span className="text-sm text-gray-400">Nahrávám...</span>
              )}
              {voiceState === "done" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-600">✓ Hlasová zpráva nahrána</span>
                  <button type="button" onClick={clearVoice} className="text-xs text-gray-400 underline">Odebrat</button>
                </div>
              )}
              {voiceState === "error" && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Chyba nahrávání</span>
                  <button type="button" onClick={clearVoice} className="text-xs text-gray-400 underline">Zkusit znovu</button>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isAnonymous"
              checked={isAnonymous}
              onChange={(e) => setIsAnonymous(e.target.checked)}
              className="rounded"
            />
            <label htmlFor="isAnonymous" className="text-sm text-gray-700">
              Zveřejnit anonymně (nápad nebude počítán do vašich hvězd)
            </label>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
              Zrušit
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Odesílám..." : "Přidat nápad"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

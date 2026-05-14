"use client";
import { useState, useRef } from "react";

interface VoiceRecorderProps {
  onUploaded: (fileKey: string) => void;
  disabled?: boolean;
}

type RecordState = "idle" | "recording" | "uploading" | "done" | "error";

export function VoiceRecorder({ onUploaded, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordState>("idle");
  const [error, setError] = useState<string | null>(null);
  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  async function start() {
    setError(null);
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream, { mimeType: "audio/webm" });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      await upload(new Blob(chunksRef.current, { type: "audio/webm" }));
    };
    rec.start();
    mediaRef.current = rec;
    setState("recording");
  }

  function stop() {
    mediaRef.current?.stop();
    setState("uploading");
  }

  async function upload(blob: Blob) {
    try {
      const urlRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: "audio/webm", sizeBytes: blob.size }),
      });
      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, fileKey } = await urlRes.json() as { uploadUrl: string; fileKey: string };
      const putRes = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": "audio/webm" } });
      if (!putRes.ok) throw new Error("Upload failed");
      setState("done");
      onUploaded(fileKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      {state === "idle" && (
        <button
          type="button"
          onClick={start}
          disabled={disabled}
          className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold disabled:opacity-50"
        >
          Začít nahrávat
        </button>
      )}
      {state === "recording" && (
        <button type="button" onClick={stop} className="px-4 py-2 rounded-lg bg-gray-700 text-white font-semibold animate-pulse">
          Zastavit nahrávání
        </button>
      )}
      {state === "uploading" && <p className="text-sm text-gray-500">Nahrávám...</p>}
      {state === "done" && <p className="text-sm text-green-600">Hlas nahrán</p>}
      {state === "error" && <p className="text-sm text-red-600">Chyba: {error}</p>}
    </div>
  );
}

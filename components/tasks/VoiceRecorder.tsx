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
    console.log("[VoiceRecorder] start: requesting microphone");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error("[VoiceRecorder] start: microphone error", err);
      setError("Microphone access denied");
      setState("error");
      return;
    }
    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg"
      : "audio/mp4";
    console.log("[VoiceRecorder] start: mimeType selected", mimeType);
    const rec = new MediaRecorder(stream, { mimeType });
    chunksRef.current = [];
    rec.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType });
      console.log("[VoiceRecorder] onstop: blob size", blob.size, "type", blob.type);
      await upload(blob, mimeType);
    };
    rec.start();
    mediaRef.current = rec;
    setState("recording");
  }

  function stop() {
    console.log("[VoiceRecorder] stop called");
    mediaRef.current?.stop();
    setState("uploading");
  }

  async function upload(blob: Blob, mimeType: string) {
    console.log("[VoiceRecorder] upload: fetching presigned URL, contentType=", mimeType, "size=", blob.size);
    try {
      const urlRes = await fetch("/api/storage/upload-url", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contentType: mimeType, sizeBytes: blob.size }),
      });
      console.log("[VoiceRecorder] upload: upload-url response status", urlRes.status, urlRes.ok);
      if (!urlRes.ok) {
        const body = await urlRes.text();
        console.error("[VoiceRecorder] upload: upload-url error body", body);
        throw new Error("Failed to get upload URL");
      }
      const { uploadUrl, fileKey } = await urlRes.json() as { uploadUrl: string; fileKey: string };
      console.log("[VoiceRecorder] upload: got uploadUrl", uploadUrl, "fileKey", fileKey);
      const putRes = await fetch(uploadUrl, { method: "PUT", body: blob, headers: { "Content-Type": mimeType } });
      console.log("[VoiceRecorder] upload: PUT response status", putRes.status, putRes.ok);
      if (!putRes.ok) {
        const body = await putRes.text();
        console.error("[VoiceRecorder] upload: PUT error body", body);
        throw new Error("Upload failed");
      }
      setState("done");
      onUploaded(fileKey);
    } catch (err) {
      console.error("[VoiceRecorder] upload: caught error", err);
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

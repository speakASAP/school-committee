"use client";
import { useState, useRef, useCallback } from "react";

export type RecorderState = "idle" | "recording" | "recorded" | "uploading" | "done" | "error";

export interface VoiceRecorderResult {
  state: RecorderState;
  seconds: number;
  errorMsg: string | null;
  fileKey: string | null;
  start: () => Promise<void>;
  stop: () => void;
  clear: () => void;
}

export function useVoiceRecorder(): VoiceRecorderResult {
  const [state, setState] = useState<RecorderState>("idle");
  const [seconds, setSeconds] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState<string | null>(null);

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = useCallback(() => {
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRef.current = null;
    chunksRef.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    setState("idle");
    setSeconds(0);
    setErrorMsg(null);
    setFileKey(null);
  }, []);

  const stop = useCallback(() => {
    mediaRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
  }, []);

  const start = useCallback(async () => {
    setErrorMsg(null);
    setFileKey(null);
    chunksRef.current = [];

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMsg("Přístup k mikrofonu byl odepřen");
      setState("error");
      return;
    }

    const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm"
      : MediaRecorder.isTypeSupported("audio/ogg") ? "audio/ogg"
      : "audio/mp4";

    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRef.current = recorder;
    setState("recording");
    setSeconds(0);

    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      setState("uploading");

      const blob = new Blob(chunksRef.current, { type: mimeType });

      try {
        // Get presigned upload URL
        const urlRes = await fetch("/api/storage/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType: mimeType, sizeBytes: blob.size }),
        });
        if (!urlRes.ok) throw new Error("Nepodařilo se získat URL pro nahrání");
        const { uploadUrl, fileKey: key } = (await urlRes.json()) as { uploadUrl: string; fileKey: string };

        // Upload directly to MinIO
        const upload = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "content-type": mimeType },
          body: blob,
        });
        if (!upload.ok) throw new Error("Nahrávání selhalo");

        setFileKey(key);
        setState("done");
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : "Nahrávání selhalo");
        setState("error");
      }
    };

    recorder.start();
  }, []);

  return { state, seconds, errorMsg, fileKey, start, stop, clear };
}

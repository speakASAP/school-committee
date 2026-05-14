"use client";
import { useState } from "react";

type MediaType = "photo" | "video";

interface UploadedFile {
  fileKey: string;
  name: string;
  previewUrl?: string;
}

interface MediaUploaderProps {
  type: MediaType;
  onFilesChange: (fileKeys: string[]) => void;
  maxFiles?: number;
}

const ACCEPT: Record<MediaType, string> = {
  photo: "image/jpeg,image/png,image/webp",
  video: "video/mp4,video/webm,video/quicktime",
};

const MAX_MB: Record<MediaType, number> = { photo: 20, video: 100 };

export function MediaUploader({ type, onFilesChange, maxFiles = 10 }: MediaUploaderProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (!selected.length) return;
    setError(null);
    setUploading(true);
    try {
      const results: UploadedFile[] = [];
      for (const file of selected) {
        if (file.size > MAX_MB[type] * 1024 * 1024) {
          setError(`${file.name} je příliš velký (max ${MAX_MB[type]} MB)`);
          continue;
        }
        const contentType = file.type;
        const urlRes = await fetch("/api/storage/upload-url/media", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ contentType, sizeBytes: file.size }),
        });
        if (!urlRes.ok) throw new Error(`Failed to get upload URL for ${file.name}`);
        const { uploadUrl, fileKey } = await urlRes.json() as { uploadUrl: string; fileKey: string };
        const putRes = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "Content-Type": contentType } });
        if (!putRes.ok) throw new Error(`Upload failed for ${file.name}`);
        results.push({
          fileKey,
          name: file.name,
          previewUrl: type === "photo" ? URL.createObjectURL(file) : undefined,
        });
      }
      const updated = [...files, ...results].slice(0, maxFiles);
      setFiles(updated);
      onFilesChange(updated.map((f) => f.fileKey));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nahrávání selhalo");
    } finally {
      setUploading(false);
    }
  }

  function remove(fileKey: string) {
    const updated = files.filter((f) => f.fileKey !== fileKey);
    setFiles(updated);
    onFilesChange(updated.map((f) => f.fileKey));
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-gray-300 text-sm text-gray-600 hover:border-blue-400 hover:text-blue-600">
        <input type="file" accept={ACCEPT[type]} multiple onChange={handleChange} className="hidden" disabled={uploading || files.length >= maxFiles} />
        {uploading ? "Nahrávám..." : type === "photo" ? "+ Přidat fotky" : "+ Přidat videa"}
      </label>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {files.map((f) => (
          <div key={f.fileKey} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
            {f.previewUrl
              ? <img src={f.previewUrl} alt={f.name} className="object-cover w-full h-full" />
              : <span className="text-xs text-center text-gray-500 px-1 truncate">{f.name}</span>
            }
            <button
              type="button"
              onClick={() => remove(f.fileKey)}
              className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-4 h-4 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100"
            >x</button>
          </div>
        ))}
      </div>
    </div>
  );
}

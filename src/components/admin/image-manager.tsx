"use client";

import { useRef, useState } from "react";
import { Button, Input } from "@/components/ui";

export function ImageManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function add(url: string) {
    if (!url.trim()) return;
    if (value.includes(url.trim())) return;
    onChange([...value, url.trim()]);
  }

  function remove(url: string) {
    onChange(value.filter((u) => u !== url));
  }

  async function uploadFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError(null);
    const next = [...value];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (res.ok && data.url) next.push(data.url);
      else setError(data.error ?? "فشل رفع الصورة");
    }
    onChange(next);
    setBusy(false);
  }

  return (
    <div className="space-y-3">
      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => uploadFiles(e.target.files)} />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" onClick={() => fileInputRef.current?.click()} disabled={busy}>
          {busy ? "جاري الرفع..." : "رفع صور"}
        </Button>
      </div>
      <div className="flex gap-2">
        <Input value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="أو ألصق رابط صورة..." />
        <Button type="button" variant="secondary" onClick={() => { add(urlInput); setUrlInput(""); }}>
          إضافة
        </Button>
      </div>
      {error ? <p className="text-xs font-semibold text-rose-600">{error}</p> : null}
      {value.length > 0 ? (
        <div className="grid grid-cols-4 gap-2">
          {value.map((url, i) => (
            <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border border-zinc-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => remove(url)}
                className="absolute top-1 left-1 rounded-full bg-rose-600 px-1.5 text-xs font-black text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">لا صور بعد — الصورة الأولى تظهر في الكتالوج</p>
      )}
    </div>
  );
}
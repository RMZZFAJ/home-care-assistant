"use client";

import Image from "next/image";
import { useState } from "react";

export function ProfileAvatar({ name, imageUrl }: { name?: string; imageUrl?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const words = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const initials = (words.length > 1 ? [words[0], words.at(-1)!] : words).map(word => Array.from(word)[0]).join("").toLocaleUpperCase("pt-BR") || "?";
  return <span className="hca-avatar" aria-hidden="true">{imageUrl && failedUrl !== imageUrl
    ? <Image src={imageUrl} alt="" width={34} height={34} unoptimized onError={() => setFailedUrl(imageUrl)} />
    : initials}</span>;
}

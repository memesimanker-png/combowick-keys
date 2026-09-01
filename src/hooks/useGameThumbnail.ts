import { useState, useEffect } from "react";
import { fetchGameThumbnailByUniverseId } from "@/lib/roblox-thumbnails";

export function useGameThumbnail(universeId: number | null | undefined) {
  const [thumbnail, setThumbnail] = useState<string | null>(null);

  useEffect(() => {
    if (!universeId) return;
    let cancelled = false;
    fetchGameThumbnailByUniverseId(universeId).then((url) => {
      if (!cancelled) setThumbnail(url);
    });
    return () => { cancelled = true; };
  }, [universeId]);

  return thumbnail;
}

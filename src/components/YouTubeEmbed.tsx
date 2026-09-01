import { useCallback, useEffect, useMemo, useState } from "react";
import { Play } from "lucide-react";

interface YouTubeEmbedProps {
  url: string;
}

const RETURNING_VIDEOS_STORAGE_KEY = "combo-wick-youtube-seen";
const YOUTUBE_CONNECTIONS = [
  "https://www.youtube-nocookie.com",
  "https://www.google.com",
  "https://i.ytimg.com",
];

let youtubeConnectionsWarmed = false;

function warmYouTubeConnections() {
  if (typeof document === "undefined" || youtubeConnectionsWarmed) return;

  YOUTUBE_CONNECTIONS.forEach((href) => {
    if (document.head.querySelector(`link[data-youtube-preconnect=\"${href}\"]`)) return;

    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = href;
    link.crossOrigin = "anonymous";
    link.setAttribute("data-youtube-preconnect", href);
    document.head.appendChild(link);
  });

  youtubeConnectionsWarmed = true;
}

function hasSeenVideo(videoId: string) {
  if (typeof window === "undefined") return false;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RETURNING_VIDEOS_STORAGE_KEY) || "[]");
    return Array.isArray(parsed) && parsed.includes(videoId);
  } catch {
    return false;
  }
}

function rememberVideo(videoId: string) {
  if (typeof window === "undefined") return;

  try {
    const parsed = JSON.parse(window.localStorage.getItem(RETURNING_VIDEOS_STORAGE_KEY) || "[]");
    const next = Array.isArray(parsed) ? parsed.filter((value) => typeof value === "string") : [];
    if (!next.includes(videoId)) next.push(videoId);
    window.localStorage.setItem(RETURNING_VIDEOS_STORAGE_KEY, JSON.stringify(next.slice(-12)));
  } catch {
    window.localStorage.setItem(RETURNING_VIDEOS_STORAGE_KEY, JSON.stringify([videoId]));
  }
}

function getVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&\n?#]+)/,
    /(?:youtu\.be\/)([^&\n?#]+)/,
    /(?:youtube\.com\/embed\/)([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

export function YouTubeEmbed({ url }: YouTubeEmbedProps) {
  const videoId = getVideoId(url);
  const [active, setActive] = useState(false);
  const [thumbnailSrc, setThumbnailSrc] = useState(() =>
    videoId ? `https://i.ytimg.com/vi_webp/${videoId}/hqdefault.webp` : ""
  );

  const isReturningVisitor = useMemo(
    () => (videoId ? hasSeenVideo(videoId) : false),
    [videoId]
  );

  useEffect(() => {
    if (!videoId) return;
    setThumbnailSrc(`https://i.ytimg.com/vi_webp/${videoId}/hqdefault.webp`);
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !isReturningVisitor) return;

    warmYouTubeConnections();

    const img = new Image();
    img.decoding = "async";
    img.src = `https://i.ytimg.com/vi_webp/${videoId}/hqdefault.webp`;
  }, [isReturningVisitor, videoId]);

  const warm = useCallback(() => {
    warmYouTubeConnections();
  }, []);

  const activate = useCallback(() => {
    if (!videoId) return;
    rememberVideo(videoId);
    warmYouTubeConnections();
    setActive(true);
  }, [videoId]);

  if (!videoId) return null;

  if (active) {
    return (
      <div className="relative w-full aspect-video rounded-lg overflow-hidden">
        <iframe
          className="absolute inset-0 w-full h-full"
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
          title="Video Tutorial"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="eager"
        />
      </div>
    );
  }

  return (
    <button
      onClick={activate}
      onMouseEnter={warm}
      onFocus={warm}
      onTouchStart={warm}
      className="relative w-full aspect-video rounded-lg overflow-hidden group cursor-pointer bg-secondary"
      aria-label="Play video tutorial"
    >
      <img
        src={thumbnailSrc}
        alt="Video thumbnail"
        className="w-full h-full object-cover"
        loading="eager"
        decoding="async"
        fetchPriority="high"
        onError={() => setThumbnailSrc(`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`)}
      />
      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/30 transition-colors flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/90 flex items-center justify-center group-hover:scale-110 transition-transform">
          <Play className="h-7 w-7 text-primary-foreground ml-1" />
        </div>
      </div>
    </button>
  );
}

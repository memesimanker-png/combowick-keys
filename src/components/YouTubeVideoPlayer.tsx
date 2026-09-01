import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface YouTubeVideoPlayerProps {
  step: string;
  onTimerComplete?: () => void;
  timerSeconds?: number;
}

const FALLBACK = ["srCkA0m-620", "uTzha7s7Or8", "HzD4Eg2f7G8"];
const STEP_INDEX: Record<string, number> = {
  "provider-select": 0,
  step1: 0,
  step2: 1,
  step3: 2,
};

let cachedVideos: string[] | null = null;
let inflight: Promise<string[]> | null = null;

async function getVideos(): Promise<string[]> {
  if (cachedVideos) return cachedVideos;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const { data } = await supabase.functions.invoke("yt-latest");
      const ids = (data?.videos ?? []).map((v: any) => v.id).filter(Boolean);
      cachedVideos = ids.length ? ids : FALLBACK;
    } catch {
      cachedVideos = FALLBACK;
    }
    return cachedVideos!;
  })();
  return inflight;
}

export function YouTubeVideoPlayer({ step, onTimerComplete, timerSeconds = 0 }: YouTubeVideoPlayerProps) {
  const [videoId, setVideoId] = useState<string>(FALLBACK[STEP_INDEX[step] ?? 0]);
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let cancelled = false;
    getVideos().then((ids) => {
      if (cancelled) return;
      const idx = STEP_INDEX[step] ?? 0;
      setVideoId(ids[idx % ids.length] || FALLBACK[idx]);
    });
    return () => { cancelled = true; };
  }, [step]);

  useEffect(() => {
    if (timerSeconds > 0 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timerSeconds, timeLeft]);

  useEffect(() => {
    if (timerSeconds > 0 && timeLeft === 0) onTimerComplete?.();
  }, [timeLeft, timerSeconds, onTimerComplete]);

  const shouldMute = step === "step2" || step === "step3";

  // Auto-resume if user pauses: listen for YT iframe state events and force play.
  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data !== "string") return;
      try {
        const msg = JSON.parse(e.data);
        // YT player state 2 = paused
        if (msg.event === "onStateChange" && msg.info === 2 && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(
            JSON.stringify({ event: "command", func: "playVideo", args: [] }),
            "*"
          );
        }
      } catch {}
    };
    window.addEventListener("message", onMsg);
    // Subscribe to state changes once iframe loads
    const iframe = iframeRef.current;
    const onLoad = () => {
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: "listening" }),
        "*"
      );
      iframe?.contentWindow?.postMessage(
        JSON.stringify({ event: "command", func: "addEventListener", args: ["onStateChange"] }),
        "*"
      );
    };
    iframe?.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("message", onMsg);
      iframe?.removeEventListener("load", onLoad);
    };
  }, [videoId]);

  return (
    <div className="relative w-full">
      <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-lg">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${shouldMute ? 1 : 0}&rel=0&enablejsapi=1`}
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    </div>
  );
}

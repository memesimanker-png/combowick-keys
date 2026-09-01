import { useState, useEffect, useRef } from "react";
import { X, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FloatingYouTubePlayerProps {
  step: string;
  onTimerComplete?: () => void;
  timerSeconds?: number;
}

export function FloatingYouTubePlayer({ step, onTimerComplete, timerSeconds = 0 }: FloatingYouTubePlayerProps) {
  const videoId = "zGkNbPgQQx4";
  const [timeLeft, setTimeLeft] = useState(timerSeconds);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isClosed, setIsClosed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const neverShow = localStorage.getItem("hide_tutorial_video");
    if (neverShow === "true") setIsClosed(true);
  }, []);

  const handleNeverShowAgain = () => {
    localStorage.setItem("hide_tutorial_video", "true");
    setIsClosed(true);
  };

  useEffect(() => {
    if (timerSeconds > 0 && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { onTimerComplete?.(); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timerSeconds, timeLeft, onTimerComplete]);

  if (isClosed) return null;

  const shouldMute = step === "step2" || step === "step3";

  return (
    <>
      {!isExpanded && (
        <div className="fixed bottom-4 left-4 z-50 group">
          <div className="relative bg-black/90 backdrop-blur-sm rounded-lg shadow-2xl border border-purple-500/50 overflow-hidden w-[280px]">
            <div className="relative aspect-video">
              <iframe
                src={`https://www.youtube.com/embed/${videoId}?autoplay=0&mute=1&rel=0&controls=0`}
                title="Tutorial Video"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                className="w-full h-full pointer-events-none"
              />
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <button
                  onClick={() => setIsExpanded(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all hover:scale-105"
                >
                  Watch Tutorial
                </button>
              </div>
            </div>
            <div className="px-3 py-2 bg-black/95 flex items-center justify-between">
              <span className="text-xs text-purple-300 font-medium">FREE KEY TUTORIAL</span>
              <div className="flex items-center gap-2">
                <button onClick={handleNeverShowAgain} className="text-[10px] text-purple-400 hover:text-purple-300 underline">
                  Don't show again
                </button>
                <Button size="sm" variant="ghost" onClick={() => setIsClosed(true)} className="h-6 w-6 p-0 text-purple-400 hover:text-white hover:bg-purple-600/50">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative w-full max-w-4xl">
            <div className="absolute -top-12 right-0 flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => setIsExpanded(false)} className="text-white hover:bg-white/20">
                <Minimize2 className="h-4 w-4 mr-2" /> Minimize
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setIsExpanded(false); setIsClosed(true); }} className="text-white hover:bg-white/20">
                <X className="h-4 w-4 mr-2" /> Close
              </Button>
            </div>
            <div className="relative w-full aspect-video rounded-xl overflow-hidden shadow-2xl border-2 border-purple-500">
              <iframe
                ref={iframeRef}
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=${shouldMute ? 1 : 0}&rel=0&enablejsapi=1`}
                title="YouTube video player"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
              {timerSeconds > 0 && timeLeft > 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/90 text-white px-8 py-6 rounded-2xl shadow-2xl border-2 border-purple-500">
                    <p className="text-sm font-medium opacity-80">Watch for</p>
                    <p className="text-6xl font-bold tabular-nums">{timeLeft}s</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

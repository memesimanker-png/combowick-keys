import { useCallback, useEffect, useMemo, useState } from "react";
import gallery1 from "@/assets/gallery-1.webp";
import gallery2 from "@/assets/gallery-2.webp";
import gallery3 from "@/assets/gallery-3.webp";
import gallery4 from "@/assets/gallery-4.webp";
import gallery7 from "@/assets/gallery-7.webp";
import gallery8 from "@/assets/gallery-8.webp";

// gallery-8 is shown first, then the rest rotate in
const images = [gallery8, gallery1, gallery2, gallery3, gallery4, gallery7];

interface VideoBackgroundProps {
  className?: string;
  overlay?: boolean;
}

const loadedSlides = new Set<number>();
const preloadCache = new Map<string, Promise<void>>();
const SLIDE_INTERVAL = 4500;
let slideshowStartedAt = Date.now();

function warmImage(src: string, index: number) {
  if (loadedSlides.has(index)) return Promise.resolve();

  const cached = preloadCache.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve) => {
    if (typeof Image === "undefined") {
      loadedSlides.add(index);
      resolve();
      return;
    }

    const img = new Image();
    img.decoding = "async";
    img.src = src;

    const done = () => {
      loadedSlides.add(index);
      resolve();
    };

    if (img.complete) {
      done();
      return;
    }

    img.onload = done;
    img.onerror = done;
  });

  preloadCache.set(src, promise);
  return promise;
}

function getTimedIndex() {
  const elapsed = Date.now() - slideshowStartedAt;
  return Math.floor(elapsed / SLIDE_INTERVAL) % images.length;
}

export function VideoBackground({ className = "", overlay = true }: VideoBackgroundProps) {
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const [loaded, setLoaded] = useState(() => images.map((_, index) => loadedSlides.has(index)));
  const [isPageVisible, setIsPageVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden
  );
  const [current, setCurrent] = useState(0);

  const resolveLoadedIndex = useCallback((target: number, flags: boolean[]) => {
    if (!flags.some(Boolean)) return target;
    if (flags[target]) return target;

    for (let step = 1; step <= images.length; step += 1) {
      const next = (target + step) % images.length;
      if (flags[next]) return next;
    }

    return target;
  }, []);

  useEffect(() => {
    let cancelled = false;

    images.forEach((src, index) => {
      warmImage(src, index).then(() => {
        if (cancelled) return;
        setLoaded((prev) => {
          if (prev[index]) return prev;
          const next = [...prev];
          next[index] = true;
          return next;
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onVis = () => setIsPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const markLoaded = useCallback((index: number) => {
    loadedSlides.add(index);
    setLoaded((prev) => {
      if (prev[index]) return prev;
      const next = [...prev];
      next[index] = true;
      return next;
    });
  }, []);

  // Drive the slideshow off a real timer that ticks every SLIDE_INTERVAL.
  // Previously we relied on a useMemo over Date.now() which never recomputed
  // unless `loaded` changed -- on desktop where all images load instantly,
  // that meant the slideshow froze on the first frame.
  useEffect(() => {
    if (prefersReducedMotion) {
      setCurrent((prev) => resolveLoadedIndex(0, loaded) || prev);
      return;
    }

    let index = 0;
    setCurrent(resolveLoadedIndex(index, loaded));

    if (!isPageVisible) return;

    const id = window.setInterval(() => {
      index = (index + 1) % images.length;
      setCurrent(resolveLoadedIndex(index, loaded));
    }, SLIDE_INTERVAL);

    return () => window.clearInterval(id);
  }, [isPageVisible, loaded, prefersReducedMotion, resolveLoadedIndex]);

  return (
    <div className={`absolute inset-0 overflow-hidden bg-muted ${className}`}>
      {images.map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          aria-hidden="true"
          onLoad={() => markLoaded(i)}
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            opacity: i === current && loaded[i] ? 1 : 0,
            filter: "brightness(0.55) saturate(1.15)",
            transition: "opacity 1.4s ease-in-out",
            zIndex: 1,
          }}
          loading="eager"
          decoding="async"
          {...{ fetchpriority: i <= 1 ? "high" : "low" }}
        />
      ))}

      {overlay && (
        <>
          <div className="absolute inset-0 z-[3] bg-gradient-to-b from-background/10 via-transparent to-background/80" />
          <div className="absolute inset-0 z-[3] bg-gradient-to-r from-primary/3 via-transparent to-accent/3" />
        </>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import gallery1 from "@/assets/gallery-1.webp";
import gallery2 from "@/assets/gallery-2.webp";
import gallery3 from "@/assets/gallery-3.webp";
import gallery4 from "@/assets/gallery-4.webp";
import gallery7 from "@/assets/gallery-7.webp";
import gallery8 from "@/assets/gallery-8.webp";

const allImages = [
  { src: gallery1, alt: "Combo_WICK character with swords" },
  { src: gallery2, alt: "Combo_WICK in a car" },
  { src: gallery3, alt: "Combo_WICK mirror selfie" },
  { src: gallery4, alt: "Combo_WICK with cows" },
  { src: gallery7, alt: "Combo_WICK drip" },
  { src: gallery8, alt: "Combo_WICK featured shot" },
];

const STORAGE_KEY = "cw-gallery-rotation-index";
const VISIBLE_COUNT = 6;

function isDesktop() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(min-width: 768px)").matches;
}

export function GallerySection() {
  const [startIndex, setStartIndex] = useState(0);

  useEffect(() => {
    // On desktop, rotate which image leads the gallery on every revisit.
    if (!isDesktop()) {
      setStartIndex(0);
      return;
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    const last = raw ? Number.parseInt(raw, 10) : -1;
    const next = Number.isFinite(last) ? (last + 1) % allImages.length : 0;
    setStartIndex(next);
    localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  const images = useMemo(() => {
    const out = [];
    for (let i = 0; i < VISIBLE_COUNT; i++) {
      out.push(allImages[(startIndex + i) % allImages.length]);
    }
    return out;
  }, [startIndex]);

  return (
    <section className="py-16 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-2xl font-bold font-heading text-center mb-2">The Gallery</h2>
        <p className="text-center text-muted-foreground mb-10 text-sm">Combo_WICK vibes only.</p>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {images.map((img, i) => (
            <div
              key={i}
              data-gallery-tile
              className="group relative overflow-hidden rounded-xl border border-border bg-muted/40 aspect-square"
              style={{
                backgroundImage:
                  "linear-gradient(110deg, hsl(var(--muted)) 8%, hsl(var(--muted-foreground) / 0.08) 18%, hsl(var(--muted)) 33%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.6s linear infinite",
              }}
            >
              <img
                src={img.src}
                alt={img.alt}
                loading="lazy"
                decoding="async"
                sizes="(min-width: 768px) min(33vw, 380px), 50vw"
                width={800}
                height={800}
                {...({ fetchpriority: i < 2 ? "high" : "low" } as any)}
                onLoad={(e) => {
                  const parent = (e.currentTarget as HTMLImageElement).parentElement;
                  if (parent) {
                    parent.style.animation = "none";
                    parent.style.backgroundImage = "none";
                  }
                }}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          ))}
        </div>

        <style>{`
          @keyframes shimmer {
            0% { background-position: 200% 0; }
            100% { background-position: -200% 0; }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-gallery-tile] { animation: none !important; }
          }
        `}</style>
      </div>
    </section>
  );
}

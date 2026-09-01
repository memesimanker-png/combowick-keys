import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 480);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Back to top"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      className="fixed bottom-24 right-4 sm:bottom-6 sm:right-6 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-transform flex items-center justify-center border border-primary/40"
    >
      <ArrowUp className="h-5 w-5" />
    </button>
  );
}

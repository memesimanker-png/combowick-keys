import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight top progress bar that animates on every route change.
 * No external dependency — pure CSS + a couple of state ticks.
 */
export function RouteProgress() {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    setProgress(15);
    const t1 = setTimeout(() => setProgress(60), 80);
    const t2 = setTimeout(() => setProgress(85), 220);
    const t3 = setTimeout(() => setProgress(100), 420);
    const t4 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 620);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [location.pathname]);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
      style={{ opacity: visible ? 1 : 0, transition: "opacity 200ms ease" }}
    >
      <div
        className="h-full bg-gradient-to-r from-primary via-purple-400 to-primary shadow-[0_0_8px_hsl(var(--primary))]"
        style={{ width: `${progress}%`, transition: "width 200ms ease" }}
      />
    </div>
  );
}

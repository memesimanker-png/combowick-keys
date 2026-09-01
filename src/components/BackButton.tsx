import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const STACK_KEY = "cw_nav_stack";

function readStack(): string[] {
  try {
    const raw = sessionStorage.getItem(STACK_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function writeStack(stack: string[]) {
  try {
    sessionStorage.setItem(STACK_KEY, JSON.stringify(stack.slice(-25)));
  } catch {
    /* ignore */
  }
}

/**
 * Global floating "Back" button. Hidden on the landing page.
 * Keeps its own visit stack in sessionStorage so "Back" always lands on the
 * previous page with a real full page load (fresh data, no stale SPA state).
 */
export function BackButton() {
  const { pathname, search } = useLocation();
  const current = pathname + search;

  useEffect(() => {
    const stack = readStack();
    if (stack[stack.length - 1] !== current) {
      stack.push(current);
      writeStack(stack);
    }
  }, [current]);

  if (pathname === "/") return null;

  const goBack = () => {
    const stack = readStack();
    // Drop the current entry (and any duplicates of it).
    while (stack.length && stack[stack.length - 1] === current) stack.pop();
    const target = stack.pop() || "/";
    writeStack(stack);
    // Full page load of the previous URL → proper refresh.
    window.location.assign(target);
  };

  return (
    <button
      onClick={goBack}
      aria-label="Go back"
      className="fixed bottom-6 left-4 z-40 flex items-center gap-1.5 rounded-full border border-border bg-background/85 px-3.5 py-2 text-xs font-semibold text-foreground shadow-lg backdrop-blur-xl transition hover:bg-secondary active:scale-95"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back
    </button>
  );
}

import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { useState } from "react";

export function SkipAdsBanner() {
  const [isVisible, setIsVisible] = useState(true);
  if (!isVisible) return null;

  return (
    <div className="sticky top-0 z-40 w-full bg-purple-600 text-white py-2.5 px-4 shadow-lg border-b-2 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.9),0_0_60px_rgba(168,85,247,0.6),0_0_90px_rgba(168,85,247,0.3)]">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex-1 text-center">
          <Link to="/premium-keys" className="text-sm md:text-base font-semibold hover:underline">
            Skip Ads — Instant Premium Keys | Click Here
          </Link>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 p-1 hover:bg-white/20 rounded transition-colors"
          aria-label="Close banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

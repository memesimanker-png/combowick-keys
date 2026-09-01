import { Link } from "react-router-dom";

export function SkipAdsFloatButton() {
  return (
    <Link
      to="/premium-keys"
      className="fixed bottom-24 right-4 z-50 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2.5 rounded-lg shadow-lg transition-colors duration-200 text-sm font-semibold border-2 border-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.9),0_0_60px_rgba(168,85,247,0.6),0_0_90px_rgba(168,85,247,0.3)] animate-bounce"
    >
      Skip Ads
    </Link>
  );
}

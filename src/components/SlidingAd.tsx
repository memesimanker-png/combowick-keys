import { useState, useEffect, useCallback, type MouseEvent } from "react";
import { X, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";

const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export default function SlidingAd() {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClosed, setIsClosed] = useState(false);

  const handlePermanentClose = useCallback(() => {
    if (isClosed) return;
    setIsClosed(true);
    setIsAnimating(false);
    try { localStorage.setItem("promo_modal_permanently_closed", "true"); } catch {}
    setTimeout(() => setIsVisible(false), 300);
  }, [isClosed]);

  const handleClose = useCallback(() => {
    if (isClosed) return;
    setIsClosed(true);
    setIsAnimating(false);
    try { localStorage.setItem("promo_modal_closed", Date.now().toString()); } catch {}
    setTimeout(() => setIsVisible(false), 300);
  }, [isClosed]);

  useEffect(() => {
    try {
      if (localStorage.getItem("promo_modal_permanently_closed") === "true") return;
      const lastClosed = localStorage.getItem("promo_modal_closed");
      if (lastClosed && Date.now() - parseInt(lastClosed) < COOLDOWN_MS) return;
    } catch {}

    const timer = setTimeout(() => {
      setIsVisible(true);
      setIsAnimating(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleBackdropClick = (e: MouseEvent) => {
    if (e.target === e.currentTarget) handleClose();
  };

  if (!isVisible) return null;

  return (
    <>
      <style>{`
        @keyframes promoBorderGlow {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes promoArrowBounce {
          0%, 100% { transform: translate(-8px, -8px); }
          50% { transform: translate(-12px, -12px); }
        }
      `}</style>

      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] transition-opacity duration-300 ${
          isAnimating ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleBackdropClick}
      >
        <div
          className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto transition-all duration-500 ease-out ${
            isAnimating ? "opacity-100 scale-100" : "opacity-0 scale-95"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="p-[3px] rounded-2xl bg-gradient-to-r from-purple-500 via-blue-500 via-cyan-500 via-green-500 to-pink-500"
            style={{
              backgroundSize: "300% 300%",
              animation: "promoBorderGlow 3s ease infinite",
            }}
          >
            <div className="relative bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-[17px] overflow-hidden shadow-2xl">
              <div className="absolute top-1 right-1 pointer-events-none z-20">
                <svg
                  width="32"
                  height="32"
                  viewBox="0 0 32 32"
                  style={{
                    filter: "drop-shadow(0 0 4px rgba(255, 255, 255, 0.8))",
                    animation: "promoArrowBounce 1.5s ease-in-out infinite",
                  }}
                >
                  <path d="M8 8 L20 2 L14 14 L8 8 Z" fill="white" stroke="white" strokeWidth="1" />
                </svg>
              </div>

              <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                <button
                  onClick={handlePermanentClose}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  Don't show again
                </button>
                <button
                  onClick={handleClose}
                  className="bg-white hover:bg-gray-200 text-gray-900 rounded-full p-2.5 transition-all duration-200 hover:rotate-90 shadow-lg hover:shadow-xl ring-2 ring-white/50"
                  aria-label="Close"
                >
                  <X size={22} strokeWidth={3} />
                </button>
              </div>

              <div className="p-6 pt-8">
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 mb-3">
                    <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    COMBO<span className="text-orange-500">WICK</span>
                  </h2>
                  <p className="text-gray-400 text-sm">Premium Roblox Scripts & Services</p>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl md:text-3xl font-bold text-center text-yellow-400 mb-3">
                    FREE KEY TUTORIAL
                  </h3>
                  <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-gray-950">
                    <iframe
                      src="https://www.youtube.com/embed/zGkNbPgQQx4"
                      title="Free Key Tutorial"
                      allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="absolute inset-0 w-full h-full"
                    />
                  </div>
                </div>

                <Link
                  to="/premium-keys"
                  onClick={handleClose}
                  className="block w-full text-center bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors mb-3"
                >
                  Skip Ads — Get Premium Key
                </Link>

                <p className="text-center text-gray-500 text-xs">
                  Click anywhere outside to close • Won't show again for 5 minutes
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

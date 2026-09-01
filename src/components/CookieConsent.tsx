import { useState, useEffect, forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const CookieConsent = forwardRef<HTMLDivElement>(function CookieConsent(_, ref) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem("cookie-consent", "declined");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div ref={ref} className="fixed bottom-0 left-0 right-0 z-[100] p-2 sm:p-4">
      <div className="mx-auto max-w-4xl bg-card border border-border rounded-lg p-3 sm:p-6 shadow-2xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
        <div className="flex-1">
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            We use cookies and similar technologies to improve your experience and serve personalized ads through Google AdSense. By clicking "Accept All," you consent to the use of cookies. Read our{" "}
            <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link> for more information.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button size="sm" onClick={accept}>
            Accept All
          </Button>
        </div>
      </div>
    </div>
  );
});

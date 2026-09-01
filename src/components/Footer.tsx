import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/lib/translation-context";

export const Footer = forwardRef<HTMLElement>(function Footer(_, ref) {
  const { t } = useTranslation();

  return (
    <footer ref={ref} className="relative border-t border-primary/10 bg-background mt-auto">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <img src="/images/combo-wick-logo.png" alt="ComboWick" className="h-8 w-8 rounded-lg" />
              <span className="font-heading font-bold text-sm tracking-wider">
                <span className="text-primary">COMBO</span>WICK
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("footer_desc")}
            </p>
          </div>

          {[
            {
              title: t("Products"),
              links: [
                { to: "/scripts", label: t("Scripts") },
                { to: "/keys", label: t("Keys") },
                { to: "/executors", label: t("Executors") },
                { to: "/premium-keys", label: t("Premium") },
              ],
            },
            {
              title: t("Resources"),
              links: [
                { to: "/guides", label: t("Guides") },
                { to: "/tutorials", label: "Lua Tutorials" },
                { to: "/docs", label: "Docs" },
                { to: "/blog", label: t("Blog") },
                { to: "/changelog", label: "Changelog" },
                { to: "/faq", label: t("FAQ") },
              ],
            },
            {
              title: t("Legal"),
              links: [
                { to: "/about", label: "About" },
                { to: "/fair-use", label: "Fair Use" },
                { to: "/privacy", label: "Privacy" },
                { to: "/terms", label: "Terms" },
                { to: "/refund-policy", label: "Refund" },
              ],
            },
            {
              title: t("Community"),
              links: [
                { to: "/wall-of-fame", label: "Wall of Fame" },
                { href: "https://www.youtube.com/@COMBO_WICK", label: "YouTube" },
                { href: "https://discord.com/invite/ufrz9Zaqs8", label: "Discord" },
                { href: "mailto:support@combowick.com", label: "Email" },
                { to: "/contact", label: "Contact" },
              ],
            },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="font-heading font-semibold text-xs uppercase tracking-wider text-primary mb-4">{section.title}</h4>
              <ul className="space-y-2.5">
                {section.links.map((link: any) => (
                  <li key={link.label}>
                    {link.to ? (
                      <Link to={link.to} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </Link>
                    ) : (
                      <a href={link.href} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                        {link.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-bronze/10 text-center">
          <p className="font-serif italic text-xs text-bronze-light/70 tracking-wider">
            The Other Empire ·{" "}
            <a
              href="https://dayconquer.lovable.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-bronze-light underline-offset-4 hover:underline transition-colors"
            >
              DayConquer
            </a>
            <span className="text-muted-foreground/60 not-italic ml-2">— Discipline is the script that runs you.</span>
          </p>
        </div>

        <div className="relative border-t border-border/30 mt-8 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            © 2024–{new Date().getFullYear()} ComboWick. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            Secure payments powered by PayPal • SSL Encrypted
          </p>
        </div>
      </div>
    </footer>
  );
});

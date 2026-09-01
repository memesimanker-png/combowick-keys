import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "@/lib/translation-context";
import { motion } from "framer-motion";

const packages = [
  { duration: "7 Days", price: 5, label: "Starter", popular: false },
  { duration: "30 Days", price: 9.99, label: "Popular", popular: true },
  { duration: "Lifetime", price: 49.99, label: "Pro", popular: false },
];

export function PricingSection() {
  const { t } = useTranslation();

  return (
    <section id="pricing" className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-hero" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            {t("Choose Your Package")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            {t("pricing_subtitle")}
          </p>
          <div className="mt-8 mx-auto w-24 h-px line-glow" />
        </motion.div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {packages.map((pkg, i) => (
              <motion.div
                key={pkg.duration}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
            >
              <Card
                className={`relative p-8 h-full transition-all duration-500 ${
                  pkg.popular
                    ? "card-premium scale-[1.03]"
                    : "card-neon"
                }`}
              >
                {pkg.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-5 py-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground text-[10px] font-bold rounded-full uppercase tracking-[0.2em] neon-glow flex items-center gap-1.5">
                    <Crown className="h-3 w-3" />
                    {t("Best Value")}
                  </div>
                )}
                <div className="text-center mb-8">
                  <h3 className="font-heading text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground mb-4">{t(pkg.label)}</h3>
                  <div className="text-5xl font-bold mb-2 font-heading">${pkg.price}</div>
                  <p className="text-sm text-muted-foreground">{pkg.duration} Premium Key</p>
                </div>
                <ul className="space-y-3 mb-10">
                  {[
                    t("Instant premium key"),
                    t("Instant delivery"),
                    t("PayPal buyer protection"),
                    t("Dashboard access"),
                    ...(pkg.popular ? [t("Priority updates")] : []),
                    ...(pkg.duration === "Lifetime" ? [t("Priority support")] : []),
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-3 text-sm">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link to="/premium-keys">
                  <Button
                    className={`w-full uppercase tracking-wider text-xs font-bold py-6 ${
                      pkg.popular ? "neon-glow" : ""
                    }`}
                    variant={pkg.popular ? "default" : "outline"}
                  >
                    {t("Purchase Now")}
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

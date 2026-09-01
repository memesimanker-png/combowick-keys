import { Card } from "@/components/ui/card";
import { Shield, Zap, Lock, HeadphonesIcon, Award, TrendingUp } from "lucide-react";
import { useTranslation } from "@/lib/translation-context";
import { motion } from "framer-motion";

const featureIcons = [Shield, Zap, Lock, HeadphonesIcon, Award, TrendingUp];
const featureKeys = [
  { title: "Verified & Secure Scripts", desc: "feat_1_desc" },
  { title: "Instant Automated Delivery", desc: "feat_2_desc" },
  { title: "Encrypted & Safe Payments", desc: "feat_3_desc" },
  { title: "24/7 Discord Support", desc: "feat_4_desc" },
  { title: "Quality Updates", desc: "feat_5_desc" },
  { title: "Growing Community", desc: "feat_6_desc" },
];

export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-section" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            {t("Why Gamers Choose ComboWick")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            {t("features_subtitle")}
          </p>
          <div className="mt-8 mx-auto w-24 h-px line-glow" />
        </motion.div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureKeys.map((feature, i) => {
            const Icon = featureIcons[i];
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: i * 0.1 }}
              >
                <Card className="p-8 card-neon group h-full">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-6 group-hover:neon-glow transition-all">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-heading text-sm font-semibold mb-3 uppercase tracking-wider">{t(feature.title)}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t(feature.desc)}</p>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

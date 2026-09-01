import { useTranslation } from "@/lib/translation-context";
import { motion } from "framer-motion";

export function HowItWorksSection() {
  const { t } = useTranslation();

  const steps = [
    { step: "01", title: t("Choose Your Package"), desc: t("step_1_desc") },
    { step: "02", title: t("Complete Payment"), desc: t("step_2_desc") },
    { step: "03", title: t("Access Your Key"), desc: t("step_3_desc") },
  ];

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
            {t("How It Works")}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
            {t("how_subtitle")}
          </p>
          <div className="mt-8 mx-auto w-24 h-px line-glow" />
        </motion.div>
        <div className="grid md:grid-cols-3 gap-12 max-w-4xl mx-auto">
          {steps.map((item, i) => (
            <motion.div
              key={item.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="font-heading text-6xl font-black text-primary/10 mb-4">{item.step}</div>
              <h3 className="font-heading text-sm font-semibold mb-3 uppercase tracking-wider">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              {i < 2 && (
                <div className="hidden md:block absolute top-8 -right-6 w-12 h-px line-glow" />
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

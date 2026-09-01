import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { FAQSection } from "@/components/home/FAQSection";
import { BlogPreviewSection } from "@/components/home/BlogPreviewSection";
import { GallerySection } from "@/components/home/GallerySection";
import { FeaturedScriptsSection } from "@/components/home/FeaturedScriptsSection";
import { TrustSection } from "@/components/home/TrustSection";
import { VideoBackground } from "@/components/VideoBackground";
import { DropCadenceTicker } from "@/components/DropCadenceTicker";
import { AdSlot } from "@/components/AdSlot";
import { useTranslation } from "@/lib/translation-context";
import { motion } from "framer-motion";
import { SEOHead } from "@/components/SEOHead";

export default function Index() {
  const { t } = useTranslation();

  return (
    <Layout>
      <SEOHead
        title="ComboWick — Free Roblox Scripts, Premium Keys & Executors"
        description="Free Roblox Lua scripts, HWID premium keys, executor reviews and Lua tutorials. Instant PayPal delivery and 24/7 Discord support."
      />
      {/* Hero */}
      <section className="relative min-h-[85vh] sm:min-h-[90vh] flex items-end overflow-hidden">
        <VideoBackground />
        <div className="absolute inset-0 star-field opacity-40" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12 sm:pb-20 pt-24 sm:pt-32 text-left z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-bronze/10 border border-bronze/30 mb-6 backdrop-blur-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-bronze-light" />
            <span className="text-[10px] font-serif tracking-[0.3em] uppercase text-bronze-light">
              Combo_WICK — Est. MMXXIV
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="font-heading text-4xl sm:text-5xl lg:text-7xl font-bold tracking-tight mb-4 max-w-3xl leading-[1.05]"
          >
            <span className="text-gradient-neon">COMBOWICK</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25 }}
            className="font-serif italic text-base sm:text-lg text-bronze-light/90 mb-6 tracking-wide"
          >
            Vincit qui se vincit. <span className="text-muted-foreground/70 not-italic text-xs ml-2">— He conquers who conquers himself.</span>
          </motion.p>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="text-sm sm:text-base text-muted-foreground max-w-xl mb-8 leading-relaxed"
          >
            {t("hero_main_desc")}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.45 }}
            className="flex flex-col sm:flex-row items-start gap-4"
          >
            <Link to="/scripts">
              <Button size="lg" className="text-sm px-10 py-7 uppercase tracking-wider font-bold neon-glow group">
                Enter the Codex
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/premium-keys">
              <Button variant="outline" size="lg" className="text-sm px-10 py-7 uppercase tracking-wider border-bronze/30 hover:bg-bronze/10 hover:text-bronze-light">
                {t("Premium Keys")}
              </Button>
            </Link>
            <Link to="/keys">
              <Button variant="outline" size="lg" className="text-sm px-10 py-7 uppercase tracking-wider border-bronze/30 hover:bg-bronze/10 hover:text-bronze-light">
                {t("Get Key")}
              </Button>
            </Link>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 h-px line-glow" />
      </section>

      <DropCadenceTicker />

      <FeaturedScriptsSection />

      {/* In-content AdSense unit — between content sections, not in nav/sidebar/footer */}
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <AdSlot slot="1111111111" format="auto" responsive minHeight={280} />
      </div>

      <FeaturesSection />
      <GallerySection />
      <HowItWorksSection />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <AdSlot slot="2222222222" format="auto" responsive minHeight={280} />
      </div>

      <BlogPreviewSection />
      <TrustSection />
      <FAQSection />

      {/* CTA */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-section" />
        <div className="absolute inset-0 star-field opacity-20" />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center"
        >
          <p className="font-serif italic text-bronze-light/80 text-sm tracking-wider mb-3">— The Gate Is Open —</p>
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            Few Will Enter.
          </h2>
          <p className="text-muted-foreground text-lg mb-10 max-w-xl mx-auto">
            {t("cta_main_desc")}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/scripts">
              <Button size="lg" className="text-sm px-10 py-7 uppercase tracking-wider neon-glow">
                Enter the Codex
              </Button>
            </Link>
            <Link to="/blog">
              <Button variant="outline" size="lg" className="text-sm px-10 py-7 uppercase tracking-wider border-bronze/30 hover:bg-bronze/10 hover:text-bronze-light">
                Read the Archives
              </Button>
            </Link>
          </div>
        </motion.div>
      </section>
    </Layout>
  );
}

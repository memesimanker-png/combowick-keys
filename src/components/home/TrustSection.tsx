import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Eye, Youtube, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";

// Social proof built ONLY from real, verifiable sources.
// Primary anchor: Rscripts.net "Verified Mythic Creator" (~6.7M views).
// No fabricated testimonials or fake AggregateRating markup.
const stats = [
  { icon: BadgeCheck, label: "Rscripts Status", value: "Verified Mythic Creator" },
  { icon: Eye, label: "Script Views", value: "6.7M+" },
  { icon: MessageCircle, label: "Discord Members", value: "50k+" },
  { icon: Youtube, label: "Channel", value: "@COMBO_WICK" },
];

export function TrustSection() {
  return (
    <section className="relative py-20 sm:py-24 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-section opacity-50" />
      <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="font-serif italic text-bronze-light/80 text-sm tracking-wider mb-3">— Verified, Not Vanity —</p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-4 tracking-tight">
            Real, Verifiable Reputation
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            ComboWick (Combo_WICK) is an independently <strong className="text-foreground">Verified Mythic Creator on Rscripts.net</strong> with over
            6.7 million script views. We don't fake testimonials — every number below is checkable on a third-party platform.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map(({ icon: Icon, label, value }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="p-5 bg-glass text-center h-full">
                <Icon className="h-6 w-6 text-primary mx-auto mb-2" />
                <p className="font-heading text-lg font-bold leading-tight">{value}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <a href="https://rscripts.net/u/Combo_WICK" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="uppercase tracking-wider border-bronze/30 hover:bg-bronze/10 hover:text-bronze-light">
              <BadgeCheck className="mr-2 h-4 w-4" /> Verify on Rscripts
            </Button>
          </a>
          <a href="https://www.youtube.com/@COMBO_WICK" target="_blank" rel="noopener noreferrer">
            <Button variant="outline" className="uppercase tracking-wider border-bronze/30 hover:bg-bronze/10 hover:text-bronze-light">
              <Youtube className="mr-2 h-4 w-4" /> Watch on YouTube
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

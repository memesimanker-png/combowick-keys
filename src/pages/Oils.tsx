import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Droplets, Leaf, CheckCircle, ChevronDown, ChevronUp, Star, Heart, Sparkles
} from "lucide-react";
import { useState } from "react";

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border/50 rounded-lg">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/30 transition-colors rounded-lg"
      >
        <span className="font-medium pr-4">{q}</span>
        {open ? <ChevronUp className="h-5 w-5 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground leading-relaxed">{a}</div>
      )}
    </div>
  );
}

const oils = [
  {
    name: "Jamaican Black Castor Oil",
    subtitle: "Traditional Cold-Pressed Formula",
    desc: "Our Jamaican Black Castor Oil is produced using traditional roasting and cold-pressing methods passed down through generations. Rich in ricinoleic acid, omega-6 fatty acids, and vitamin E, this versatile oil has been used for centuries in Caribbean communities for hair growth stimulation, scalp health, and skin moisturizing. The distinctive dark color comes from the ash produced during the roasting process, which adds alkaline properties that help open hair cuticles for deeper penetration.",
    benefits: ["Promotes hair growth and thickness", "Strengthens hair follicles", "Moisturizes dry, damaged scalp", "Reduces hair breakage and split ends", "Soothes eczema and dry skin patches"],
  },
  {
    name: "Virgin Coconut Oil",
    subtitle: "Cold-Pressed & Unrefined",
    desc: "Sourced directly from Jamaican coconut farms, our Virgin Coconut Oil is cold-pressed and completely unrefined to preserve its natural nutrients. Coconut oil is one of the most versatile natural oils available — it's rich in lauric acid (which has antimicrobial properties), medium-chain fatty acids for deep moisture, and natural antioxidants. Whether used for cooking, skin care, or hair treatment, this oil delivers exceptional results without any chemical processing or additives.",
    benefits: ["Deep hair conditioning and shine", "Natural antimicrobial skin protection", "Cooking oil with high smoke point", "Makeup remover and skin moisturizer", "Cuticle and nail strengthener"],
  },
  {
    name: "Herbal Infused Hair Oil",
    subtitle: "Proprietary Botanical Blend",
    desc: "Our signature Herbal Infused Hair Oil is a proprietary blend combining traditional Jamaican botanicals with carrier oils for maximum hair and scalp benefits. Each batch is carefully prepared by infusing fresh herbs — including rosemary, peppermint, nettle, and hibiscus — into a base of coconut and castor oil over several weeks. This slow infusion process extracts the full range of beneficial compounds from each herb, creating a potent treatment oil that addresses multiple hair concerns simultaneously.",
    benefits: ["Stimulates blood circulation to scalp", "Reduces dandruff and scalp irritation", "Adds natural shine and softness", "Strengthens hair from root to tip", "Pleasant herbal aromatherapy scent"],
  },
];

export default function Oils() {
  return (
    <Layout>
      {/* Hero */}
      <section className="py-16 sm:py-20 bg-gradient-hero">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 border border-success/30 mb-6">
            <Leaf className="h-4 w-4 text-success" />
            <span className="text-xs font-semibold text-success uppercase tracking-wider">100% Natural • Handcrafted</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl font-bold tracking-tight mb-6 max-w-4xl mx-auto">
            Authentic Jamaican <span className="text-gradient-primary">Natural Oils</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
            Handcrafted in Jamaica using traditional methods and 100% natural ingredients. Our oils are cold-pressed, unrefined, and free from chemicals, preservatives, and artificial fragrances. Experience the authentic Caribbean wellness tradition that has nourished hair and skin for generations.
          </p>
          <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="text-base px-8 py-6">Order on Discord</Button>
          </a>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-4">Our Story & Process</h2>
          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-8 text-lg leading-relaxed">
            Every bottle of ComboWick oil begins on a small farm in Jamaica, where the ingredients are grown, harvested, and processed by hand using techniques that have been refined over generations.
          </p>
          <div className="prose-content space-y-6 text-muted-foreground leading-relaxed">
            <p>
              Our journey into natural oils started with a simple belief: the best hair and skin care products don't come from laboratories — they come from nature. Jamaica's tropical climate produces some of the world's finest castor beans, coconuts, and medicinal herbs, and we work directly with local farmers to source the highest-quality raw materials.
            </p>
            <p>
              The production process is intentionally slow and traditional. Our castor oil begins with hand-selected castor beans that are roasted over an open fire, then ground and boiled to extract the rich, dark oil. This traditional method preserves the natural ash content, which gives Jamaican Black Castor Oil its distinctive properties and dark color that sets it apart from commercially produced castor oils.
            </p>
            <p>
              Our coconut oil is cold-pressed within 48 hours of harvest to ensure maximum freshness and nutrient retention. Unlike mass-produced coconut oils that undergo chemical refining, bleaching, and deodorizing (RBD process), our virgin coconut oil retains its natural coconut aroma, flavor, and full nutritional profile.
            </p>
            <p>
              The herbal infused oil represents months of preparation. Fresh herbs are harvested at peak potency, dried in controlled conditions, and then slowly infused into our carrier oil blend over 4-6 weeks. This patience results in a deeply concentrated botanical treatment that delivers noticeable results from the first application.
            </p>
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-4">Our Oil Collection</h2>
          <p className="text-muted-foreground text-center max-w-2xl mx-auto mb-12 text-lg">
            Three carefully crafted oils, each serving a distinct purpose in your natural hair and skin care routine.
          </p>
          <div className="grid lg:grid-cols-3 gap-8">
            {oils.map((oil) => (
              <Card key={oil.name} className="p-6 bg-glass hover:border-primary/30 transition-all flex flex-col">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 mb-4">
                  <Droplets className="h-7 w-7 text-primary" />
                </div>
                <h3 className="font-heading text-xl font-bold mb-1">{oil.name}</h3>
                <p className="text-sm text-primary/80 italic mb-3">{oil.subtitle}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-4 flex-1">{oil.desc}</p>
                <div className="border-t border-border/50 pt-4">
                  <h4 className="text-sm font-semibold mb-2">Key Benefits:</h4>
                  <ul className="space-y-1.5">
                    {oil.benefits.map((b) => (
                      <li key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-3.5 w-3.5 text-success flex-shrink-0" /> {b}
                      </li>
                    ))}
                  </ul>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How to Use */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">How to Use Our Oils</h2>
          <div className="space-y-8">
            <Card className="p-6 bg-glass">
              <h3 className="font-heading text-xl font-semibold mb-3 flex items-center gap-2">
                <Heart className="h-5 w-5 text-primary" /> For Hair Growth & Scalp Health
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Apply a small amount of Jamaican Black Castor Oil or Herbal Infused Oil directly to your scalp. Massage gently in circular motions for 5-10 minutes to stimulate blood circulation. For best results, apply before bed and cover with a satin bonnet or towel. Wash out in the morning with a gentle sulfate-free shampoo. Repeat 2-3 times per week for optimal results. Most customers report noticeable improvement in hair thickness and growth within 4-6 weeks of consistent use.
              </p>
            </Card>
            <Card className="p-6 bg-glass">
              <h3 className="font-heading text-xl font-semibold mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> For Deep Conditioning Treatment
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Warm 2-3 tablespoons of Virgin Coconut Oil in your hands until melted. Apply evenly through damp hair from roots to tips, paying extra attention to dry or damaged ends. Cover with a shower cap and leave for 30 minutes to 2 hours (or overnight for intensive treatment). The coconut oil's lauric acid penetrates the hair shaft deeply, reducing protein loss and restoring moisture. Wash out with warm water and shampoo twice to remove all residue.
              </p>
            </Card>
            <Card className="p-6 bg-glass">
              <h3 className="font-heading text-xl font-semibold mb-3 flex items-center gap-2">
                <Leaf className="h-5 w-5 text-primary" /> For Skin Moisturizing
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-3">
                Apply a thin layer of Virgin Coconut Oil or Castor Oil to clean, slightly damp skin after showering. The oils absorb best when skin is still warm and slightly moist. Focus on dry areas like elbows, knees, and heels. For facial use, use only a small amount of coconut oil as an overnight treatment — it's particularly effective for dry skin types. Castor oil works well as a spot treatment for eczema patches, minor burns, or chapped lips.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Why Choose ComboWick Oils</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { title: "100% Natural Ingredients", desc: "No chemicals, preservatives, parabens, sulfates, or artificial fragrances. Every ingredient is natural and clearly listed. What you see is what you get." },
              { title: "Traditional Production Methods", desc: "We use time-tested Jamaican techniques — hand-roasting castor beans, cold-pressing coconuts, and slow-infusing herbs. No shortcuts, no industrial processing." },
              { title: "Direct from Jamaica", desc: "Our oils are produced on-site in Jamaica and shipped directly to you. No middlemen, no warehousing, no relabeling of generic products." },
              { title: "Small Batch Quality", desc: "Each batch is small enough for personal quality control. We test every bottle ourselves before it ships. If it doesn't meet our standards, it doesn't leave Jamaica." },
              { title: "Transparent Sourcing", desc: "We know the exact farm and farmer behind every ingredient. We're happy to answer any questions about our sourcing, production, or ingredients." },
              { title: "Community Support", desc: "Every purchase supports local Jamaican farmers and their families. We pay fair prices for raw materials and invest in the communities where our ingredients grow." },
            ].map((item) => (
              <Card key={item.title} className="p-6 bg-glass">
                <h3 className="font-heading text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-3xl font-bold text-center mb-12">Oils FAQ</h2>
          <div className="space-y-3">
            <FAQItem
              q="How do I order oils?"
              a="All oil orders are processed through our Discord server. Join our Discord community (link in the navigation), open a support ticket, and let us know which oils you'd like. We'll provide pricing, shipping options, and process your order personally. This allows us to provide individualized service, answer your specific hair/skin care questions, and ensure you're getting the right product for your needs."
            />
            <FAQItem
              q="Where do you ship to?"
              a="We currently ship worldwide. Shipping times vary: Caribbean region typically receives orders in 5-7 business days, United States in 7-14 business days, and international orders in 14-21 business days. All orders include tracking information. Shipping costs depend on destination and are calculated at the time of order."
            />
            <FAQItem
              q="How should I store the oils?"
              a="Store all oils in a cool, dry place away from direct sunlight. Coconut oil will naturally solidify below 76°F (24°C) — this is completely normal and doesn't affect quality. Simply warm the container briefly in your hands or in warm water to liquefy. Our oils have a natural shelf life of 12-18 months when stored properly."
            />
            <FAQItem
              q="Are these oils suitable for all hair types?"
              a="Yes. Our oils work with all hair types — curly, coily, straight, wavy, thick, or thin. However, the application method and amount may vary. For fine hair, use smaller amounts to avoid weighing hair down. For thick, coily, or 4C hair types, more generous application is typically beneficial. We're happy to provide personalized recommendations on Discord."
            />
            <FAQItem
              q="Are the oils safe for sensitive skin?"
              a="Our oils contain only natural ingredients with no added fragrances or chemicals, making them generally well-tolerated by sensitive skin. However, we always recommend doing a patch test on a small area of skin 24 hours before full application. If you have specific allergies, contact us on Discord and we'll provide the complete ingredient list for the product you're interested in."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl font-bold mb-4">Ready to Try Authentic Jamaican Oils?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Join our Discord community to place an order, ask questions, or learn more about our products. We're always happy to help you find the right oil for your needs.
          </p>
          <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
            <Button size="lg" className="text-base px-8 py-6">Join Discord to Order</Button>
          </a>
        </div>
      </section>
    </Layout>
  );
}

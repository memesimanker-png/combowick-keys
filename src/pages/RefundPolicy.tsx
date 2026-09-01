import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { SEOHead } from "@/components/SEOHead";

export default function RefundPolicy() {
  return (
    <Layout>
      <SEOHead
        title="Refund Policy — Combo_WICK Premium Keys"
        description="Combo_WICK refund policy. Why digital premium keys are non-refundable, the narrow exception for provably defective keys, and how to request a replacement."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Refund Policy", url: "/refund-policy" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-heading text-4xl font-bold mb-4">Refund Policy</h1>
            <p className="text-muted-foreground">Last Updated: January 16, 2026</p>
          </div>

          <Card className="p-6 bg-destructive/10 border-destructive/30 mb-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-6 w-6 text-destructive flex-shrink-0 mt-1" />
              <div>
                <h2 className="font-heading text-xl font-bold text-destructive mb-2">All Sales Are Final — No Refunds</h2>
                <p className="text-foreground text-sm leading-relaxed">
                  Due to the instant digital nature of our premium keys, all sales are final. We do not offer refunds under any circumstances. Products are delivered immediately upon payment and cannot be returned or reversed.
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-8 bg-glass mb-6">
            <h2 className="font-heading text-2xl font-semibold mb-4">Why We Cannot Offer General Refunds</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              Unlike physical products that can be returned and resold, digital premium keys are delivered instantly and can be used immediately. Once a key is issued, there is no way to "un-deliver" that access. This policy is standard across the digital goods industry and protects both buyers and sellers.
            </p>
            <ul className="space-y-3">
              {[
                "Products are delivered instantly and automatically upon payment confirmation",
                "Premium keys cannot be returned or reversed once delivered",
                "License keys provide immediate access to premium features",
                "All product information, pricing, and features are clearly displayed before purchase",
                "PayPal buyer protection applies to all transactions for additional security",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm">
                  <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-8 bg-glass mb-6">
            <h2 className="font-heading text-2xl font-semibold mb-4">Support — When We Will Help</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              While we do not offer refunds, we are committed to customer satisfaction. We will assist in the following cases:
            </p>
            <ul className="space-y-3 text-sm text-muted-foreground">
              <li>• <strong className="text-foreground">Non-working keys:</strong> If a premium key doesn't activate at the time of delivery, contact us within 24 hours for a replacement.</li>
              <li>• <strong className="text-foreground">Incorrect delivery:</strong> If you receive a different product than what you ordered, we'll correct it immediately.</li>
              <li>• <strong className="text-foreground">Duplicate charges:</strong> If you were charged multiple times for a single order, we'll resolve the duplicate charge.</li>
              <li>• <strong className="text-foreground">Technical errors:</strong> If a system error prevented proper delivery, we'll redeliver or resolve the issue.</li>
            </ul>
          </Card>

          <Card className="p-8 bg-glass mb-6">
            <h2 className="font-heading text-2xl font-semibold mb-4">Before You Purchase</h2>
            <p className="text-muted-foreground leading-relaxed mb-4">
              To avoid any misunderstandings, please carefully review the following before completing your order:
            </p>
            <ul className="space-y-2 text-sm text-muted-foreground list-disc ml-6">
              <li>Product descriptions, features, and what's included in each package</li>
              <li>Premium key duration, access type, and pricing</li>
              <li>Our Terms of Service and this Refund Policy</li>
              <li>Your PayPal account has sufficient funds or a valid payment method</li>
            </ul>
          </Card>

          <Card className="p-8 bg-glass">
            <h2 className="font-heading text-2xl font-semibold mb-4">Need Help?</h2>
            <p className="text-muted-foreground leading-relaxed mb-6">
              If you're experiencing issues with a purchase or have questions about our refund policy, our support team is ready to assist you. We strive to resolve all customer concerns fairly and promptly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="https://discord.com/invite/ufrz9Zaqs8" target="_blank" rel="noopener noreferrer">
                <Button>Contact Support on Discord</Button>
              </a>
              <a href="mailto:support@combowick.com">
                <Button variant="outline">Email: support@combowick.com</Button>
              </a>
            </div>
            <p className="text-xs text-muted-foreground mt-6 italic">
              By making a purchase on ComboWick, you acknowledge that you have read, understood, and agree to this Refund Policy.
            </p>
          </Card>
        </div>
      </section>
    </Layout>
  );
}

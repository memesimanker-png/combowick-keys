import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function Terms() {
  return (
    <Layout>
      <SEOHead
        title="Terms of Service — Combo_WICK"
        description="Combo_WICK terms of service. User obligations, permitted use of scripts and premium keys, account termination conditions, and dispute resolution."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Terms", url: "/terms" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-heading text-4xl font-bold mb-4 flex items-center gap-3">
              <FileText className="h-10 w-10 text-primary" />
              Terms of Service
            </h1>
            <p className="text-muted-foreground">Last Updated: January 16, 2026</p>
          </div>

          <div className="space-y-6">
            {[
              { title: "1. Acceptance of Terms", content: "By accessing and using the ComboWick website (combowick.com) and its services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use our services. These terms apply to all visitors, users, and customers of ComboWick." },
              { title: "2. Description of Services", content: "ComboWick provides Roblox scripts, executor resources, Lua guides, and premium game keys. All paid products are digital in nature and delivered electronically through our secure dashboard. Premium key plans are subject to availability. We reserve the right to modify, suspend, or discontinue any aspect of our services at any time." },
              { title: "3. Account Registration", content: "To access certain features and make purchases, you may need to create a ComboWick account. You agree to provide accurate, current, and complete information during registration. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use of your account. We reserve the right to suspend or terminate accounts that violate these terms." },
              { title: "4. Digital Products and Delivery", content: "All products sold on ComboWick are digital access credentials and premium keys. Products are delivered instantly upon successful payment confirmation through our automated delivery system. Once delivered, premium keys are accessible through your ComboWick dashboard. You are responsible for securely storing your credentials and using keys according to the stated access rules." },
              { title: "5. Pricing and Payments", content: "All prices are displayed in US Dollars (USD) and include applicable fees. Payments are processed exclusively through PayPal. By making a purchase, you authorize ComboWick to charge your PayPal account for the total amount. Prices may change at any time without prior notice, but changes will not affect orders already placed and confirmed." },
              { title: "6. Refund Policy", content: "Due to the instant digital nature of our products, all sales are generally final. Refunds are not provided once premium keys have been delivered and accessed. In cases where a product does not function as described, contact our support team within 24 hours for a replacement or resolution. For full details, please review our dedicated Refund Policy page." },
              { title: "7. User Conduct", content: "When using ComboWick, you agree not to: (a) attempt to reverse engineer, decompile, or hack any part of our platform; (b) share, redistribute, or resell purchased premium keys to third parties; (c) use our services for any illegal or unauthorized purpose; (d) impersonate another person or entity; (e) interfere with or disrupt the integrity of our platform; (f) use automated systems (bots, scrapers) to access our services without permission. Violation of these terms may result in immediate account termination and forfeiture of purchased products." },
              { title: "8. Intellectual Property", content: "All content on the ComboWick website — including but not limited to text, graphics, logos, images, software, and design — is the property of ComboWick and is protected by copyright and intellectual property laws. You may not reproduce, distribute, modify, or create derivative works from our content without explicit written permission." },
              { title: "9. Limitation of Liability", content: "To the maximum extent permitted by law, ComboWick shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use our services. This includes, but is not limited to, damages for loss of profits, data, goodwill, or other intangible losses. Our total liability for any claim arising from these terms shall not exceed the amount you paid for the specific product giving rise to the claim." },
              { title: "10. Disclaimer of Warranties", content: "Our services are provided on an 'as is' and 'as available' basis without warranties of any kind, either express or implied. We do not guarantee that our services will be uninterrupted, error-free, or completely secure. While we strive to ensure all products are as described, we make no warranties regarding the suitability of premium keys, scripts, or educational resources for any particular purpose." },
              { title: "11. Third-Party Services", content: "ComboWick utilizes trusted third-party services including PayPal for payment processing, Lovable Cloud for secure data management, and Vercel for hosting. Your use of these services is subject to their respective terms and privacy policies. We are not responsible for the actions, content, or data practices of third-party providers." },
              { title: "12. Governing Law", content: "These Terms of Service shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these terms shall be resolved through binding arbitration in accordance with applicable rules, or in the courts of competent jurisdiction." },
              { title: "13. Changes to Terms", content: "We reserve the right to modify these Terms of Service at any time. Material changes will be communicated via email to registered users and posted on this page with an updated date. Your continued use of our services after changes are posted constitutes acceptance of the revised terms." },
              { title: "14. Contact Information", content: "For questions, concerns, or disputes regarding these Terms of Service, please contact us:\n\n• Email: support@combowick.com\n• Discord: discord.com/invite/ufrz9Zaqs8\n\nWe aim to resolve all inquiries within 48 business hours." },
            ].map(({ title, content }) => (
              <Card key={title} className="p-6 bg-glass">
                <h2 className="font-heading text-xl font-bold mb-3">{title}</h2>
                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{content}</p>
              </Card>
            ))}

            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground italic">
                By using ComboWick, you acknowledge and agree to these Terms of Service. If you have questions, please contact our support team before using our services.
              </p>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
}

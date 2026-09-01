import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Shield } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function Privacy() {
  return (
    <Layout>
      <SEOHead
        title="Privacy Policy — Combo_WICK"
        description="The Combo_WICK privacy policy. What data we collect, how we use it, third-party processors, advertising cookies, and your GDPR rights."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Privacy", url: "/privacy" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-heading text-4xl font-bold mb-4 flex items-center gap-3">
              <Shield className="h-10 w-10 text-primary" />
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">Last Updated: January 20, 2026</p>
          </div>

          <Card className="p-8 bg-glass mb-6">
            <p className="text-muted-foreground leading-relaxed">
              At ComboWick ("we," "us," or "our"), we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website at combowick.com and use our Roblox script library, tutorials, key verification flow, and premium key services.
            </p>
          </Card>

          <div className="space-y-6">
            {[
              {
                title: "1. Information We Collect",
                content: `**Information You Provide Directly:**
• Account Information: Email address, username, and encrypted password when you create an account
• Payment Information: Processed securely through PayPal — we never store credit card numbers
• Transaction Data: Purchase history, order IDs, package selections, and delivery status
• Communication Data: Messages sent to our support team via email or Discord

**Automatically Collected Information:**
• Device Information: Browser type and version, operating system, screen resolution
• Usage Data: Pages visited, time spent on pages, clicks, and navigation patterns
• IP Address: Used for security monitoring, fraud prevention, and analytics
• Cookies: Small data files stored on your device for authentication and preferences`
              },
              {
                title: "2. How We Use Your Information",
                content: `We use collected information for the following legitimate purposes:
• Service Delivery: Process your transactions, manage premium key access, and support script-related services
• Account Management: Create and maintain your ComboWick user account and dashboard
• Customer Support: Respond to inquiries, troubleshoot issues, and provide purchase assistance
• Security: Detect and prevent fraud, unauthorized access, and security incidents
• Platform Improvements: Analyze usage patterns to enhance our website and user experience
• Legal Compliance: Meet legal obligations, enforce our Terms of Service, and protect our rights
• Communications: Send transactional emails (order confirmations, delivery notifications) and important service updates`
              },
              {
                title: "3. Third-Party Services",
                content: `We work with the following trusted third-party service providers:
• PayPal: Handles all payment processing with industry-leading security standards (see PayPal's Privacy Policy at paypal.com/privacy)
• Supabase: Provides secure authentication and encrypted database hosting for user accounts
• Vercel: Powers our website hosting and global content delivery network for fast page loads
• Google AdSense: Displays advertising on our site — may use cookies for personalized ad delivery based on your browsing history

Each provider has access only to the minimum information necessary to perform their function and is contractually obligated to maintain confidentiality and data security.`
              },
              {
                title: "4. Cookies and Tracking Technologies",
                content: `We use cookies and similar technologies to enhance your experience:
• Essential Cookies: Required for user authentication, session management, and core site functionality
• Analytics Cookies: Help us understand how visitors navigate and use our site to improve the experience
• Advertising Cookies: Used by Google AdSense to display relevant advertisements

You can manage cookie preferences through your browser settings. Disabling essential cookies may prevent you from logging in or completing purchases. Most browsers allow selective cookie blocking.`
              },
              {
                title: "5. Data Security",
                content: `We implement comprehensive security measures to protect your information:
• SSL/TLS encryption for all data transmitted between your browser and our servers
• Secure password hashing using industry-standard algorithms — we never store plaintext passwords
• Regular security audits and vulnerability assessments of our platform
• Role-based access controls limiting employee access to personal data
• Secure cloud infrastructure through Supabase and Vercel with automatic security patching
• Automated monitoring for suspicious account activity and unauthorized access attempts

While we employ best-in-class security practices, no method of internet transmission is 100% secure. You are responsible for maintaining the confidentiality of your account credentials and should report any suspicious activity immediately.`
              },
              {
                title: "6. Your Privacy Rights",
                content: `Depending on your location, you may have the following rights under applicable data protection laws (including GDPR and CCPA):
• Access: Request a copy of the personal data we hold about you
• Correction: Update inaccurate or incomplete information in your profile
• Deletion: Request deletion of your personal data (subject to legal retention requirements)
• Objection: Object to certain types of data processing
• Portability: Receive your data in a structured, commonly used, machine-readable format
• Withdraw Consent: Opt out of marketing communications at any time

To exercise any of these rights, contact us at support@combowick.com. We will respond within 30 days as required by law.`
              },
              {
                title: "7. Children's Privacy",
                content: `Our services are not intended for individuals under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected information from a child, please contact us immediately at support@combowick.com, and we will take prompt steps to delete such information from our systems.`
              },
              {
                title: "8. Data Retention",
                content: `We retain your personal data only as long as necessary to fulfill the purposes outlined in this policy:
• Account data is retained while your account is active and for 90 days after deletion request
• Transaction records are kept for 7 years for legal and tax compliance
• Communication logs are retained for 2 years for customer service quality purposes
• Analytics data is aggregated and anonymized after 26 months`
              },
              {
                title: "9. International Data Transfers",
                content: `Our servers are located in the United States. If you access our services from outside the US, your data may be transferred to and processed in the US. We ensure appropriate safeguards are in place for international transfers, including standard contractual clauses where required by law.`
              },
              {
                title: "10. Changes to This Policy",
                content: `We may update this Privacy Policy periodically. Material changes will be communicated via email to registered users and prominently displayed on our website. Your continued use of our services after changes are posted constitutes acceptance of the updated policy. We encourage you to review this page regularly.`
              },
              {
                title: "11. Contact Us",
                content: `For privacy-related questions, data requests, or concerns about our data practices:
• Email: support@combowick.com
• Discord: discord.com/invite/ufrz9Zaqs8
• Response Time: Within 30 days for formal data rights requests; within 24 hours for general privacy inquiries`
              },
            ].map(({ title, content }) => (
              <Card key={title} className="p-6 bg-glass">
                <h2 className="font-heading text-xl font-bold mb-4">{title}</h2>
                <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                  {content}
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

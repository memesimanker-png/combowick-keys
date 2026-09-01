import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Plus, Zap, Shield, Bug } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

const changelog = [
  {
    version: "3.5.0", date: "February 15, 2024",
    changes: [
      { type: "feature", text: "Added support for 15 new popular Roblox games" },
      { type: "feature", text: "Improved YouTube video verification system with better loading states" },
      { type: "improvement", text: "Enhanced key system security with additional validation layers" },
      { type: "improvement", text: "Optimized database queries for 40% faster key generation" },
      { type: "fix", text: "Fixed issue where some users couldn't complete step 2 verification" },
      { type: "fix", text: "Resolved mobile UI overflow issues on provider selection page" },
    ],
  },
  {
    version: "3.4.2", date: "February 8, 2024",
    changes: [
      { type: "feature", text: "Added dark mode toggle for improved user experience" },
      { type: "improvement", text: "Upgraded Supabase client to v2.39 for better performance" },
      { type: "improvement", text: "Reduced verification cooldown from 5 minutes to 3 minutes" },
      { type: "fix", text: "Fixed Discord link not opening in new tab" },
      { type: "fix", text: "Corrected key expiration timer display formatting" },
    ],
  },
  {
    version: "3.4.0", date: "January 30, 2024",
    changes: [
      { type: "feature", text: "Introduced multi-language support (English, Spanish, French, German)" },
      { type: "feature", text: "Added comprehensive FAQ section with 20+ common questions" },
      { type: "feature", text: "Implemented educational content pages (tutorials, anti-cheat guide)" },
      { type: "improvement", text: "Redesigned homepage with better information architecture" },
      { type: "improvement", text: "Enhanced mobile responsiveness across all pages" },
      { type: "security", text: "Added rate limiting to prevent API abuse" },
      { type: "security", text: "Implemented HWID-based key system to prevent sharing" },
    ],
  },
  {
    version: "3.3.5", date: "January 22, 2024",
    changes: [
      { type: "feature", text: "Added YouTube channel integration for tutorial videos" },
      { type: "improvement", text: "Optimized verification flow for better completion rates" },
      { type: "improvement", text: "Updated executor compatibility list with latest versions" },
      { type: "fix", text: "Fixed verification button not enabling after video completion" },
      { type: "fix", text: "Resolved cookie persistence issues on Safari browsers" },
    ],
  },
  {
    version: "3.3.0", date: "January 15, 2024",
    changes: [
      { type: "feature", text: "Launched new script hub with 100+ scripts across 50+ games" },
      { type: "feature", text: "Implemented verification progress tracking system" },
      { type: "improvement", text: "Redesigned access-key page with better UX" },
      { type: "improvement", text: "Added copy-to-clipboard functionality for generated keys" },
      { type: "security", text: "Enhanced bot detection on key generation endpoint" },
    ],
  },
  {
    version: "3.2.0", date: "December 20, 2023",
    changes: [
      { type: "feature", text: "Launched COMBO WICK v3 with completely redesigned UI" },
      { type: "feature", text: "Implemented 3-step verification system for better security" },
      { type: "feature", text: "Added 24-hour key system with automatic expiration" },
      { type: "improvement", text: "Migrated to Next.js 14 for improved performance" },
      { type: "improvement", text: "Integrated Supabase for scalable database infrastructure" },
    ],
  },
];

const iconMap: Record<string, React.ReactNode> = {
  feature: <Plus className="h-4 w-4 text-success" />,
  improvement: <Zap className="h-4 w-4 text-primary" />,
  fix: <Bug className="h-4 w-4 text-warning" />,
  security: <Shield className="h-4 w-4 text-purple-400" />,
};

const badgeMap: Record<string, string> = {
  feature: "bg-success/20 border-success/30 text-success",
  improvement: "bg-primary/20 border-primary/30 text-primary",
  fix: "bg-warning/20 border-warning/30 text-warning",
  security: "bg-purple-500/20 border-purple-500/30 text-purple-400",
};

export default function Changelog() {
  return (
    <Layout>
      <SEOHead
        title="ComboWick Changelog — Script Updates & Releases"
        description="Public changelog for Combo_WICK. New script support, executor compatibility updates, premium key system improvements, and site release notes."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Changelog", url: "/changelog" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header className="text-center space-y-4">
            <h1 className="font-heading text-4xl font-bold">Changelog</h1>
            <p className="text-xl text-muted-foreground">Track all updates, new features, improvements, and bug fixes</p>
          </header>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="text-lg font-semibold">Active Development</span>
              </div>
              <p className="text-muted-foreground text-sm">
                COMBO WICK is actively maintained with regular updates based on community feedback.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-6">
            {changelog.map((release, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl">Version {release.version}</CardTitle>
                    <span className="text-sm text-muted-foreground">{release.date}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {release.changes.map((change, ci) => (
                      <li key={ci} className="flex items-start gap-3">
                        <span className="mt-0.5">{iconMap[change.type]}</span>
                        <div className="flex-1">
                          <span className={`text-xs px-2 py-0.5 rounded border ${badgeMap[change.type]} mr-2`}>
                            {change.type.charAt(0).toUpperCase() + change.type.slice(1)}
                          </span>
                          <span className="text-muted-foreground text-sm">{change.text}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
}

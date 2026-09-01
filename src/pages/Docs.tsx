import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Key, Clock, RefreshCw, Shield, Code } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function Docs() {
  return (
    <Layout>
      <SEOHead
        title="Combo_WICK Documentation — HWID Key System & API Reference"
        description="Technical documentation for the Combo_WICK premium key system: HWID binding, key generation, expiry handling, dashboard activation flow, and partner script-author APIs."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Docs", url: "/docs" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <article className="space-y-8">
            <Card className="border-primary/30 border-2 bg-primary/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3">Quick Answer</h2>
                <blockquote className="text-muted-foreground leading-relaxed border-l-4 border-primary pl-4">
                  <strong>COMBO WICK</strong> is a free Roblox script distribution system serving <strong>50,000+ active users</strong> that uses time-limited
                  verification keys. Users complete a <strong>3-step ad-verification process (2-5 minutes)</strong> to generate <strong>24-hour access keys</strong>. Keys
                  expire after 24 hours but can be <strong>regenerated unlimited times</strong> at no cost.
                </blockquote>
              </CardContent>
            </Card>

            <header className="space-y-2">
              <h1 className="font-heading text-3xl font-bold">System Documentation</h1>
              <p className="text-muted-foreground">Technical overview of the COMBO WICK key system</p>
            </header>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Key className="h-5 w-5 text-primary" /> What is COMBO WICK?</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <p className="font-semibold text-lg text-foreground">COMBO WICK is a Roblox script hub serving 50,000+ users that distributes premium game scripts through a free key-based verification system.</p>
                <div className="bg-muted p-4 rounded border border-border">
                  <p className="font-semibold mb-2 text-foreground">Core Features:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li><strong>User Base:</strong> 50,000+ active users as of 2025</li>
                    <li><strong>Purpose:</strong> Free access to Roblox executor scripts</li>
                    <li><strong>Key Format:</strong> 32-64 character alphanumeric string, SHA-256 hashed server-side</li>
                    <li><strong>Update Frequency:</strong> Daily script updates</li>
                    <li><strong>Executor Support:</strong> Works with Synapse X, KRNL, Fluxus, Arceus X, Hydrogen (level 7+)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><Clock className="h-4 w-4 text-primary" /> 24-Hour Temporary Keys</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm space-y-2">
                  <p><strong>Validity:</strong> 24 hours from generation</p>
                  <p><strong>Limit:</strong> Unlimited regenerations</p>
                  <p><strong>Usage:</strong> Multi-device compatible</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base"><RefreshCw className="h-4 w-4 text-primary" /> Key Regeneration</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm space-y-2">
                  <p><strong>Method:</strong> Complete 3-step verification</p>
                  <p><strong>Time:</strong> ~2-5 minutes per cycle</p>
                  <p><strong>Cost:</strong> Free with ad verification</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" /> How Key Verification Works</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <div className="bg-muted p-4 rounded border border-border">
                  <pre className="text-xs font-mono whitespace-pre-wrap text-foreground">{`// High-level verification flow
1. User clicks "Begin Verification"
2. System presents ad provider options
3. FOR each step (1, 2, 3):
   - Load YouTube video from channel
   - IF step requires timer: Wait 15 seconds minimum
   - User clicks verification button
   - Redirect to external verification partner
   - Partner redirects back with token
   - System validates token server-side
4. ALL steps complete → Generate unique key
5. Store key in database with expiry timestamp
6. Display key to user
7. User enters key in Roblox executor
8. Executor validates key via API call
9. IF valid AND not expired: Grant script access
10. IF expired: Prompt user to regenerate`}</pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Security & Trust</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-3">
                <div>
                  <p className="font-semibold mb-2 text-foreground">What COMBO WICK Stores:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Key generation timestamps</li>
                    <li>IP addresses (hashed with SHA-256)</li>
                    <li>Verification completion events</li>
                    <li>Key validation attempts</li>
                  </ul>
                </div>
                <div>
                  <p className="font-semibold mb-2 text-foreground">What COMBO WICK Does NOT Store:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>Roblox account credentials</li>
                    <li>Personal identifying information</li>
                    <li>In-game activity or chat logs</li>
                    <li>Payment information (system is free)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </article>
        </div>
      </section>
    </Layout>
  );
}

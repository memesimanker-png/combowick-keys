import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, Server, Code } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function AntiCheatGuide() {
  return (
    <Layout>
      <SEOHead
        title="Roblox Anti-Cheat Explained — Combo_WICK Safety Guide"
        description="How Roblox anti-cheat detects unusual activity, the difference between client and server checks, and concrete steps to protect your account when running scripts."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Anti-Cheat Guide", url: "/anti-cheat-guide" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <article className="space-y-8">
            <header className="text-center space-y-4">
              <h1 className="font-heading text-4xl font-bold">Understanding Anti-Cheat Systems</h1>
              <p className="text-xl text-muted-foreground">Educational guide on how game security and detection works</p>
            </header>

            <Card className="border-destructive/30 border-2 bg-destructive/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3">⚠️ Educational Content Only</h2>
                <p className="text-muted-foreground leading-relaxed">
                  This guide is for educational purposes to help developers understand how anti-cheat systems work.
                  This knowledge is valuable for game developers building their own security systems and for players
                  understanding why certain behaviors are detected and penalized.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /> How Anti-Cheat Detection Works</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>Modern anti-cheat systems use multiple layers of detection to identify unauthorized modifications:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Memory Scanning:</strong> Monitors for unauthorized memory modifications in the game process</li>
                  <li><strong>Behavioral Analysis:</strong> Tracks player movement patterns, reaction times, and accuracy statistics</li>
                  <li><strong>Process Monitoring:</strong> Detects known cheat software running alongside the game</li>
                  <li><strong>Network Validation:</strong> Server-side checks that verify client-reported data</li>
                  <li><strong>Integrity Checks:</strong> Verifies game files haven't been modified</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Server className="h-5 w-5 text-primary" /> Server-Side vs Client-Side</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded border border-border">
                    <h3 className="font-semibold text-foreground mb-2">Client-Side Detection</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• Runs on the player's computer</li>
                      <li>• Can detect known cheat signatures</li>
                      <li>• Monitors process injection</li>
                      <li>• Can be bypassed with enough effort</li>
                    </ul>
                  </div>
                  <div className="bg-muted p-4 rounded border border-border">
                    <h3 className="font-semibold text-foreground mb-2">Server-Side Validation</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• Runs on game servers</li>
                      <li>• Validates all client actions</li>
                      <li>• Cannot be bypassed by client mods</li>
                      <li>• Most reliable detection method</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" /> Roblox's Security Architecture</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>Roblox uses a multi-layered security approach:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Byfron:</strong> Kernel-level anti-cheat that prevents process injection</li>
                  <li><strong>Remote Event Validation:</strong> Server validates all client remote calls</li>
                  <li><strong>Rate Limiting:</strong> Prevents rapid-fire actions that indicate automation</li>
                  <li><strong>Physics Validation:</strong> Server checks movement speed, teleportation, and collision</li>
                  <li><strong>Report System:</strong> Community reports trigger manual review</li>
                </ul>
                <div className="bg-warning/10 p-4 rounded border border-warning/30 mt-4">
                  <p className="text-sm"><strong>Important:</strong> Using scripts in live Roblox games violates the Terms of Service and can result in permanent account bans. Always use knowledge responsibly and for educational purposes only.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Best Practices for Game Developers</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground space-y-4">
                <p>If you're building a Roblox game, here are security best practices:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Never trust client-side data — always validate on the server</li>
                  <li>Use server-side hit detection for competitive games</li>
                  <li>Implement rate limiting on all remote events</li>
                  <li>Validate player positions and movement speeds server-side</li>
                  <li>Use DataStore encryption for sensitive game data</li>
                  <li>Monitor for statistical anomalies in player behavior</li>
                </ul>
              </CardContent>
            </Card>
          </article>
        </div>
      </section>
    </Layout>
  );
}

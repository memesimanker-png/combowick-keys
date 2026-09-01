import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, BookOpen, Shield, Scale } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function FairUse() {
  return (
    <Layout>
      <SEOHead
        title="Combo_WICK Fair Use Policy — Responsible Roblox Scripting"
        description="The Combo_WICK fair-use policy. What scripts and tools we curate, what we deliberately don't list, and the community standards we ask every user to follow."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Fair Use", url: "/fair-use" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="font-heading text-4xl sm:text-5xl font-bold mb-4">Education & Fair Use Policy</h1>
            <p className="text-muted-foreground text-lg">Our commitment to responsible scripting education and ethical development practices</p>
          </div>

          <div className="space-y-8">
            <Card className="border-destructive/50 border-2 bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-destructive"><AlertTriangle className="h-6 w-6" /> Important Disclaimer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p className="text-lg font-semibold text-foreground">COMBO WICK is an educational platform designed to teach Lua scripting, automation concepts, and game development fundamentals.</p>
                <div className="bg-muted p-4 rounded border border-destructive/30">
                  <p className="font-semibold mb-2 text-foreground">By using this platform, you acknowledge:</p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>Scripts provided are for educational and private sandbox testing only</li>
                    <li>Using unauthorized scripts in live multiplayer games violates most game Terms of Service</li>
                    <li>Account bans, suspensions, and permanent terminations are common consequences of ToS violations</li>
                    <li>COMBO WICK does not encourage, condone, or support cheating in online games</li>
                    <li>You are solely responsible for how you use the knowledge and tools provided</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><BookOpen className="h-6 w-6 text-primary" /> Educational Mission</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>COMBO WICK exists to help aspiring developers understand programming concepts through practical examples:</p>
                <ul className="space-y-3">
                  <li className="flex items-start gap-3"><span className="text-primary font-bold">•</span><div><strong>Learn Lua Programming:</strong> Master variables, functions, loops, tables, and object-oriented patterns</div></li>
                  <li className="flex items-start gap-3"><span className="text-primary font-bold">•</span><div><strong>Understand Game Architecture:</strong> Study remote events, server-client communication, and data stores</div></li>
                  <li className="flex items-start gap-3"><span className="text-primary font-bold">•</span><div><strong>Practice Safe Development:</strong> Learn debugging, error handling, and code optimization</div></li>
                  <li className="flex items-start gap-3"><span className="text-primary font-bold">•</span><div><strong>Build Portfolio Projects:</strong> Create automation tools and practice applications for personal learning</div></li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><Shield className="h-6 w-6 text-success" /> Responsible Use Guidelines</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <p>We encourage all users to follow these ethical development practices:</p>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-success/5 p-4 rounded border border-success/30">
                    <h3 className="font-semibold text-success mb-2">✓ DO:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• Use scripts in private/offline testing environments</li>
                      <li>• Study code to learn programming patterns</li>
                      <li>• Modify scripts to understand how they work</li>
                      <li>• Ask questions and engage in educational discussions</li>
                      <li>• Respect game developers' intellectual property</li>
                      <li>• Read and understand Terms of Service</li>
                    </ul>
                  </div>
                  <div className="bg-destructive/5 p-4 rounded border border-destructive/30">
                    <h3 className="font-semibold text-destructive mb-2">✗ DON'T:</h3>
                    <ul className="space-y-1 text-sm">
                      <li>• Use scripts to gain unfair advantages in live games</li>
                      <li>• Harass, grief, or ruin experiences for other players</li>
                      <li>• Distribute malicious or harmful code</li>
                      <li>• Claim others' work as your own</li>
                      <li>• Ignore warnings about account security risks</li>
                      <li>• Blame COMBO WICK for consequences of misuse</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3"><Scale className="h-6 w-6 text-purple-400" /> Legal & Terms of Service</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h3 className="font-semibold text-lg text-foreground">Understanding Game Terms of Service</h3>
                <p>Most online games explicitly prohibit unauthorized third-party software. Common violations include:</p>
                <ul className="list-disc list-inside space-y-2 ml-4">
                  <li>Running executors or script injectors in multiplayer environments</li>
                  <li>Automating gameplay actions</li>
                  <li>Bypassing anti-cheat or game security systems</li>
                  <li>Accessing restricted game data or modifying client behavior</li>
                </ul>
                <div className="bg-warning/10 p-4 rounded border border-warning/30 mt-4">
                  <p className="font-semibold text-warning mb-2">Consequences of ToS Violations:</p>
                  <ul className="space-y-1 text-sm">
                    <li>• Temporary account suspension (7-30 days)</li>
                    <li>• Permanent account termination</li>
                    <li>• Loss of purchased items, Robux, and game progress</li>
                    <li>• IP bans preventing creation of new accounts</li>
                    <li>• Hardware ID bans affecting all accounts on your device</li>
                  </ul>
                </div>
                <p className="text-sm italic mt-6">
                  COMBO WICK provides educational resources for learning purposes only. We are not liable for any account actions, bans, or losses resulting from how users choose to apply this knowledge.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </Layout>
  );
}

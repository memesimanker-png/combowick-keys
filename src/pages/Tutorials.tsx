import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Book, Shield, Lightbulb } from "lucide-react";
import { SEOHead } from "@/components/SEOHead";

export default function Tutorials() {
  return (
    <Layout>
      <SEOHead
        title="Lua Scripting Tutorials for Roblox — Combo_WICK Learn Hub"
        description="Free Lua programming tutorials by Combo_WICK. Learn Roblox scripting from variables and tables to metatables, OOP patterns, and the globals every Roblox script author needs."
        breadcrumbs={[{ name: "Home", url: "/" }, { name: "Tutorials", url: "/tutorials" }]}
      />
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <article className="space-y-8">
            <header className="text-center space-y-4">
              <h1 className="font-heading text-4xl font-bold">Lua Scripting Tutorials</h1>
              <p className="text-xl text-muted-foreground">Learn Roblox script development and game automation fundamentals</p>
            </header>

            <Card className="border-primary/30 border-2 bg-primary/5">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-3">Educational Focus</h2>
                <p className="text-muted-foreground leading-relaxed">
                  These tutorials teach fundamental Lua scripting concepts for Roblox game development and automation.
                  Understanding how scripts work helps developers create better games and players understand game mechanics.
                  Always use scripting knowledge responsibly and respect game developers' terms of service.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5 text-primary" /> Introduction to Lua Scripting</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-semibold text-foreground">What is Lua?</h3>
                <p>Lua is a lightweight, high-level programming language used in Roblox for game logic and automation. It's designed to be embedded in applications and is known for its simplicity and flexibility.</p>
                <h3 className="text-lg font-semibold text-foreground mt-6">Basic Lua Concepts</h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Variables:</strong> Store data like numbers, strings, and booleans</li>
                  <li><strong>Functions:</strong> Reusable blocks of code that perform specific tasks</li>
                  <li><strong>Conditionals:</strong> if/then statements for decision making</li>
                  <li><strong>Loops:</strong> Repeat actions multiple times (for, while loops)</li>
                  <li><strong>Tables:</strong> Data structures for storing collections of values</li>
                </ul>
                <div className="bg-muted p-4 rounded border border-border mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Example: Basic Lua Script</p>
                  <pre className="text-sm overflow-x-auto text-foreground">{`-- Simple function example
function greetPlayer(playerName)
    print("Hello, " .. playerName)
end

greetPlayer("User")`}</pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Book className="h-5 w-5 text-primary" /> Executor Compatibility Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-semibold text-foreground">Understanding Executor Levels</h3>
                <p>Roblox executors are rated by their capability levels (1-10). Higher levels support more advanced Lua functions and game interactions. COMBO WICK scripts require level 7+ executors for full functionality.</p>
                <h3 className="text-lg font-semibold text-foreground mt-6">Compatible Executors</h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Synapse X (Level 8):</strong> Premium executor with excellent stability</li>
                  <li><strong>KRNL (Level 7):</strong> Free option with good compatibility</li>
                  <li><strong>Fluxus (Level 7):</strong> Popular free executor with regular updates</li>
                  <li><strong>Arceus X (Level 7):</strong> Mobile-friendly Android executor</li>
                  <li><strong>Hydrogen (Level 7):</strong> Lightweight executor for performance</li>
                </ul>
                <div className="bg-warning/10 p-4 rounded border border-warning/30 mt-4">
                  <p className="text-sm"><strong>Important:</strong> Executors may trigger antivirus false positives due to their injection methods. Only download from official sources and scan files before running.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-primary" /> Security & Account Safety</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-semibold text-foreground">Protecting Your Account</h3>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li>Use alternate accounts for testing scripts, not your main account</li>
                  <li>Never share your account credentials with script providers</li>
                  <li>Enable 2-factor authentication on your Roblox account</li>
                  <li>Regularly change your password and use strong, unique passwords</li>
                  <li>Be aware that using scripts violates Roblox Terms of Service and risks account termination</li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5 text-primary" /> Game Automation Concepts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-muted-foreground">
                <h3 className="text-lg font-semibold text-foreground">Understanding Automation</h3>
                <p>Game automation scripts perform repetitive tasks automatically, improving productivity in games with grinding mechanics. Common automation types include:</p>
                <ul className="list-disc list-inside space-y-2 pl-4">
                  <li><strong>Auto-farming:</strong> Automatically collect resources or complete tasks</li>
                  <li><strong>Teleportation:</strong> Quick travel between game locations</li>
                  <li><strong>GUI automation:</strong> Interact with game menus programmatically</li>
                  <li><strong>Event detection:</strong> Respond automatically to game events</li>
                </ul>
                <div className="bg-muted p-4 rounded border border-border mt-4">
                  <p className="text-xs text-muted-foreground mb-2">Example: Simple Auto-Farm Loop</p>
                  <pre className="text-sm overflow-x-auto text-foreground">{`-- Auto-collect loop example
while task.wait(1) do
    for _, item in pairs(workspace.Collectibles:GetChildren()) do
        if item.Name == "Coin" then
            item.CFrame = game.Players.LocalPlayer.Character.HumanoidRootPart.CFrame
        end
    end
end`}</pre>
                </div>
              </CardContent>
            </Card>
          </article>
        </div>
      </section>
    </Layout>
  );
}

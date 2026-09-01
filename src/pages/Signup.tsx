import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { SEOHead } from "@/components/SEOHead";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check your email", description: "We sent you a confirmation link. Please verify your email before signing in." });
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Sign Up — Create Your ComboWick Account"
        description="Create a free ComboWick account to buy premium keys, track purchases, and access support tools."
      />
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <Card className="bg-glass border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">Create Account</CardTitle>
            </CardHeader>
            <CardContent>
              <GoogleSignInButton label="Sign up with Google" redirectPath="/dashboard" />
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
              </div>
              <form onSubmit={handleSignup} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} placeholder="••••••••" />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                  Sign Up
                </Button>
              </form>
              <p className="text-sm text-center text-muted-foreground mt-4">
                Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}

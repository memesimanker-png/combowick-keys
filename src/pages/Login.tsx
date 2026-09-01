import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, LogIn } from "lucide-react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { SEOHead } from "@/components/SEOHead";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Logged in successfully" });
      navigate("/dashboard");
    }
  };

  return (
    <Layout>
      <SEOHead
        title="Sign In — ComboWick Account Login"
        description="Sign in to your ComboWick account to manage premium keys, view purchases, and access the dashboard."
      />
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-md px-4 sm:px-6">
          <Card className="bg-glass border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="font-heading text-2xl">Sign In</CardTitle>
            </CardHeader>
            <CardContent>
              <GoogleSignInButton label="Sign in with Google" redirectPath="/dashboard" />
              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/60" /></div>
                <div className="relative flex justify-center text-[11px] uppercase tracking-wider"><span className="bg-card px-2 text-muted-foreground">or with email</span></div>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
                </div>
                <div>
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" />
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
                  Sign In
                </Button>
              </form>
              <p className="text-sm text-center text-muted-foreground mt-4">
                Don't have an account? <Link to="/signup" className="text-primary hover:underline">Sign up</Link>
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </Layout>
  );
}

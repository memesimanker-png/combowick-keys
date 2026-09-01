import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, User, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [hwid, setHwid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const hwidParam = searchParams.get("hwid");
    if (hwidParam) setHwid(hwidParam);
    else setError("No HWID provided in URL. Please use the format: /register?hwid=YOUR-HWID");
  }, [searchParams]);

  const handleRegister = () => {
    if (!hwid) { setError("HWID is required"); return; }
    setIsLoading(true);
    setError("");

    localStorage.setItem("pending_hwid", hwid);
    localStorage.setItem("hwid_session_id", Math.random().toString(36).substring(2, 15));

    setSuccess(true);
    toast({ title: "HWID Registered!", description: "Your HWID has been added to the pending list." });
    setTimeout(() => navigate("/verify/provider-select"), 2000);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[url('/images/hacker-background.jpg')] bg-cover bg-center bg-fixed flex flex-col">
      <NoIndex />
      <div className="min-h-screen bg-black/70 flex flex-col">
        <header className="container py-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-500" />
            <h1 className="text-xl font-bold text-green-500">COMBO WICK</h1>
          </div>
        </header>
        <main className="flex-1 container flex flex-col items-center justify-center py-12">
          <Card className="w-full max-w-md border-green-500/50 bg-black/80">
            <CardHeader className="border-b border-green-500/20">
              <CardTitle className="text-green-500 flex items-center gap-2"><User className="h-5 w-5" /> HWID Registration</CardTitle>
              <CardDescription>Register your Hardware ID for whitelist access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {error && (
                <Alert className="border-red-500/50 bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-400">{error}</AlertDescription>
                </Alert>
              )}
              {success && (
                <Alert className="border-green-500/50 bg-green-500/10">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <AlertDescription className="text-green-400">HWID registered successfully! Redirecting to verification...</AlertDescription>
                </Alert>
              )}
              {hwid && (
                <div className="rounded-lg bg-black/50 p-4 border border-green-500/30">
                  <h3 className="font-medium mb-2 text-green-400">Your HWID:</h3>
                  <code className="text-sm font-mono text-green-500 break-all">{hwid}</code>
                </div>
              )}
              <div className="space-y-2">
                <h3 className="font-medium text-green-400">Next Steps:</h3>
                <ol className="text-sm text-green-500/70 space-y-1 list-decimal list-inside">
                  <li>Click "Register HWID" below</li>
                  <li>Choose your preferred ad provider</li>
                  <li>Complete the 3-step verification process</li>
                  <li>Your HWID will be automatically whitelisted</li>
                </ol>
              </div>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-black" onClick={handleRegister} disabled={isLoading || !hwid || success}>
                {isLoading ? "Registering..." : success ? "Registered!" : "Register HWID"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

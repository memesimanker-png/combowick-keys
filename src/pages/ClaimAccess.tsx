import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Shield, CheckCircle, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { NoIndex } from "@/components/NoIndex";


export default function ClaimAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [hwid, setHwid] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const hwidParam = searchParams.get("hwid");
    const storedHwid = localStorage.getItem("pending_hwid");
    if (hwidParam) setHwid(hwidParam);
    else if (storedHwid) setHwid(storedHwid);
    else setError("No HWID found. Please start the registration process again.");
  }, [searchParams]);

  const handleClaimAccess = () => {
    if (!hwid) { setError("HWID is required"); return; }
    setIsLoading(true);

    localStorage.setItem("hwid_registered", "true");
    localStorage.setItem("hwid_timestamp", Date.now().toString());

    toast({ title: "🎉 Access Claimed!", description: "Your HWID has been successfully registered!" });

    setTimeout(() => navigate(`/access-key`), 1500);
    setIsLoading(false);
  };

  if (error && !hwid) {
    return (
      <div className="min-h-screen flex items-center justify-center">
      <NoIndex />
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[url('/images/hacker-background.jpg')] bg-cover bg-center bg-fixed flex flex-col">
      <div className="min-h-screen bg-black/70 flex flex-col">
        <header className="container py-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-green-500" />
            <h1 className="text-xl font-bold text-green-500">COMBO WICK</h1>
          </div>
        </header>
        <main className="flex-1 container flex flex-col items-center justify-center py-12">
          <Card className="w-full max-w-md border-green-500/50 bg-black/80">
            <CardHeader className="border-b border-green-500/20 text-center">
              <CardTitle className="text-green-500 flex items-center justify-center gap-2">
                <CheckCircle className="h-6 w-6" /> Verification Complete!
              </CardTitle>
              <CardDescription className="text-green-400">All ad verification steps completed successfully</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-3">
                {["Step 1: Ad Provider Selected", "Step 2: First Ad Completed", "Step 3: Final Ad Completed"].map((s) => (
                  <div key={s} className="flex items-center gap-3 text-green-500">
                    <CheckCircle className="h-5 w-5" /><span>{s}</span>
                  </div>
                ))}
              </div>
              {hwid && (
                <div className="rounded-lg bg-black/50 p-4 border border-green-500/30">
                  <h3 className="font-medium mb-2 text-green-400">Your HWID:</h3>
                  <code className="text-sm font-mono text-green-500 break-all">{hwid}</code>
                </div>
              )}
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <Gift className="h-5 w-5" /><span className="font-medium">Ready to claim your access!</span>
                </div>
                <p className="text-sm text-green-500/70">Click the button below to register your HWID and get your access key.</p>
              </div>
              <Button className="w-full bg-green-500 hover:bg-green-600 text-black font-medium py-3" onClick={handleClaimAccess} disabled={isLoading || !hwid}>
                {isLoading ? (
                  <div className="flex items-center gap-2"><div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent"></div>Claiming Access...</div>
                ) : (
                  <div className="flex items-center gap-2"><Gift className="h-4 w-4" />Claim Your Access</div>
                )}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}

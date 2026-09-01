import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Shield, AlertTriangle, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoIndex } from "@/components/NoIndex";

export default function Blocked() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get("reason") || "suspicious_activity";
  const redirect = searchParams.get("redirect") || "/verify/step1";
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); navigate(redirect); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [redirect, navigate]);

  const getBlockingInfo = () => {
    switch (reason) {
      case "step_sequence":
        return {
          title: "Step Sequence Violation",
          description: "You must complete all verification steps in order",
          message: "Our system detected an attempt to skip verification steps.",
          bulletPoints: ["Verification steps must be completed in order", "Each step must be fully completed before proceeding", "Attempting to skip steps is not allowed", "Your progress is being monitored"],
        };
      case "incomplete_verification":
        return {
          title: "Incomplete Verification",
          description: "You must complete all verification steps",
          message: "You attempted to access a protected area without completing all required verification steps.",
          bulletPoints: ["All verification steps must be completed", "Each step must be fully completed", "Your progress is being monitored", "Complete all steps to gain access"],
        };
      default:
        return {
          title: "Security Warning",
          description: "Suspicious activity detected",
          message: "Our system has detected potentially suspicious activity.",
          bulletPoints: ["Rapidly switching between tabs or windows", "Using browser extensions that interfere", "Attempting to skip verification steps", "Using automated tools or scripts"],
        };
    }
  };

  const blockingInfo = getBlockingInfo();

  return (
    <div className="min-h-screen bg-black/70 flex flex-col">
      <NoIndex />
      <header className="container py-6">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold">ComboWick Verify</h1>
        </div>
      </header>
      <main className="flex-1 container flex flex-col items-center justify-center py-12">
        <div className="max-w-md w-full mx-auto space-y-6">
          <Card className="border-amber-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <CardTitle>{blockingInfo.title}</CardTitle>
              </div>
              <CardDescription>{blockingInfo.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm">{blockingInfo.message}</p>
              <div className="rounded-lg bg-muted p-4 text-sm">
                <ul className="list-disc pl-5 space-y-1">
                  {blockingInfo.bulletPoints.map((point, index) => <li key={index}>{point}</li>)}
                </ul>
              </div>
              <div className="text-center text-sm">
                <p>Redirecting in <span className="font-medium">{countdown}</span> seconds...</p>
              </div>
              <p className="text-sm text-muted-foreground">If you believe this is an error, you can return to the verification process.</p>
            </CardContent>
            <CardFooter>
              <Link to={redirect} className="w-full">
                <Button className="w-full bg-transparent" variant="outline">
                  <Lock className="mr-2 h-4 w-4" /> Return to Verification
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>
    </div>
  );
}

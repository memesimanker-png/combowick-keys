import { useState } from "react";
import { Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  script: {
    id: string;
    slug: string;
    title: string;
    game: string;
    code: string;
  };
}

export function EmailScriptButton({ script }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast({ variant: "destructive", title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({ variant: "destructive", title: "Sign in required", description: "Please log in to email yourself a script." });
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "script-delivery",
          recipientEmail: trimmed,
          idempotencyKey: `script-${script.id}-${trimmed.toLowerCase()}-${Date.now()}`,
          templateData: {
            scriptId: script.id,
            scriptTitle: script.title,
            scriptGame: script.game,
            scriptUrl: `https://combowick.com/scripts/${script.slug}`,
            scriptCode: script.code,
          },
        },
      });
      if (error) {
        const msg = (data as any)?.error || error.message || "Try again later.";
        toast({ variant: "destructive", title: "Slow down", description: msg });
        return;
      }
      toast({ title: "Sent!", description: `Script emailed to ${trimmed}.` });
      setOpen(false);
      setEmail("");
    } catch (e: any) {
      toast({ variant: "destructive", title: "Failed to send", description: e?.message ?? "Try again later." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Mail className="h-4 w-4" /> Email me
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Email this script</DialogTitle>
          <DialogDescription>We'll send <strong>{script.title}</strong> to your inbox.</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="email-script-input">Your email</Label>
          <Input
            id="email-script-input"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button onClick={handleSend} disabled={loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
            Send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

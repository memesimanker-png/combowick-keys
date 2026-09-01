import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send, AtSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: { id: string; title: string } | null;
}

type MentionType = "none" | "everyone" | "here" | "role";

export function DiscordPostDialog({ open, onOpenChange, script }: Props) {
  const { toast } = useToast();
  const [mentionType, setMentionType] = useState<MentionType>("none");
  const [roleId, setRoleId] = useState("");
  const [customNote, setCustomNote] = useState("");
  const [includeCodePreview, setIncludeCodePreview] = useState(false);
  const [posting, setPosting] = useState(false);

  const reset = () => {
    setMentionType("none");
    setRoleId("");
    setCustomNote("");
    setIncludeCodePreview(false);
  };

  const handlePost = async () => {
    if (!script) return;
    if (mentionType === "role" && !/^\d{5,25}$/.test(roleId.trim())) {
      toast({ variant: "destructive", title: "Invalid Role ID", description: "Paste a numeric Discord role ID." });
      return;
    }
    setPosting(true);
    try {
      const { error } = await supabase.functions.invoke("post-script-to-discord", {
        body: {
          scriptId: script.id,
          mentionType,
          roleId: mentionType === "role" ? roleId.trim() : undefined,
          customNote: customNote.trim() || undefined,
          includeCodePreview,
        },
      });
      if (error) {
        toast({ variant: "destructive", title: "Discord post failed", description: error.message });
      } else {
        toast({ title: "Posted to Discord!", description: script.title });
        reset();
        onOpenChange(false);
      }
    } finally {
      setPosting(false);
    }
  };

  const mentionOptions: { value: MentionType; label: string; desc: string }[] = [
    { value: "none", label: "No ping", desc: "Silent post" },
    { value: "everyone", label: "@everyone", desc: "Pings every member" },
    { value: "here", label: "@here", desc: "Pings online members only" },
    { value: "role", label: "Role", desc: "Ping a specific role" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Post to Discord</DialogTitle>
          <DialogDescription>
            {script ? <>Announce <strong>{script.title}</strong> in your Discord.</> : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="flex items-center gap-1.5 mb-2"><AtSign className="h-3.5 w-3.5" /> Mention</Label>
            <div className="grid grid-cols-2 gap-2">
              {mentionOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMentionType(opt.value)}
                  className={`text-left p-2.5 rounded-lg border text-xs transition-colors ${
                    mentionType === opt.value
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:bg-secondary/60"
                  }`}
                >
                  <div className="font-semibold">{opt.label}</div>
                  <div className="text-muted-foreground">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {mentionType === "role" && (
            <div>
              <Label htmlFor="role-id">Role ID</Label>
              <Input
                id="role-id"
                placeholder="e.g. 123456789012345678"
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground mt-1">
                In Discord: enable Developer Mode → right-click role → Copy ID.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="note">Custom note (optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g. Massive update — 5x faster auto-farm! 🔥"
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              rows={2}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">{customNote.length}/500</p>
          </div>

          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={includeCodePreview}
              onChange={(e) => setIncludeCodePreview(e.target.checked)}
              className="rounded"
            />
            Include short code preview (first 6 lines)
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={posting}>Cancel</Button>
          <Button onClick={handlePost} disabled={posting} className="gap-2">
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Post to Discord
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import { useState } from "react";
import { Search, Loader2, BadgeCheck, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type RobloxUser = { id: number; name: string; displayName: string; hasVerifiedBadge?: boolean; avatarUrl?: string };

// Reusable Roblox account chooser for the "Fix device" flow.
// Two modes: search by username (shows avatar + display name so the user can confirm it's
// really them) OR type the numeric UserId directly. Emits the chosen id via onChange.
export function RobloxUserField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [mode, setMode] = useState<"username" | "id">("username");
  const [uname, setUname] = useState("");
  const [busy, setBusy] = useState(false);
  const [user, setUser] = useState<RobloxUser | null>(null);
  const [err, setErr] = useState("");

  const lookup = async (body: { username?: string; user_id?: string }) => {
    setBusy(true); setErr("");
    try {
      const { data, error } = await supabase.functions.invoke("roblox-lookup", { body });
      if (error || data?.success === false) { setErr(data?.error || error?.message || "Lookup failed."); setUser(null); return; }
      setUser(data.user);
      onChange(String(data.user.id));
    } catch { setErr("Network error — try again."); }
    finally { setBusy(false); }
  };

  const searchUsername = () => {
    const u = uname.trim();
    if (u.length < 3) { setErr("Enter your Roblox username."); return; }
    lookup({ username: u });
  };
  const confirmId = () => {
    const id = value.trim();
    if (!/^\d{2,20}$/.test(id)) { setErr("Enter a valid UserId (numbers only)."); return; }
    lookup({ user_id: id });
  };
  const reset = () => { setUser(null); setErr(""); };

  const tabCls = (active: boolean) =>
    `flex-1 text-xs font-medium py-1.5 rounded-md transition ${active ? "bg-primary text-primary-foreground" : "bg-secondary/50 text-muted-foreground hover:text-foreground"}`;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 p-1 rounded-lg bg-background/50 border border-border">
        <button type="button" disabled={disabled} className={tabCls(mode === "username")} onClick={() => { setMode("username"); reset(); }}>Search by username</button>
        <button type="button" disabled={disabled} className={tabCls(mode === "id")} onClick={() => { setMode("id"); reset(); }}>Enter UserId</button>
      </div>

      {user ? (
        <div className="flex items-center gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
          {user.avatarUrl
            ? <img src={user.avatarUrl} alt={user.name} className="h-14 w-14 rounded-full bg-secondary object-cover shrink-0" />
            : <div className="h-14 w-14 rounded-full bg-secondary flex items-center justify-center shrink-0"><User className="h-6 w-6 text-muted-foreground" /></div>}
          <div className="min-w-0 flex-1">
            <p className="font-semibold flex items-center gap-1 truncate">{user.displayName}{user.hasVerifiedBadge && <BadgeCheck className="h-4 w-4 text-primary shrink-0" />}</p>
            <p className="text-xs text-muted-foreground truncate">@{user.name} · UserId {user.id}</p>
            <button type="button" onClick={reset} disabled={disabled} className="mt-1 text-xs text-primary hover:underline flex items-center gap-1"><RefreshCw className="h-3 w-3" /> Not you? Change</button>
          </div>
        </div>
      ) : mode === "username" ? (
        <div className="flex gap-2">
          <Input placeholder="Your Roblox username" value={uname} disabled={disabled || busy}
            onChange={(e) => setUname(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); searchUsername(); } }} />
          <Button type="button" onClick={searchUsername} disabled={disabled || busy} className="shrink-0 gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Search
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input placeholder="e.g. 11627930451" inputMode="numeric" value={value} disabled={disabled || busy}
            onChange={(e) => { onChange(e.target.value.replace(/\D/g, "")); if (err) setErr(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); confirmId(); } }} />
          <Button type="button" variant="outline" onClick={confirmId} disabled={disabled || busy} className="shrink-0 gap-1.5">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <User className="h-4 w-4" />} Check
          </Button>
        </div>
      )}

      {err && <p className="text-xs text-destructive">{err}</p>}
      {mode === "id" && !user && <p className="text-xs text-muted-foreground">Find it in your profile URL: roblox.com/users/<b>YOUR-ID</b>/profile</p>}
    </div>
  );
}

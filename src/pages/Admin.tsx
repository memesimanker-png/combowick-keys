import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useIsAdmin, useIsSuperAdmin, useAdminTabs, ALL_ADMIN_TABS, type AdminTab } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Loader2, Sparkles, Plus, Save, Trash2, Edit, Key, Users, Code, Eye, EyeOff, Copy, UserCheck, Mail, MailOpen, MailX, Bell, ShieldCheck, ShieldAlert, Shield, MessageSquare, Upload, ImageIcon, X, Wrench, Search, RefreshCw, Ban, ArrowLeftRight, Clock, MousePointerClick, Megaphone } from "lucide-react";
import { useAllScripts } from "@/hooks/useScripts";
import { CATEGORIES } from "@/lib/scripts-data";
import { Navigate, Link } from "react-router-dom";
import { DiscordPostDialog } from "@/components/DiscordPostDialog";
import { compressImage } from "@/lib/image-compress";
import { PAID_GAMES } from "@/lib/paid-games";
import { useQueryClient } from "@tanstack/react-query";

const DEFAULT_SCRIPT_CODE = `loadstring(game:HttpGet('https://raw.githubusercontent.com/checkurasshole/Script/refs/heads/main/IQ'))();`;
const LOADER_API_BASE = "https://vcuwjyjkbtxccywzeadu.supabase.co/functions/v1/public-api/repos/checkurasshole/Loaders/files";

const getLoaderFileName = (game: string) => game
  .replace(/[^a-zA-Z0-9 ]/g, "")
  .split(/\s+/)
  .filter(Boolean)
  .map(w => w.charAt(0).toUpperCase() + w.slice(1))
  .join("");

const getLoaderCode = (fileName: string) => `loadstring(game:HttpGet('https://raw.githubusercontent.com/checkurasshole/Loaders/refs/heads/main/${fileName}'))();`;

const emptyScript = {
  title: "", slug: "", description: "", longDescription: "",
  game: "", category: "Utility", tags: [] as string[],
  code: DEFAULT_SCRIPT_CODE, faqs: [] as { question: string; answer: string }[],
  trending: false, verified: true, gameUniverseId: "" as string,
  youtube_url: "" as string, is_paid: false, gameUrl: "" as string,
  thumbnail_url: "" as string,
};

export default function Admin() {
  const { isAdmin, loading, user } = useIsAdmin();
  const { isSuperAdmin } = useIsSuperAdmin();
  const { tabs: allowedTabs, loading: tabsLoading } = useAdminTabs();
  const { toast } = useToast();
  const can = (t: AdminTab) => isSuperAdmin || allowedTabs.includes(t);

  if (loading || tabsLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const defaultTab = (allowedTabs[0] as string) || "scripts";

  if (!user) return <Navigate to="/login" replace />;
  if (!isAdmin) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h1 className="text-2xl font-bold font-heading">Access Denied</h1>
          <p className="text-muted-foreground">You don't have admin privileges.</p>
          <Link to="/"><Button variant="outline">Go Home</Button></Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold font-heading">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Super Admin
              </span>
            )}
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>

        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="bg-secondary/50 flex-wrap h-auto">
            {can("scripts") && <TabsTrigger value="scripts" className="gap-2" title="Manage all scripts (create, edit, delete, send notifications)"><Code className="h-4 w-4" /> Scripts</TabsTrigger>}
            {can("scripts") && <TabsTrigger value="paid-scripts" className="gap-2" title="Show or hide paid game scripts on the Premium page"><EyeOff className="h-4 w-4" /> Paid Scripts</TabsTrigger>}
            {can("scripts") && <TabsTrigger value="announcements" className="gap-2" title="Push announcements to the Roblox loader API"><Megaphone className="h-4 w-4" /> Announcements</TabsTrigger>}
            {can("orders") && <TabsTrigger value="orders" className="gap-2" title="View premium key purchase orders and payments"><Key className="h-4 w-4" /> Orders</TabsTrigger>}
            {can("generate") && <TabsTrigger value="generate" className="gap-2" title="Manually generate a premium key for a customer"><Plus className="h-4 w-4" /> Generate Key</TabsTrigger>}
            {can("accounts") && <TabsTrigger value="accounts" className="gap-2" title="Manage legacy private inventory"><UserCheck className="h-4 w-4" /> Inventory</TabsTrigger>}
            {can("messages") && <TabsTrigger value="messages" className="gap-2" title="Read and reply to contact form messages"><Mail className="h-4 w-4" /> Messages</TabsTrigger>}
            {can("users") && <TabsTrigger value="users" className="gap-2" title="View and manage registered user accounts"><Users className="h-4 w-4" /> Users</TabsTrigger>}
            {can("admins") && <TabsTrigger value="admins" className="gap-2" title="Grant or revoke admin/moderator access"><ShieldAlert className="h-4 w-4" /> Admins</TabsTrigger>}
            <TabsTrigger value="keytools" className="gap-2" title="Inspect, extend, revoke, or transfer any HWID key"><Wrench className="h-4 w-4" /> Key Tools</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="settings" className="gap-2" title="Edit Discord webhook and other site settings"><MessageSquare className="h-4 w-4" /> Settings</TabsTrigger>}
          </TabsList>

          {can("scripts") && <TabsContent value="scripts"><ScriptsTab /></TabsContent>}
          {can("scripts") && <TabsContent value="paid-scripts"><PaidScriptsTab /></TabsContent>}
          {can("scripts") && <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>}
          {can("orders") && <TabsContent value="orders"><OrdersTab /></TabsContent>}
          {can("generate") && <TabsContent value="generate"><GenerateKeyTab /></TabsContent>}
          {can("accounts") && <TabsContent value="accounts"><AccountsTab /></TabsContent>}
          {can("messages") && <TabsContent value="messages"><MessagesTab /></TabsContent>}
          {can("users") && <TabsContent value="users"><UsersTab /></TabsContent>}
          {can("admins") && <TabsContent value="admins"><AdminsTab /></TabsContent>}
          <TabsContent value="keytools"><KeyToolsTab /></TabsContent>
          {isSuperAdmin && <TabsContent value="settings"><SettingsTab /></TabsContent>}
        </Tabs>
      </main>
    </Layout>
  );
}

/* ─── Generate Key Tab ─── */
function GenerateKeyTab() {
  const { toast } = useToast();
  const [tier, setTier] = useState("trial-7day");
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<{ key: string; expires_at: string; tier: string } | null>(null);
  const [customHours, setCustomHours] = useState<string>("24");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [customAmount, setCustomAmount] = useState<string>("0");

  const inputCls = "w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  const presets = [
    { label: "1 Hour", hours: 1 },
    { label: "6 Hours", hours: 6 },
    { label: "12 Hours", hours: 12 },
    { label: "1 Day", hours: 24 },
    { label: "3 Days", hours: 72 },
    { label: "7 Days", hours: 168 },
    { label: "14 Days", hours: 336 },
    { label: "30 Days", hours: 720 },
    { label: "90 Days", hours: 2160 },
    { label: "1 Year", hours: 8760 },
  ];

  const handleGenerate = async () => {
    setGenerating(true);
    setGeneratedKey(null);
    try {
      const isCustom = tier === "custom";
      const hours = isCustom ? Math.max(1, Math.floor(Number(customHours) || 0)) : undefined;
      if (isCustom && (!hours || hours < 1)) {
        toast({ variant: "destructive", title: "Invalid duration", description: "Enter hours >= 1" });
        setGenerating(false);
        return;
      }
      const { data, error } = await supabase.functions.invoke("admin-generate-key", {
        body: {
          tier,
          customer_email: email.trim() || undefined,
          custom_hours: hours,
          custom_label: isCustom ? (customLabel.trim() || `Custom ${hours}h`) : undefined,
          custom_amount: isCustom ? Number(customAmount) || 0 : undefined,
        },
      });
      if (error) throw error;
      if (data?.success) {
        setGeneratedKey(data);
        toast({ title: "Key Generated!", description: `${data.tier} key created successfully.` });
      } else {
        toast({ variant: "destructive", title: "Error", description: data?.error || "Failed to generate key" });
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "Error", description: e.message });
    } finally {
      setGenerating(false);
    }
  };

  const copyKey = () => {
    if (generatedKey?.key) {
      navigator.clipboard.writeText(generatedKey.key);
      toast({ title: "Copied!", description: "Key copied to clipboard." });
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-semibold">Generate Premium Key</h2>
      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">Tier *</label>
          <select value={tier} onChange={e => setTier(e.target.value)} className={inputCls}>
            <option value="trial-7day">3-Day Trial ($5)</option>
            <option value="monthly">Monthly Access ($9.99)</option>
            <option value="lifetime">Lifetime Key ($49.99)</option>
            <option value="custom">⚙ Custom Duration</option>
          </select>
        </div>
        {tier === "custom" && (
          <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
            <div>
              <label className="text-xs font-medium mb-1 block text-muted-foreground">Quick presets</label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map(p => (
                  <button
                    key={p.hours}
                    type="button"
                    onClick={() => { setCustomHours(String(p.hours)); setCustomLabel(p.label); }}
                    className="px-2.5 py-1 text-xs rounded border border-border bg-secondary/50 hover:bg-primary/20 hover:border-primary/50 transition"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Duration (hours) *</label>
              <input
                type="number"
                min="1"
                value={customHours}
                onChange={e => setCustomHours(e.target.value)}
                className={inputCls}
                placeholder="e.g. 24 for 1 day, 168 for 7 days"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Examples: 1=1hr, 24=1day, 168=7days, 720=30days, 8760=1year
              </p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Label (optional)</label>
              <input
                value={customLabel}
                onChange={e => setCustomLabel(e.target.value)}
                className={inputCls}
                placeholder="e.g. VIP Weekend Pass"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Amount USD (optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={customAmount}
                onChange={e => setCustomAmount(e.target.value)}
                className={inputCls}
                placeholder="0.00"
              />
            </div>
          </div>
        )}
        <div>
          <label className="text-sm font-medium mb-1 block">Customer Email (optional)</label>
          <input value={email} onChange={e => setEmail(e.target.value)} className={inputCls} placeholder="customer@example.com" />
        </div>
        <Button onClick={handleGenerate} disabled={generating} className="w-full" title="Create a new premium key with the chosen tier and email it to the customer if provided">
          {generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Key className="mr-2 h-4 w-4" />}
          Generate Key
        </Button>

        {generatedKey && (
          <div className="mt-4 p-4 rounded-lg border border-green-500/30 bg-green-500/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-green-400">Generated Key:</span>
              <Button size="sm" variant="ghost" onClick={copyKey} className="text-green-400 hover:text-green-300" title="Copy the generated key to clipboard">
                <Copy className="h-3 w-3 mr-1" /> Copy
              </Button>
            </div>
            <code className="block text-sm font-mono text-green-500 break-all select-all">{generatedKey.key}</code>
            <p className="text-xs text-muted-foreground">Tier: {generatedKey.tier} • Expires: {new Date(generatedKey.expires_at).toLocaleDateString()}</p>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Paid Scripts Visibility Tab ─── */
type PaidScriptSetting = {
  hidden: boolean;
  paused: boolean;
  pause_message: string | null;
  title: string | null;
  subtitle: string | null;
  features: string[] | null;
  warning: string | null;
  monthly_price: number | null;
  lifetime_price: number | null;
  monthly_note: string | null;
  lifetime_note: string | null;
  hide_monthly: boolean;
  hide_lifetime: boolean;
};

type PaidScriptDraft = {
  title: string;
  subtitle: string;
  features: string;
  warning: string;
  monthly_price: string;
  lifetime_price: string;
  monthly_note: string;
  lifetime_note: string;
  pause_message: string;
};

const emptyPaidSetting: PaidScriptSetting = {
  hidden: false,
  paused: false,
  pause_message: null,
  title: null,
  subtitle: null,
  features: null,
  warning: null,
  monthly_price: null,
  lifetime_price: null,
  monthly_note: null,
  lifetime_note: null,
  hide_monthly: false,
  hide_lifetime: false,
};

const paidDraftFor = (game: (typeof PAID_GAMES)[number], setting?: PaidScriptSetting): PaidScriptDraft => ({
  title: setting?.title ?? game.title,
  subtitle: setting?.subtitle ?? game.subtitle,
  features: (setting?.features?.length ? setting.features : game.features).join("\n"),
  warning: setting?.warning ?? game.warning ?? "",
  monthly_price: String(setting?.monthly_price ?? game.monthlyPrice),
  lifetime_price: String(setting?.lifetime_price ?? game.lifetimePrice ?? ""),
  monthly_note: setting?.monthly_note ?? game.monthlyNote ?? "",
  lifetime_note: setting?.lifetime_note ?? game.lifetimeNote ?? "",
  pause_message: setting?.pause_message ?? "",
});

function PaidScriptsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<Record<string, PaidScriptSetting>>({});
  const [drafts, setDrafts] = useState<Record<string, PaidScriptDraft>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("paid_script_settings")
        .select("game_key, hidden, paused, pause_message, title, subtitle, features, warning, monthly_price, lifetime_price, monthly_note, lifetime_note, hide_monthly, hide_lifetime");
      if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
      const map: Record<string, PaidScriptSetting> = {};
      const d: Record<string, PaidScriptDraft> = {};
      (data || []).forEach((r: any) => {
        const game = PAID_GAMES.find((g) => g.key === r.game_key);
        map[r.game_key] = {
          hidden: !!r.hidden,
          paused: !!r.paused,
          pause_message: r.pause_message ?? null,
          title: r.title ?? null,
          subtitle: r.subtitle ?? null,
          features: Array.isArray(r.features) ? r.features : null,
          warning: r.warning ?? null,
          monthly_price: r.monthly_price == null ? null : Number(r.monthly_price),
          lifetime_price: r.lifetime_price == null ? null : Number(r.lifetime_price),
          monthly_note: r.monthly_note ?? null,
          lifetime_note: r.lifetime_note ?? null,
          hide_monthly: !!r.hide_monthly,
          hide_lifetime: !!r.hide_lifetime,
        };
        if (game) d[r.game_key] = paidDraftFor(game, map[r.game_key]);
      });
      setSettings(map);
      setDrafts(d);
      setLoading(false);
    })();
  }, []);

  const persist = async (key: string, patch: Partial<PaidScriptSetting>) => {
    const current = settings[key] || emptyPaidSetting;
    const next = { ...current, ...patch };
    setSavingKey(key);
    const { error } = await supabase
      .from("paid_script_settings")
      .upsert({ game_key: key, ...next, updated_at: new Date().toISOString() } as any, { onConflict: "game_key" });
    setSavingKey(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setSettings(prev => ({ ...prev, [key]: next }));
    queryClient.invalidateQueries({ queryKey: ["paid-script-settings"] });
    toast({ title: "Saved", description: key });
  };

  const saveDetails = async (game: (typeof PAID_GAMES)[number]) => {
    const draft = drafts[game.key] ?? paidDraftFor(game, settings[game.key]);
    const monthly = Number(draft.monthly_price);
    const lifetimeRaw = draft.lifetime_price.trim();
    const lifetime = lifetimeRaw ? Number(lifetimeRaw) : null;

    if (!Number.isFinite(monthly) || monthly < 1) {
      toast({ title: "Invalid monthly price", description: "Monthly price must be at least $1.", variant: "destructive" });
      return;
    }
    if (lifetimeRaw && (!Number.isFinite(lifetime) || lifetime < 0)) {
      toast({ title: "Invalid lifetime price", description: "Lifetime price must be blank, 0, or higher.", variant: "destructive" });
      return;
    }

    const features = draft.features
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean);

    await persist(game.key, {
      title: draft.title.trim() || game.title,
      subtitle: draft.subtitle.trim(),
      features: features.length ? features : game.features,
      warning: draft.warning.trim(),
      monthly_price: Number(monthly.toFixed(2)),
      lifetime_price: lifetime === null ? null : Number(lifetime.toFixed(2)),
      monthly_note: draft.monthly_note.trim(),
      lifetime_note: draft.lifetime_note.trim(),
      pause_message: draft.pause_message.trim() || null,
    });
  };

  const patchDraft = (key: string, game: (typeof PAID_GAMES)[number], patch: Partial<PaidScriptDraft>) => {
    setDrafts(prev => ({ ...prev, [key]: { ...(prev[key] ?? paidDraftFor(game, settings[key])), ...patch } }));
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <div className="max-w-5xl space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Paid Game Scripts</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Edit paid-game prices, descriptions, visibility, and purchase status.
        </p>
      </div>
      <div className="space-y-3">
        {PAID_GAMES.map((g) => {
          const s = settings[g.key] || emptyPaidSetting;
          const draft = drafts[g.key] ?? paidDraftFor(g, s);
          return (
            <Card key={g.key} className="p-4 space-y-3">
              <div className="flex items-center gap-4">
                <img src={g.thumbnail} alt={g.title} className="h-12 w-20 object-cover rounded-md flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{g.title}</div>
                  <div className="text-xs text-muted-foreground truncate">{g.game}</div>
                </div>
                <span className={`text-xs font-medium ${s.hidden ? "text-destructive" : s.paused ? "text-yellow-500" : "text-green-500"}`}>
                  {s.hidden ? "Hidden" : s.paused ? "Paused" : "Live"}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={s.hidden ? "default" : "outline"}
                  disabled={savingKey === g.key}
                  onClick={() => persist(g.key, { hidden: !s.hidden })}
                >
                  {s.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  <span className="ml-1.5">{s.hidden ? "Show" : "Hide"}</span>
                </Button>
                <Button
                  size="sm"
                  variant={s.paused ? "default" : "outline"}
                  disabled={savingKey === g.key}
                  onClick={() => persist(g.key, { paused: !s.paused })}
                >
                  {savingKey === g.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                  <span className="ml-1.5">{s.paused ? "Resume Buying" : "Pause Buying"}</span>
                </Button>
                <Button
                  size="sm"
                  variant={s.hide_monthly ? "default" : "outline"}
                  disabled={savingKey === g.key}
                  onClick={() => persist(g.key, { hide_monthly: !s.hide_monthly })}
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="ml-1.5">{s.hide_monthly ? "Enable Monthly" : "Disable Monthly"}</span>
                </Button>
                <Button
                  size="sm"
                  variant={s.hide_lifetime ? "default" : "outline"}
                  disabled={savingKey === g.key}
                  onClick={() => persist(g.key, { hide_lifetime: !s.hide_lifetime })}
                >
                  <Shield className="h-4 w-4" />
                  <span className="ml-1.5">{s.hide_lifetime ? "Enable Lifetime" : "Disable Lifetime"}</span>
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Card title</label>
                  <input
                    value={draft.title}
                    onChange={(e) => patchDraft(g.key, g, { title: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Short description</label>
                  <input
                    value={draft.subtitle}
                    onChange={(e) => patchDraft(g.key, g, { subtitle: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Monthly price</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={draft.monthly_price}
                    onChange={(e) => patchDraft(g.key, g, { monthly_price: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Lifetime price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={draft.lifetime_price}
                    onChange={(e) => patchDraft(g.key, g, { lifetime_price: e.target.value })}
                    placeholder="Leave blank to hide"
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Monthly note</label>
                  <input
                    value={draft.monthly_note}
                    onChange={(e) => patchDraft(g.key, g, { monthly_note: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block text-muted-foreground">Lifetime note</label>
                  <input
                    value={draft.lifetime_note}
                    onChange={(e) => patchDraft(g.key, g, { lifetime_note: e.target.value })}
                    className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Feature list</label>
                <textarea
                  value={draft.features}
                  onChange={(e) => patchDraft(g.key, g, { features: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="text-xs font-medium mb-1 block text-muted-foreground">Warning text</label>
                <input
                  value={draft.warning}
                  onChange={(e) => patchDraft(g.key, g, { warning: e.target.value })}
                  className="w-full rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div className="flex gap-2">
                <input
                  value={draft.pause_message}
                  onChange={(e) => patchDraft(g.key, g, { pause_message: e.target.value })}
                  placeholder="Pause message e.g. In progress, come back later"
                  className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <Button
                  size="sm"
                  variant="outline"
                  disabled={savingKey === g.key}
                  onClick={() => persist(g.key, { pause_message: draft.pause_message.trim() || null })}
                >
                  <Save className="h-4 w-4" /><span className="ml-1.5">Save Msg</span>
                </Button>
              </div>

              <Button
                disabled={savingKey === g.key}
                onClick={() => saveDetails(g)}
                className="w-full"
              >
                {savingKey === g.key ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save Price + Description
              </Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


function ScriptsTab() {
  const { data: scripts = [], refetch } = useAllScripts();
  const [form, setForm] = useState({ ...emptyScript });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [notifyingId, setNotifyingId] = useState<string | null>(null);
  const [discordTarget, setDiscordTarget] = useState<{ id: string; title: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const { toast } = useToast();

  const set = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleThumbnailUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please choose an image file", variant: "destructive" });
      return;
    }
    setUploadingThumb(true);
    try {
      const compressed = await compressImage(file, { maxDim: 800, quality: 0.82 });
      const ext = compressed.name.split(".").pop() || "jpg";
      const path = `${form.slug || "script"}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("script-thumbnails")
        .upload(path, compressed, { cacheControl: "31536000", upsert: false, contentType: compressed.type });
      if (error) throw error;
      const { data } = supabase.storage.from("script-thumbnails").getPublicUrl(path);
      set("thumbnail_url", data.publicUrl);
      const kb = Math.round(compressed.size / 1024);
      const origKb = Math.round(file.size / 1024);
      toast({ title: "Thumbnail uploaded", description: `Compressed ${origKb}KB → ${kb}KB` });
    } catch (e: any) {
      toast({ title: "Upload failed", description: e.message, variant: "destructive" });
    } finally {
      setUploadingThumb(false);
    }
  };

  const aiAutofill = async () => {
    if (!form.code.trim()) { toast({ title: "Paste script code first", variant: "destructive" }); return; }
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-script-autofill", {
        body: {
          code: form.code,
          existing: {
            title: form.title || undefined,
            slug: form.slug || undefined,
            description: form.description || undefined,
            longDescription: form.longDescription || undefined,
            game: form.game || undefined,
            category: form.category && form.category !== "Utility" ? form.category : undefined,
            tags: form.tags.length ? form.tags : undefined,
          },
        },
      });
      if (error) throw error;
      const filled: string[] = [];
      setForm(prev => {
        const next = { ...prev };
        if (!prev.title && data.title) { next.title = data.title; filled.push("title"); }
        if (!prev.slug && data.slug) { next.slug = data.slug; filled.push("slug"); }
        if (!prev.description && data.description) { next.description = data.description; filled.push("description"); }
        if (!prev.longDescription && data.longDescription) { next.longDescription = data.longDescription; filled.push("long description"); }
        if (!prev.game && data.game) { next.game = data.game; filled.push("game"); }
        if ((!prev.category || prev.category === "Utility") && data.category) { next.category = data.category; filled.push("category"); }
        if (!prev.tags.length && data.tags?.length) { next.tags = data.tags; filled.push("tags"); }
        if (!prev.faqs.length && data.faqs?.length) { next.faqs = data.faqs; filled.push("faqs"); }
        return next;
      });
      toast({
        title: filled.length ? `AI filled: ${filled.join(", ")}` : "All fields already filled — manual input preserved",
      });
    } catch (e: any) { toast({ title: "AI autofill failed", description: e.message, variant: "destructive" }); }
    finally { setAiLoading(false); }
  };

  const save = async () => {
    if (!form.title || !form.slug || !form.code || !form.game || !form.category) {
      toast({ title: "Fill required fields", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      let finalCode = form.code;
      const loaderFileName = getLoaderFileName(form.game);
      if (!editingId && loaderFileName && form.code.trim() === DEFAULT_SCRIPT_CODE) {
        const res = await fetch(`${LOADER_API_BASE}/${loaderFileName}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: DEFAULT_SCRIPT_CODE, message: `Add loader for ${form.game}` }),
        });
        if (!res.ok) {
          const txt = await res.text();
          throw new Error(`GitHub loader failed (${res.status}): ${txt.slice(0, 180)}`);
        }
        finalCode = getLoaderCode(loaderFileName);
        toast({ title: `GitHub loader created: ${loaderFileName}` });
      }

      // Auto-build a Roblox URL when admin pastes just a place ID (digits only)
      const rawGameUrl = form.gameUrl.trim();
      const builtGameUrl = /^\d+$/.test(rawGameUrl)
        ? `https://www.roblox.com/games/${rawGameUrl}`
        : (rawGameUrl || null);
      const payload = {
        title: form.title, slug: form.slug, description: form.description,
        long_description: form.longDescription, game: form.game, category: form.category,
        tags: form.tags, code: finalCode, faqs: form.faqs as any,
        trending: form.trending, verified: form.verified,
        game_universe_id: form.gameUniverseId ? Number(form.gameUniverseId) : null,
        youtube_url: form.youtube_url || null,
        is_paid: form.is_paid,
        game_url: builtGameUrl,
        thumbnail_url: form.thumbnail_url || null,
      };
      if (editingId) {
        const { error } = await supabase.from("scripts").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Script updated" });
      } else {
        const { error } = await supabase.from("scripts").insert(payload);
        if (error) throw error;
        toast({ title: "Script saved" });
        // Auto-broadcast in-app notification to every user
        try {
          const { data: count } = await supabase.rpc("broadcast_notification", {
            _title: `New script: ${form.title}`,
            _body: form.description?.slice(0, 140) || `Fresh ${form.game} script just dropped.`,
            _link: `/scripts/${form.slug}`,
            _type: "info",
          });
          toast({ title: `Notified ${count ?? 0} users` });
        } catch (notifyErr: any) {
          toast({ title: "Notify failed", description: notifyErr.message, variant: "destructive" });
        }
      }
      setForm({ ...emptyScript });
      setEditingId(null);
      setShowForm(false);
      refetch();
    } catch (e: any) { toast({ title: "Save failed", description: e.message, variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const deleteScript = async (id: string) => {
    if (!confirm("Delete this script?")) return;
    const { error } = await supabase.from("scripts").delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); refetch(); }
  };

  const editScript = (s: any) => {
    setForm({
      title: s.title, slug: s.slug, description: s.description,
      longDescription: s.long_description || "", game: s.game, category: s.category,
      tags: s.tags || [], code: s.code, faqs: s.faqs || [],
      trending: !!s.trending, verified: !!s.verified,
      gameUniverseId: s.game_universe_id ? String(s.game_universe_id) : "",
      youtube_url: s.youtube_url || "",
      is_paid: !!s.is_paid,
      gameUrl: s.game_url || "",
      thumbnail_url: s.thumbnail_url || "",
    });
    setEditingId(s.id);
    setShowForm(true);
  };

  const addTag = () => {
    if (tagInput.trim() && !form.tags.includes(tagInput.trim())) {
      set("tags", [...form.tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const inputCls = "w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{scripts.length} Scripts</h2>
        <Button onClick={() => { setForm({ ...emptyScript }); setEditingId(null); setShowForm(!showForm); }} title={showForm ? "Close the script editor form" : "Open form to add a brand new script"}>
          <Plus className="h-4 w-4 mr-2" /> {showForm ? "Close Form" : "Add Script"}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4">
          <h3 className="font-semibold">{editingId ? "Edit Script" : "New Script"}</h3>
          <div>
            <label className="text-sm font-medium mb-1 block">Script Code *</label>
            <textarea value={form.code} onChange={e => set("code", e.target.value)} rows={5} className={`${inputCls} font-mono text-xs`} placeholder="Paste Lua code..." />
          </div>
          <Button onClick={aiAutofill} disabled={aiLoading} variant="outline" className="w-full" title="Use AI to auto-generate title, description, tags, and FAQs from the pasted code">
            {aiLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI Auto-Fill
          </Button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-sm font-medium mb-1 block">Title *</label><input value={form.title} onChange={e => set("title", e.target.value)} className={inputCls} /></div>
            <div><label className="text-sm font-medium mb-1 block">Slug *</label><input value={form.slug} onChange={e => set("slug", e.target.value)} className={inputCls} /></div>
            <div><label className="text-sm font-medium mb-1 block">Game *</label><input value={form.game} onChange={e => set("game", e.target.value)} className={inputCls} placeholder="e.g. Prison Life" /></div>
            <div><label className="text-sm font-medium mb-1 block">Game Universe ID</label><input value={form.gameUniverseId} onChange={e => set("gameUniverseId", e.target.value)} className={inputCls} placeholder="Roblox Universe ID for thumbnail" /></div>
            <div className="md:col-span-2"><label className="text-sm font-medium mb-1 block">🎮 Roblox Place ID or full URL <span className="text-muted-foreground font-normal">(auto-builds Play Game link)</span></label><input value={form.gameUrl} onChange={e => set("gameUrl", e.target.value)} className={inputCls} placeholder="e.g. 208050  →  becomes https://www.roblox.com/games/208050" /></div>
            <div><label className="text-sm font-medium mb-1 block">Category *</label>
              <select value={form.category} onChange={e => set("category", e.target.value)} className={inputCls}>
                {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Custom thumbnail upload (overrides Roblox auto-fetch) */}
          <div>
            <label className="text-sm font-medium mb-1 block">
              🖼️ Custom Thumbnail <span className="text-muted-foreground font-normal">(optional — overrides Roblox auto-thumbnail)</span>
            </label>
            <div className="flex items-center gap-3">
              {form.thumbnail_url ? (
                <div className="relative shrink-0">
                  <img src={form.thumbnail_url} alt="Thumbnail preview" className="w-16 h-16 rounded-lg object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => set("thumbnail_url", "")}
                    className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5 hover:scale-110 transition-transform"
                    title="Remove custom thumbnail"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-lg bg-secondary flex items-center justify-center border border-dashed border-border shrink-0">
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <label className={`${inputCls} flex-1 flex items-center justify-center gap-2 cursor-pointer hover:bg-secondary/70 transition-colors ${uploadingThumb ? "opacity-50 pointer-events-none" : ""}`}>
                {uploadingThumb ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                <span>{uploadingThumb ? "Compressing & uploading…" : (form.thumbnail_url ? "Replace image" : "Choose image (auto-compressed)")}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingThumb}
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleThumbnailUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Any size accepted — automatically resized to max 800px and compressed to keep load fast.
            </p>
          </div>
          <div><label className="text-sm font-medium mb-1 block">Short Description</label><input value={form.description} onChange={e => set("description", e.target.value)} className={inputCls} /></div>
          <div><label className="text-sm font-medium mb-1 block">Long Description</label><textarea value={form.longDescription} onChange={e => set("longDescription", e.target.value)} rows={3} className={inputCls} /></div>
          <div>
            <label className="text-sm font-medium mb-1 block">🎬 YouTube Video URL (optional)</label>
            <input
              value={form.youtube_url}
              onChange={e => set("youtube_url", e.target.value)}
              className={inputCls}
              placeholder="https://www.youtube.com/watch?v=..."
            />
            <p className="text-[11px] text-muted-foreground mt-1">Embed a tutorial video on the script detail page.</p>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Tags</label>
            <div className="flex gap-2 mb-2">
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addTag())} className={`${inputCls} flex-1`} placeholder="Add tag..." />
              <Button onClick={addTag} size="sm" variant="outline" title="Add tag"><Plus className="h-3 w-3" /></Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map(t => (
                <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-destructive/20 hover:text-destructive" onClick={() => set("tags", form.tags.filter(x => x !== t))}>#{t} ×</span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-6 flex-wrap">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.trending} onChange={e => set("trending", e.target.checked)} className="rounded" /> Trending</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.verified} onChange={e => set("verified", e.target.checked)} className="rounded" /> Verified</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-yellow-400"><input type="checkbox" checked={form.is_paid} onChange={e => set("is_paid", e.target.checked)} className="rounded" /> 💰 Paid Script</label>
          </div>
          <Button onClick={save} disabled={saving} className="w-full" title={editingId ? "Save changes to this script" : "Publish this script to the public hub"}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            {editingId ? "Update Script" : "Save Script"}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {scripts.map(s => (
          <Card key={s.id} className="p-4 flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{s.title}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-secondary text-muted-foreground">{s.category}</span>
                {s.trending && <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">🔥</span>}
              </div>
              <p className="text-xs text-muted-foreground truncate">{s.game} • {s.slug}</p>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <Button
                size="sm"
                variant="outline"
                title="🔔 In-app notification only — sends a bell-icon alert to every signed-up user (NOT an email). Bulk marketing emails aren't supported."
                disabled={notifyingId === s.id}
                onClick={async () => {
                  if (notifyingId) return;
                  if (!confirm(`Send an IN-APP notification (🔔 bell icon) to all signed-up users about "${s.title}"?\n\nThis does NOT send an email — bulk marketing emails are not supported.`)) return;
                  setNotifyingId(s.id);
                  try {
                    const { data, error } = await supabase.rpc("broadcast_notification", {
                      _title: `New script: ${s.title}`,
                      _body: s.description?.slice(0, 140) || `Check out the new ${s.game} script.`,
                      _link: `/scripts/${s.slug}`,
                      _type: "script",
                    });
                    if (error) {
                      toast({ variant: "destructive", title: "Failed", description: error.message });
                    } else {
                      toast({ title: "Notified!", description: `Sent to ${data} users.` });
                    }
                  } finally {
                    setNotifyingId(null);
                  }
                }}
              >
                {notifyingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Bell className="h-3 w-3" />}
              </Button>
              <Button
                size="sm"
                variant="outline"
                title="📣 Post this script to your Discord webhook (rich embed + optional @everyone / @here / role ping)."
                onClick={() => setDiscordTarget({ id: s.id, title: s.title })}
              >
                <MessageSquare className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => editScript(s)} title="Edit script"><Edit className="h-3 w-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => deleteScript(s.id)} title="Delete script permanently"><Trash2 className="h-3 w-3" /></Button>
            </div>
          </Card>
        ))}
      </div>
      <DiscordPostDialog
        open={!!discordTarget}
        onOpenChange={(v) => { if (!v) setDiscordTarget(null); }}
        script={discordTarget}
      />
    </div>
  );
}

/* ─── Orders Tab ─── */
function OrdersTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("premium_key_purchases").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setOrders(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{orders.length} Orders</h2>
      {orders.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No orders yet</p>
      ) : (
        <div className="space-y-2">
          {orders.map(o => (
            <Card key={o.id} className="p-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{o.tier}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${o.status === "completed" ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>{o.status}</span>
                    {o.payment_id?.startsWith("ADMIN-") && (
                      <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400">Admin Generated</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{o.customer_email || "No email"} • ${o.amount} {o.currency}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Order ID:</span>
                    <code className="text-[11px] font-mono bg-secondary px-1.5 py-0.5 rounded break-all">{o.payment_id}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(o.payment_id)}
                      className="text-muted-foreground hover:text-foreground text-[10px] underline"
                      title="Copy order ID"
                    >copy</button>
                  </div>
                </div>
                <div className="text-right">
                  <KeyDisplay value={o.key_generated} />
                  <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString()}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function KeyDisplay({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-1">
      <code className="text-xs font-mono bg-secondary px-2 py-1 rounded">{show ? value : "••••••••"}</code>
      <button onClick={() => setShow(!show)} className="text-muted-foreground hover:text-foreground" title={show ? "Hide value" : "Reveal value"}>
        {show ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
      </button>
    </div>
  );
}

/* ─── Users Tab ─── */
function UsersTab() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => {
      setProfiles(data || []);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">{profiles.length} Users</h2>
      {profiles.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No users yet</p>
      ) : (
        <div className="space-y-2">
          {profiles.map(p => (
            <Card key={p.id} className="p-4 flex items-center justify-between">
              <div>
                <span className="font-medium text-sm">{p.display_name || "Unknown"}</span>
                <p className="text-xs text-muted-foreground">ID: {p.user_id?.slice(0, 8)}...</p>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</span>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Accounts Tab (read-only inventory) ─── */
function AccountsTab() {
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "available" | "claimed">("all");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("roblox_accounts")
        .select("id, username, password, package_size, claimed, claimed_at, claimed_by, created_at")
        .order("created_at", { ascending: false });
      if (error) {
        toast({ title: "Failed to load accounts", description: error.message, variant: "destructive" });
      } else {
        setAccounts(data || []);
      }
      setLoading(false);
    })();
  }, [toast]);

  const filtered = accounts.filter(a =>
    filter === "all" ? true : filter === "available" ? !a.claimed : a.claimed
  );

  const totalAvailable = accounts.filter(a => !a.claimed).length;
  const totalClaimed = accounts.filter(a => a.claimed).length;

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  const exportTxt = () => {
    const lines = filtered.map(a => `${a.username}:${a.password}  (size:${a.package_size}, ${a.claimed ? "CLAIMED" : "AVAILABLE"})`);
    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `legacy-inventory-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Total</p><p className="text-2xl font-bold">{accounts.length}</p></Card>
        <Card className="p-4 border-success/30"><p className="text-xs text-muted-foreground">Available</p><p className="text-2xl font-bold text-success">{totalAvailable}</p></Card>
        <Card className="p-4 border-muted"><p className="text-xs text-muted-foreground">Claimed</p><p className="text-2xl font-bold text-muted-foreground">{totalClaimed}</p></Card>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          {(["all", "available", "claimed"] as const).map(f => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)} className="capitalize">{f}</Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={exportTxt} disabled={!filtered.length} title="Export all visible accounts as a .txt file (user:pass per line)">
          <Copy className="h-4 w-4 mr-2" /> Export {filtered.length} as .txt
        </Button>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center border-dashed">
          <UserCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No accounts in this view.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => {
            const revealed = revealedIds.has(a.id);
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm font-semibold">{a.username}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${a.claimed ? "bg-muted text-muted-foreground" : "bg-success/15 text-success"}`}>
                        {a.claimed ? "CLAIMED" : "AVAILABLE"}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary">size {a.package_size}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground select-all">
                        {revealed ? a.password : "•".repeat(Math.min(a.password.length, 12))}
                      </span>
                      <button onClick={() => toggleReveal(a.id)} className="text-muted-foreground hover:text-foreground" title={revealed ? "Hide password" : "Show password"}>
                        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    {a.claimed && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Claimed {new Date(a.claimed_at).toLocaleString()} by {a.claimed_by?.slice(0, 8)}…
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => copy(a.username, "Username")} title="Copy username"><Copy className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => copy(a.password, "Password")} title="Copy password"><Key className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-4">
        Read-only private inventory view — removed from the public site.
      </p>
    </div>
  );
}

/* ─── Messages Tab (Contact form inbox) ─── */
function MessagesTab() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "read" | "archived">("all");
  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) {
      toast({ title: "Failed to load", description: error.message, variant: "destructive" });
      return;
    }
    setMessages(data ?? []);
  };

  useEffect(() => { load(); }, []);

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("contact_messages").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status } : m));
  };

  const sendReply = async (id: string) => {
    const text = (replyDraft[id] ?? "").trim();
    if (!text) {
      toast({ title: "Empty reply", description: "Type a reply first.", variant: "destructive" });
      return;
    }
    setSavingId(id);
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("contact_messages").update({
      admin_reply: text,
      replied_at: new Date().toISOString(),
      replied_by: userData?.user?.id ?? null,
      status: "read",
    }).eq("id", id);
    setSavingId(null);
    if (error) {
      toast({ title: "Reply failed", description: error.message, variant: "destructive" });
      return;
    }
    setMessages(prev => prev.map(m => m.id === id ? { ...m, admin_reply: text, replied_at: new Date().toISOString(), status: "read" } : m));
    setReplyDraft(prev => { const { [id]: _, ...rest } = prev; return rest; });
    toast({ title: "Reply saved", description: "User will see it in their dashboard." });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this message permanently?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    setMessages(prev => prev.filter(m => m.id !== id));
    toast({ title: "Deleted" });
  };

  const filtered = filter === "all" ? messages : messages.filter(m => m.status === filter);
  const counts = {
    all: messages.length,
    new: messages.filter(m => m.status === "new").length,
    read: messages.filter(m => m.status === "read").length,
    archived: messages.filter(m => m.status === "archived").length,
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold">Contact Form Inbox</h2>
        <div className="flex gap-2 text-xs">
          {(["all", "new", "read", "archived"] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md transition-colors ${filter === f ? "bg-primary text-primary-foreground" : "bg-secondary/60 text-muted-foreground hover:text-foreground"}`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">No messages in this view.</Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <Card key={m.id} className={`p-4 ${m.status === "new" ? "border-primary/40" : ""}`}>
              <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold">{m.subject}</h3>
                    {m.status === "new" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wider">New</span>}
                    {m.admin_reply && <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success uppercase tracking-wider">Replied</span>}
                    {m.status === "archived" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">Archived</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">
                    From <strong className="text-foreground">{m.name}</strong> &lt;{m.email}&gt; •{" "}
                    {new Date(m.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">{m.message}</p>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  {m.status !== "archived" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, "archived")} title="Move this message to the archive (hidden from active list)">
                      <MailX className="h-3.5 w-3.5 mr-1" /> Archive
                    </Button>
                  )}
                  {m.status === "new" && (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(m.id, "read")} title="Mark this message as read">
                      <MailOpen className="h-3.5 w-3.5 mr-1" /> Mark read
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(m.id)} title="Permanently delete this message">
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                  </Button>
                </div>
              </div>

              {/* Reply thread */}
              {m.admin_reply ? (
                <div className="mt-3 rounded-lg border border-success/30 bg-success/5 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-success mb-1">
                    Your reply • {m.replied_at ? new Date(m.replied_at).toLocaleString() : ""}
                  </p>
                  <p className="text-sm whitespace-pre-wrap break-words text-foreground/90">{m.admin_reply}</p>
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <textarea
                    className="w-full min-h-[80px] text-sm rounded-md border border-border bg-background p-2 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    placeholder="Write a reply — the user will see it in their dashboard…"
                    value={replyDraft[m.id] ?? ""}
                    onChange={(e) => setReplyDraft(prev => ({ ...prev, [m.id]: e.target.value }))}
                    maxLength={4000}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" disabled={savingId === m.id} onClick={() => sendReply(m.id)} title="Send your reply — the user will see it in their dashboard and receive an email">
                      {savingId === m.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Mail className="h-3.5 w-3.5 mr-1" />}
                      Send reply
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => window.open(`mailto:${m.email}?subject=${encodeURIComponent("Re: " + m.subject)}`, "_blank")} title="Open your local email client to reply manually">
                      Or open email client
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Admins Tab (super_admin only) ─── */
function AdminsTab() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Array<{ user_id: string; role: string; email?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "moderator">("admin");
  const [adding, setAdding] = useState(false);

  const inputCls = "w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id, role")
      .in("role", ["admin", "moderator", "super_admin"]);
    if (error) {
      toast({ variant: "destructive", title: "Failed to load", description: error.message });
      setLoading(false);
      return;
    }
    // Resolve emails (super_admin only via RPC)
    const enriched = await Promise.all((data || []).map(async (r: any) => {
      const { data: emailData } = await supabase.rpc("get_user_email" as any, { _user_id: r.user_id });
      return { ...r, email: (emailData as any) || r.user_id.slice(0, 8) + "…" };
    }));
    setRows(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const grant = async () => {
    if (!email.trim()) {
      toast({ variant: "destructive", title: "Email required" });
      return;
    }
    setAdding(true);
    const { error } = await supabase.rpc("grant_role_by_email" as any, { _email: email.trim(), _role: role });
    setAdding(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
      return;
    }
    toast({ title: "Role granted", description: `${email} is now a ${role}.` });
    setEmail("");
    load();
  };

  const revoke = async (user_id: string, r: string) => {
    if (r === "super_admin") {
      toast({ variant: "destructive", title: "Forbidden", description: "Cannot revoke super_admin from the dashboard." });
      return;
    }
    if (!confirm(`Revoke ${r} role for this user?`)) return;
    const { error } = await supabase.rpc("revoke_user_role" as any, { _user_id: user_id, _role: r });
    if (error) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
      return;
    }
    toast({ title: "Role revoked" });
    load();
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Card className="p-5 border-primary/20 bg-primary/5">
        <h2 className="font-semibold mb-1 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-primary" /> Add an admin or moderator</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Admins added here can manage scripts, accounts, messages, and users — but <strong>cannot view orders / purchases</strong>. Only the super-admin (you) sees those.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px_auto] gap-3">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={inputCls}
          />
          <select value={role} onChange={e => setRole(e.target.value as any)} className={inputCls}>
            <option value="admin">Admin</option>
            <option value="moderator">Moderator</option>
          </select>
          <Button onClick={grant} disabled={adding} title="Grant the entered user the selected role (admin or moderator)">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Grant
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Tip: the user must have already signed up at least once.
        </p>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Current staff ({rows.length})</h2>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : rows.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">No admins or moderators yet.</Card>
        ) : (
          <div className="space-y-2">
            {rows.map((r, i) => (
              <AdminRow
                key={`${r.user_id}-${r.role}-${i}`}
                row={r}
                onRevoke={() => revoke(r.user_id, r.role)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Single admin row with inline permissions editor ─── */
const MANAGEABLE_TABS: Array<{ key: AdminTab; label: string }> = [
  { key: "scripts", label: "Scripts" },
  { key: "orders", label: "Orders" },
  { key: "generate", label: "Generate Key" },
  { key: "accounts", label: "Accounts" },
  { key: "messages", label: "Messages" },
  { key: "users", label: "Users" },
  { key: "admins", label: "Admins" },
];

function AdminRow({ row, onRevoke }: { row: { user_id: string; role: string; email?: string }; onRevoke: () => void }) {
  const { toast } = useToast();
  const [tabs, setTabs] = useState<AdminTab[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isSuper = row.role === "super_admin";

  const loadTabs = async () => {
    if (loaded || isSuper) return;
    const { data } = await supabase
      .from("admin_permissions" as any)
      .select("tabs")
      .eq("user_id", row.user_id)
      .maybeSingle();
    const t = (data as any)?.tabs as string[] | undefined;
    setTabs((t && t.length ? t : ["scripts", "accounts", "messages", "users"]) as AdminTab[]);
    setLoaded(true);
  };

  const toggle = (t: AdminTab) => {
    setTabs(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.rpc("set_admin_tabs" as any, { _user_id: row.user_id, _tabs: tabs });
    setSaving(false);
    if (error) {
      toast({ variant: "destructive", title: "Failed", description: error.message });
      return;
    }
    toast({ title: "Permissions saved", description: `${row.email} can access ${tabs.length} tab${tabs.length === 1 ? "" : "s"}.` });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm truncate">{row.email}</span>
            <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isSuper ? "bg-primary/15 text-primary border-primary/30"
              : row.role === "admin" ? "bg-yellow-500/15 text-yellow-300 border-yellow-500/30"
              : "bg-blue-500/15 text-blue-300 border-blue-500/30"
            }`}>
              {row.role.replace("_", " ")}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">{row.user_id.slice(0, 8)}…</p>
        </div>
        <div className="flex items-center gap-2">
          {!isSuper && (
            <Button size="sm" variant="outline" onClick={() => { setExpanded(e => !e); loadTabs(); }} title="Configure which admin sections this user can access">
              <ShieldCheck className="h-3.5 w-3.5 mr-1" /> {expanded ? "Hide" : "Permissions"}
            </Button>
          )}
          {!isSuper && (
            <Button size="sm" variant="destructive" onClick={onRevoke} title="Remove this user's admin access entirely">
              <Trash2 className="h-3.5 w-3.5 mr-1" /> Revoke
            </Button>
          )}
        </div>
      </div>

      {expanded && !isSuper && (
        <div className="border-t border-border pt-3 space-y-3">
          <p className="text-[11px] text-muted-foreground">
            Choose which dashboard tabs <strong>{row.email}</strong> can see.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">

            {MANAGEABLE_TABS.map(({ key, label }) => {
              const checked = tabs.includes(key);
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors ${
                    checked ? "border-primary/50 bg-primary/10 text-foreground" : "border-border bg-secondary/30 text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(key)}
                    className="accent-primary h-3.5 w-3.5"
                  />
                  {label}
                </label>
              );
            })}
          </div>
          <div className="flex justify-end">
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Save permissions
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}


/* ─── Settings Tab (Super Admin) ─── */
function SettingsTab() {
  const { toast } = useToast();
  const [webhook, setWebhook] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [show, setShow] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("app_settings").select("discord_webhook_url").eq("id", 1).maybeSingle();
      if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
      setWebhook(data?.discord_webhook_url || "");
      setLoading(false);
    })();
  }, []);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ discord_webhook_url: webhook.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Webhook saved" });
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Discord Webhook</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Used by the "Post to Discord" button. Leaving blank falls back to the env secret.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type={show ? "text" : "password"}
            value={webhook}
            onChange={(e) => setWebhook(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <Button variant="outline" size="icon" onClick={() => setShow(!show)} title={show ? "Hide" : "Show"}>
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        </div>
        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save Webhook
        </Button>
      </Card>

      <KeyDiscountsCard />
    </div>
  );
}

/* ─── Key Discounts (Super Admin) ─── */
function KeyDiscountsCard() {
  const { toast } = useToast();
  const TIERS = [
    { id: "monthly", name: "Monthly Access", base: 9.99 },
    { id: "lifetime", name: "Lifetime Key", base: 49.99 },
  ];
  const [rows, setRows] = useState<Record<string, { percent_off: number; active: boolean; label: string }>>({});
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("key_discounts").select("tier_id, percent_off, active, label");
      const map: Record<string, { percent_off: number; active: boolean; label: string }> = {};
      (data || []).forEach((r: any) => {
        map[r.tier_id] = { percent_off: Number(r.percent_off) || 0, active: !!r.active, label: r.label ?? "" };
      });
      setRows(map);
      setLoading(false);
    })();
  }, []);

  const save = async (tierId: string) => {
    const r = rows[tierId] || { percent_off: 0, active: false, label: "" };
    const pct = Math.max(0, Math.min(90, Math.round(r.percent_off)));
    setSavingId(tierId);
    const { error } = await supabase.from("key_discounts").upsert({
      tier_id: tierId,
      percent_off: pct,
      active: r.active,
      label: r.label.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tier_id" });
    setSavingId(null);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Discount saved" });
  };

  if (loading) return <Loader2 className="h-6 w-6 animate-spin" />;

  return (
    <Card className="p-6 space-y-5">
      <div>
        <h2 className="text-lg font-semibold">Key Discounts (Sales)</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Run occasional sales on premium keys. The $5 trial key is never discounted.
        </p>
      </div>
      {TIERS.map((tier) => {
        const r = rows[tier.id] || { percent_off: 0, active: false, label: "" };
        const final = Math.round(tier.base * (1 - Math.max(0, Math.min(90, r.percent_off)) / 100) * 100) / 100;
        const upd = (patch: Partial<typeof r>) => setRows((s) => ({ ...s, [tier.id]: { ...r, ...patch } }));
        return (
          <div key={tier.id} className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{tier.name}</p>
                <p className="text-xs text-muted-foreground">
                  Base ${tier.base} → {r.active && r.percent_off > 0 ? <span className="text-green-500 font-semibold">${final} ({r.percent_off}% OFF)</span> : "no discount"}
                </p>
              </div>
              <Button
                size="sm"
                variant={r.active ? "default" : "outline"}
                onClick={() => upd({ active: !r.active })}
              >
                {r.active ? "Sale ON" : "Sale OFF"}
              </Button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={90}
                value={r.percent_off}
                onChange={(e) => upd({ percent_off: Number(e.target.value) })}
                placeholder="% off"
                className="w-24 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <input
                type="text"
                value={r.label}
                onChange={(e) => upd({ label: e.target.value })}
                placeholder="Banner text (e.g. Weekend Sale)"
                className="flex-1 rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <Button size="sm" onClick={() => save(tier.id)} disabled={savingId === tier.id}>
                {savingId === tier.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        );
      })}
    </Card>
  );
}

/* ─── Key Tools Tab (external Shop Key API) ─── */
function KeyToolsTab() {
  const { toast } = useToast();
  const inputCls = "w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
  const [key, setKey] = useState("");
  const [hours, setHours] = useState("720");
  const [busy, setBusy] = useState<string | null>(null);
  const [info, setInfo] = useState<any>(null);

  const presets = [
    { label: "1 Day", hours: 24 },
    { label: "7 Days", hours: 168 },
    { label: "30 Days", hours: 720 },
    { label: "1 Year", hours: 8760 },
    { label: "Lifetime", hours: 876000 },
  ];

  const call = async (action: string, body: Record<string, unknown> = {}) => {
    const k = key.trim();
    if (!k) { toast({ variant: "destructive", title: "Enter a key first" }); return null; }
    setBusy(action);
    try {
      const { data, error } = await supabase.functions.invoke("shop-key", {
        body: { action, key: k, ...body },
      });
      if (error) {
        // Supabase wraps non-2xx as error; try to surface server message.
        let msg = error.message;
        try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
        toast({ variant: "destructive", title: "Failed", description: msg });
        return null;
      }
      if (data?.success === false) {
        toast({ variant: "destructive", title: "Failed", description: data.error });
        return null;
      }
      return data;
    } finally {
      setBusy(null);
    }
  };

  const doInfo = async () => {
    const d = await call("info");
    if (d) { setInfo(d); toast({ title: "Key info loaded" }); }
  };
  const doExtend = async () => {
    const h = Number(hours);
    if (!h || h < 1 || h > 876000) { toast({ variant: "destructive", title: "Hours must be 1–876000" }); return; }
    const d = await call("extend", { hours: h });
    if (d) { toast({ title: "Key extended", description: `New expiry: ${d.new_expires_at ? new Date(d.new_expires_at).toLocaleString() : "updated"}` }); doInfo(); }
  };
  const doDeactivate = async () => {
    if (!confirm("Revoke/deactivate this key? The user will lose access immediately.")) return;
    const d = await call("deactivate");
    if (d) { toast({ title: "Key deactivated" }); doInfo(); }
  };
  const doTransfer = async () => {
    if (!confirm("Reset HWID binding? The key will bind to the next device that uses it.")) return;
    const d = await call("transfer");
    if (d) { toast({ title: "HWID reset", description: "Key will bind to the next device." }); doInfo(); }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Key Tools</h2>
        <p className="text-sm text-muted-foreground">Inspect, extend, revoke, or reset the HWID binding on any premium key.</p>
      </div>

      <VerifyStepsControl />

      <AdToggleControl />



      <Card className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1 block">HWID Key *</label>
          <input value={key} onChange={e => setKey(e.target.value)} className={`${inputCls} font-mono`} placeholder="paste a key e.g. abc123-def456..." />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button onClick={doInfo} disabled={!!busy} variant="outline" className="gap-2">
            {busy === "info" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Inspect
          </Button>
          <Button onClick={doDeactivate} disabled={!!busy} variant="destructive" className="gap-2">
            {busy === "deactivate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />} Revoke
          </Button>
          <Button onClick={doTransfer} disabled={!!busy} variant="outline" className="gap-2">
            {busy === "transfer" ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowLeftRight className="h-4 w-4" />} Reset HWID
          </Button>
        </div>

        <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-3">
          <label className="text-sm font-medium block flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Extend key</label>
          <div className="flex flex-wrap gap-1.5">
            {presets.map(p => (
              <button key={p.hours} type="button" onClick={() => setHours(String(p.hours))}
                className="px-2.5 py-1 text-xs rounded border border-border bg-secondary/50 hover:bg-primary/20 hover:border-primary/50 transition">
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="number" min="1" max="876000" value={hours} onChange={e => setHours(e.target.value)} className={inputCls} placeholder="hours" />
            <Button onClick={doExtend} disabled={!!busy} className="gap-2 shrink-0">
              {busy === "extend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Add Hours
            </Button>
          </div>
        </div>
      </Card>

      {info && (
        <Card className="p-6 space-y-2 text-sm">
          <h3 className="font-semibold mb-2">Key Details</h3>
          <Row label="Username" value={info.username} />
          <Row label="Type" value={info.key_type} />
          <Row label="Active" value={info.is_active ? "Yes" : "No"} />
          <Row label="Expired" value={info.is_expired ? "Yes" : "No"} />
          <Row label="HWID bound" value={info.hwid_bound ? "Yes" : "No"} />
          <Row label="Expires at" value={info.expires_at ? new Date(info.expires_at).toLocaleString() : "—"} />
          {info.time_remaining && (
            <Row label="Time left" value={`${info.time_remaining.days}d ${info.time_remaining.hours % 24 || info.time_remaining.hours}h`} />
          )}
        </Card>
      )}
    </div>
  );
}

/* ─── Verify Steps Control (free key ad-step count + Linkvertise config) ─── */
function VerifyStepsControl() {
  const { toast } = useToast();
  const [clicks, setClicks] = useState<number>(2);
  const [accessClicks, setAccessClicks] = useState<number>(2);
  const [extHours, setExtHours] = useState<number>(11);
  const [lv1, setLv1] = useState<string>("");
  const [lv2, setLv2] = useState<string>("");
  const [lv3, setLv3] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.from("verify_settings")
      .select("direct_link_clicks, access_key_clicks, extension_hours, linkvertise_link_1, linkvertise_link_2, linkvertise_link_3")
      .eq("id", 1).maybeSingle()
      .then(({ data }) => {
        const d = data as any;
        if (d?.direct_link_clicks != null) setClicks(d.direct_link_clicks);
        if (d?.access_key_clicks != null) setAccessClicks(d.access_key_clicks);
        if (d?.extension_hours != null) setExtHours(d.extension_hours);
        if (d?.linkvertise_link_1) setLv1(d.linkvertise_link_1);
        if (d?.linkvertise_link_2) setLv2(d.linkvertise_link_2);
        if (d?.linkvertise_link_3) setLv3(d.linkvertise_link_3);
        setLoading(false);
      });
  }, []);

  const save = async () => {
    if (clicks < 1 || clicks > 10) { toast({ variant: "destructive", title: "Provider-Select clicks must be 1–10" }); return; }
    if (accessClicks < 0 || accessClicks > 10) { toast({ variant: "destructive", title: "Access Key clicks must be 0–10" }); return; }
    if (extHours < 1 || extHours > 876000) { toast({ variant: "destructive", title: "Extension hours must be 1–876000" }); return; }
    if (!lv1.trim() || !lv2.trim() || !lv3.trim()) { toast({ variant: "destructive", title: "All 3 Linkvertise links are required" }); return; }
    setSaving(true);
    const { error } = await supabase.from("verify_settings")
      .update({
        direct_link_clicks: clicks,
        access_key_clicks: accessClicks,
        extension_hours: extHours,
        linkvertise_link_1: lv1.trim(),
        linkvertise_link_2: lv2.trim(),
        linkvertise_link_3: lv3.trim(),
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", 1);
    setSaving(false);
    if (error) { toast({ variant: "destructive", title: "Failed to save", description: error.message }); return; }
    toast({ title: "Saved", description: `Provider-Select: ${clicks} • Access Key: ${accessClicks} • Extension: +${extHours}h.` });
  };

  const numCls = "w-24 rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50";
  const txtCls = "w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50";

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><MousePointerClick className="h-4 w-4 text-primary" /> Free Key — Ad Click Steps</h3>
        <p className="text-sm text-muted-foreground">The "press the ad button X times" gate appears on two pages. Set each independently. Set Access Key to 0 to skip the second gate.</p>
      </div>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium mb-1 block">Provider-Select ad clicks (1–10)</label>
          <p className="text-xs text-muted-foreground mb-1">Monetag direct-link presses on <code>/verify/provider-select</code>.</p>
          <input type="number" min="1" max="10" disabled={loading} value={clicks} onChange={(e) => setClicks(Number(e.target.value))} className={numCls} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Access Key ad clicks (0–10)</label>
          <p className="text-xs text-muted-foreground mb-1">Monetag direct-link presses on <code>/access-key</code> before the key is generated.</p>
          <input type="number" min="0" max="10" disabled={loading} value={accessClicks} onChange={(e) => setAccessClicks(Number(e.target.value))} className={numCls} />
        </div>
      </div>

      <div className="border-t border-border/50 pt-4 space-y-3">
        <div>
          <h3 className="font-semibold flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> Linkvertise 3-Step Flow</h3>
          <p className="text-sm text-muted-foreground">The 3 Linkvertise links users complete in sequence (Step 1 → 2 → 3). Paste your Linkvertise link for each step. Also used for key extensions.</p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Linkvertise Link — Step 1</label>
          <input type="text" disabled={loading} value={lv1} onChange={(e) => setLv1(e.target.value)} placeholder="https://link-to.net/1234567" className={txtCls} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Linkvertise Link — Step 2</label>
          <input type="text" disabled={loading} value={lv2} onChange={(e) => setLv2(e.target.value)} placeholder="https://link-to.net/1234567" className={txtCls} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Linkvertise Link — Step 3</label>
          <input type="text" disabled={loading} value={lv3} onChange={(e) => setLv3(e.target.value)} placeholder="https://link-to.net/1234567" className={txtCls} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1 block">Extension hours per completion (1–876000)</label>
          <p className="text-xs text-muted-foreground mb-1">Hours added (stacked) each time a user completes the flow to extend an existing key.</p>
          <input type="number" min="1" max="876000" disabled={loading} value={extHours} onChange={(e) => setExtHours(Number(e.target.value))} className={numCls} />
        </div>
      </div>

      <Button onClick={save} disabled={saving || loading} className="gap-2 shrink-0">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Save
      </Button>
    </Card>
  );
}


function AdToggleControl() {
  const { toast } = useToast();
  const [rows, setRows] = useState<{ id: string; page: string; ad_type: string; enabled: boolean }[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const PAGES: { id: string; label: string }[] = [
    { id: "verify-step1", label: "Verify — Step 1" },
    { id: "verify-step2", label: "Verify — Step 2" },
    { id: "verify-step3", label: "Verify — Step 3" },
    { id: "verify-provider-select", label: "Verify — Provider Select" },
    { id: "access-key", label: "Access Key" },
    { id: "keys", label: "Keys" },
  ];
  const AD_TYPE_LABELS: Record<string, string> = {
    popunder: "Monetag Popunder",
    direct_link: "Monetag Direct Link",
    sliding_ad: "Promo Modal (Sliding Ad)",
    skip_ads_banner: "Skip-Ads Banner",
    skip_ads_float: "Skip-Ads Float Button",
    script_promo: "Script Promo Popup",
  };
  const PAGE_AD_TYPES: Record<string, string[]> = {
    "verify-step1": ["sliding_ad", "skip_ads_banner", "skip_ads_float"],
    "verify-step2": ["sliding_ad", "skip_ads_banner", "skip_ads_float"],
    "verify-step3": ["sliding_ad", "skip_ads_banner", "skip_ads_float"],
    "verify-provider-select": ["popunder", "direct_link"],
    "access-key": ["popunder", "direct_link", "skip_ads_banner", "skip_ads_float", "script_promo"],
    keys: ["popunder", "script_promo"],
  };

  const load = async () => {
    const { data } = await supabase.from("key_ad_settings" as any).select("*");
    setRows((data as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const isEnabled = (page: string, adType: string) => {
    const r = rows.find((x) => x.page === page && x.ad_type === adType);
    return r ? r.enabled : true;
  };

  const toggle = async (page: string, adType: string, next: boolean) => {
    const k = `${page}:${adType}`;
    setSavingKey(k);
    const existing = rows.find((x) => x.page === page && x.ad_type === adType);
    let error;
    if (existing) {
      ({ error } = await supabase.from("key_ad_settings" as any)
        .update({ enabled: next, updated_at: new Date().toISOString() }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("key_ad_settings" as any)
        .insert({ page, ad_type: adType, enabled: next }));
    }
    setSavingKey(null);
    if (error) { toast({ variant: "destructive", title: "Failed to save", description: error.message }); return; }
    await load();
    toast({ title: next ? "Ad enabled" : "Ad disabled", description: `${AD_TYPE_LABELS[adType]} on ${page}` });
  };

  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="font-semibold flex items-center gap-2"><Eye className="h-4 w-4 text-primary" /> Ad Placements per Page</h3>
        <p className="text-sm text-muted-foreground">Turn individual ad types on or off for each key/verification page. Changes apply instantly.</p>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</div>
      ) : (
        <div className="space-y-5">
          {PAGES.map((p) => (
            <div key={p.id} className="rounded-lg border border-border/60 p-4 space-y-3">
              <div className="font-medium text-sm">{p.label}</div>
              <div className="space-y-2">
                {PAGE_AD_TYPES[p.id].map((adType) => {
                  const k = `${p.id}:${adType}`;
                  const on = isEnabled(p.id, adType);
                  return (
                    <div key={adType} className="flex items-center justify-between gap-4">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        {AD_TYPE_LABELS[adType]}
                        {savingKey === k && <Loader2 className="h-3 w-3 animate-spin" />}
                      </span>
                      <Switch checked={on} disabled={savingKey === k} onCheckedChange={(v) => toggle(p.id, adType, v)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/40 py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right break-all">{String(value ?? "—")}</span>
    </div>
  );
}

/* ─── Announcements Tab ─── */
type Announcement = {
  id: string;
  title: string | null;
  message: string;
  enabled: boolean;
  created_at: string;
  expires_at: string | null;
};

function AnnouncementsTab() {
  const { toast } = useToast();
  const inputCls =
    "w-full rounded-lg border border-border bg-secondary/50 px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50";
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const { data: scripts = [] } = useAllScripts();

  const API_URL =
    "https://iphiksvnuzpteoryrdxf.supabase.co/functions/v1/public-announcements";

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("announcements")
      .select("id,title,message,enabled,created_at,expires_at")
      .order("created_at", { ascending: false });
    if (error) toast({ title: "Load failed", description: error.message, variant: "destructive" });
    setRows((data as Announcement[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!message.trim()) {
      toast({ title: "Message is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("announcements").insert({
      title: title.trim() || null,
      message: message.trim(),
      enabled: true,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Post failed", description: error.message, variant: "destructive" });
      return;
    }
    setTitle("");
    setMessage("");
    setExpiresAt("");
    toast({ title: "Announcement posted", description: "Live on the loader API within ~60s." });
    load();
  };

  const toggle = async (row: Announcement) => {
    const { error } = await supabase
      .from("announcements")
      .update({ enabled: !row.enabled })
      .eq("id", row.id);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const remove = async (row: Announcement) => {
    if (!confirm("Delete this announcement?")) return;
    const { error } = await supabase.from("announcements").delete().eq("id", row.id);
    if (error) {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
      return;
    }
    load();
  };

  const insertScript = (slug: string, scriptTitle: string) => {
    const url = `https://combowick.com/scripts/${slug}`;
    setMessage((m) => (m ? `${m}\n` : "") + `New script: ${scriptTitle} — ${url}`);
    if (!title) setTitle(`New Script: ${scriptTitle}`);
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Megaphone className="h-5 w-5 text-primary" />
          <h2 className="font-heading text-lg font-bold">Post Announcement</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Anything posted here is served as JSON at the loader API and shows up in-game.
        </p>
        <div className="space-y-3">
          <input
            className={inputCls}
            placeholder="Title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <textarea
            className={inputCls + " min-h-[110px] resize-y"}
            placeholder="Announcement message…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
            <label className="text-xs text-muted-foreground flex items-center gap-2">
              Expires (optional)
              <input
                type="datetime-local"
                className="rounded-lg border border-border bg-secondary/50 px-3 py-2 text-sm"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </label>
            <Button onClick={create} disabled={saving} className="gap-2 sm:ml-auto">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Post to API
            </Button>
          </div>
        </div>
        {scripts.length > 0 && (
          <div className="border-t border-border/40 pt-3">
            <p className="text-xs text-muted-foreground mb-2">Quick-insert a script link:</p>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {scripts.slice(0, 30).map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => insertScript(s.slug, s.title)}
                  className="px-2.5 py-1 text-xs rounded border border-border bg-secondary/50 hover:bg-primary/20 hover:border-primary/50 transition"
                >
                  {s.title}
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-3">
          <Code className="h-3.5 w-3.5" />
          <span className="break-all">Loader endpoint: {API_URL}</span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(API_URL);
              toast({ title: "Copied API URL" });
            }}
            className="ml-auto p-1 hover:text-primary"
            title="Copy"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-heading font-bold mb-4">All Announcements</h3>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No announcements yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => {
              const expired = row.expires_at && new Date(row.expires_at) < new Date();
              return (
                <div
                  key={row.id}
                  className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3"
                >
                  <div className="flex-1 min-w-0">
                    {row.title && <div className="font-semibold text-sm">{row.title}</div>}
                    <div className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
                      {row.message}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                      <span>{new Date(row.created_at).toLocaleString()}</span>
                      <span
                        className={
                          row.enabled && !expired
                            ? "text-green-500"
                            : "text-muted-foreground"
                        }
                      >
                        {expired ? "Expired" : row.enabled ? "Live" : "Hidden"}
                      </span>
                      {row.expires_at && (
                        <span>· expires {new Date(row.expires_at).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={row.enabled} onCheckedChange={() => toggle(row)} />
                    <button
                      onClick={() => remove(row)}
                      className="p-1.5 rounded hover:bg-destructive/20 text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

import { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Key, XCircle, Copy, Check, LogIn, Crown, Sparkles, Zap, Mail, Link2, AlertCircle, LifeBuoy, Send, MessageSquare, Clock, Plus, RefreshCw, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { SEOHead } from "@/components/SEOHead";
import { TopUpModal } from "@/components/TopUpModal";

type KeyPurchase = {
  id: string;
  payment_id: string;
  tier: string;
  key_generated: string;
  amount: number;
  status: string;
  expires_at: string;
  created_at: string;
  user_id: string | null;
  customer_email: string | null;
};

type ContactMessage = {
  id: string;
  subject: string;
  message: string;
  status: string;
  admin_reply: string | null;
  replied_at: string | null;
  created_at: string;
};

const tierNames: Record<string, string> = {
  "trial-7day": "3-Day Trial",
  monthly: "Monthly Access",
  lifetime: "Lifetime Access",
};

type BadgeInfo = {
  label: string;
  icon: typeof Crown;
  className: string;
};

// Highest tier wins (lifetime > monthly > trial). Only counts non-expired keys.
function getUserBadge(keys: KeyPurchase[]): BadgeInfo | null {
  const now = Date.now();
  const active = keys.filter(k => !k.expires_at || new Date(k.expires_at).getTime() > now);
  if (active.some(k => k.tier === "lifetime")) {
    return { label: "Lifetime Member", icon: Crown, className: "bg-gradient-to-r from-amber-500/20 to-yellow-500/20 text-amber-300 border-amber-500/40" };
  }
  if (active.some(k => k.tier === "monthly")) {
    return { label: "Monthly Subscriber", icon: Sparkles, className: "bg-gradient-to-r from-primary/20 to-accent/20 text-primary border-primary/40" };
  }
  if (active.some(k => k.tier === "trial-7day")) {
    return { label: "Trial Member", icon: Zap, className: "bg-success/15 text-success border-success/40" };
  }
  return null;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [keys, setKeys] = useState<KeyPurchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [tab, setTab] = useState<"keys" | "messages">("keys");
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [supportOpen, setSupportOpen] = useState(false);
  const [supportForm, setSupportForm] = useState({ paypalEmail: "", orderId: "", message: "" });
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [paypalClientId, setPaypalClientId] = useState("");
  const [topUpKey, setTopUpKey] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<Record<string, any>>({});
  const [checkingKey, setCheckingKey] = useState<string | null>(null);

  const checkLiveStatus = async (keyValue: string) => {
    setCheckingKey(keyValue);
    try {
      const { data, error } = await supabase.functions.invoke("shop-key", {
        body: { action: "info", key: keyValue },
      });
      if (error || data?.success === false) {
        toast({ variant: "destructive", title: "Couldn't load status", description: data?.error || error?.message });
        return;
      }
      setLiveStatus((s) => ({ ...s, [keyValue]: data }));
    } finally {
      setCheckingKey(null);
    }
  };

  const loadData = async (currentUser: any) => {
    const email = (currentUser.email || "").toLowerCase();

    // Query by user_id OR matching customer_email (covers guest checkouts that
    // didn't capture a user_id but used the same email as the buyer's account).
    const keysQuery = email
      ? supabase
          .from("premium_key_purchases")
          .select("*")
          .or(`user_id.eq.${currentUser.id},customer_email.eq.${email}`)
          .order("created_at", { ascending: false })
      : supabase
          .from("premium_key_purchases")
          .select("*")
          .eq("user_id", currentUser.id)
          .order("created_at", { ascending: false });

    const [keysRes, messagesRes] = await Promise.all([
      keysQuery,
      supabase.from("contact_messages").select("id,subject,message,status,admin_reply,replied_at,created_at").eq("user_id", currentUser.id).order("created_at", { ascending: false }),
    ]);

    // Dedupe by id in case a row matches both filters
    const rawKeys = (keysRes.data as KeyPurchase[]) || [];
    const seen = new Set<string>();
    const uniqKeys = rawKeys.filter(k => (seen.has(k.id) ? false : (seen.add(k.id), true)));

    setKeys(uniqKeys);
    setMessages((messagesRes.data as ContactMessage[]) || []);
  };

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { setLoading(false); return; }
      setUser(data.user);
      await loadData(data.user);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    supabase.functions.invoke("paypal-config").then(({ data }) => {
      if (data?.client_id) setPaypalClientId(data.client_id);
    });
  }, []);

  // Auto-poll while any purchase is still clearing (eCheck pending). Once the
  // webhook flips it to completed + issues the key, the dashboard updates itself.
  const hasPending = keys.some((k) => k.status === "pending");
  useEffect(() => {
    if (!user || !hasPending) return;
    const interval = setInterval(() => loadData(user), 12000);
    return () => clearInterval(interval);
  }, [user, hasPending]);

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const submitSupport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.paypalEmail.trim()) {
      toast({ title: "Missing PayPal email", description: "Please enter the email address shown on your PayPal receipt.", variant: "destructive" });
      return;
    }
    setSupportSubmitting(true);
    const subject = `[Missing Key Support] ${supportForm.paypalEmail}`;
    const body =
`A buyer needs help locating their purchase.

Account email: ${user?.email || "unknown"}
PayPal receipt email: ${supportForm.paypalEmail}
PayPal Order/Transaction ID: ${supportForm.orderId || "(not provided)"}
Message: ${supportForm.message || "(none)"}

— Sent from /dashboard support form`;

    // Best-effort: open email client AND Discord invite so the buyer reaches us either way.
    const mailto = `mailto:support@combowick.app?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailto, "_self");
    setTimeout(() => {
      window.open("https://discord.com/invite/ufrz9Zaqs8", "_blank", "noopener,noreferrer");
      toast({
        title: "Support request prepared",
        description: "Email draft opened + Discord invite launched. We respond fastest in Discord.",
      });
      setSupportSubmitting(false);
      setSupportOpen(false);
      setSupportForm({ paypalEmail: "", orderId: "", message: "" });
    }, 400);
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!user) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Card className="p-12 text-center max-w-md">
            <LogIn className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="font-heading text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-muted-foreground mb-6">Sign in to view your purchased premium keys and support messages.</p>
            <Button onClick={() => navigate("/login")} className="w-full">Sign In</Button>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <SEOHead
        title="My Dashboard — ComboWick Premium Keys & Support"
        description="View your ComboWick premium keys, purchase history, and support messages from your account dashboard."
      />
      <section className="py-12 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-bold mb-2">My Dashboard</h1>
            <p className="text-muted-foreground">Manage your premium keys and support messages</p>
          </div>

          {(() => {
            const badge = getUserBadge(keys);
            const Icon = badge?.icon;
            return (
              <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-muted/30 border border-border/50 flex-wrap">
                <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                <span className="text-sm font-medium">{user.email}</span>
                {badge && Icon && (
                  <Badge variant="outline" className={`gap-1.5 px-2.5 py-1 text-xs font-semibold ${badge.className}`}>
                    <Icon className="h-3.5 w-3.5" />
                    {badge.label}
                  </Badge>
                )}
              </div>
            );
          })()}

          {/* Purchase link status — explains how each key was matched to this account */}
          {keys.length > 0 && (() => {
            const emailLower = (user.email || "").toLowerCase();
            const linkedById = keys.filter(k => k.user_id === user.id).length;
            const linkedByEmail = keys.filter(
              k => k.user_id !== user.id && (k.customer_email || "").toLowerCase() === emailLower
            ).length;
            return (
              <Card className="p-4 mb-6 border-primary/20 bg-primary/5">
                <div className="flex items-start gap-3">
                  <Link2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold mb-1">Purchase Link Status</p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {linkedById > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-success/15 text-success border border-success/30">
                          <Check className="h-3 w-3" /> {linkedById} linked to your account
                        </span>
                      )}
                      {linkedByEmail > 0 && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-primary/15 text-primary border border-primary/30">
                          <Mail className="h-3 w-3" /> {linkedByEmail} matched by email
                        </span>
                      )}
                    </div>
                    {linkedByEmail > 0 && (
                      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                        These keys were purchased as a guest using <span className="font-mono text-foreground">{user.email}</span> and have been automatically attached to your account.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })()}

          {/* Missing keys helper — for visitors arriving from a PayPal email with the wrong account */}
          {keys.length === 0 && (
            <Card className="p-5 mb-6 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold mb-1">Don't see a key you paid for?</p>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Most "missing key" issues = your PayPal receipt was sent to a <span className="font-semibold text-foreground">different email</span> than the one you signed in with.
                    Sign in with the <span className="font-semibold text-foreground">exact email</span> on your PayPal receipt and your key will appear instantly.
                  </p>
                  <p className="text-xs text-muted-foreground mb-3">
                    Currently signed in as: <span className="font-mono text-foreground">{user.email}</span>
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={async () => { await supabase.auth.signOut(); navigate("/login"); }}>
                      <Mail className="h-3.5 w-3.5 mr-1.5" /> Sign in with PayPal email
                    </Button>
                    <Button size="sm" variant="default" onClick={() => setSupportOpen((o) => !o)}>
                      <LifeBuoy className="h-3.5 w-3.5 mr-1.5" /> {supportOpen ? "Hide support form" : "Contact support"}
                    </Button>
                  </div>

                  {supportOpen && (
                    <form onSubmit={submitSupport} className="mt-5 space-y-3 p-4 rounded-lg bg-background/50 border border-border">
                      <div>
                        <Label htmlFor="paypalEmail" className="text-xs">PayPal receipt email *</Label>
                        <Input
                          id="paypalEmail"
                          type="email"
                          required
                          autoComplete="email"
                          placeholder="the email PayPal sent your receipt to"
                          value={supportForm.paypalEmail}
                          onChange={(e) => setSupportForm((f) => ({ ...f, paypalEmail: e.target.value }))}
                          className="mt-1 h-9 text-sm"
                        />
                      </div>
                      <div>
                        <Label htmlFor="orderId" className="text-xs">PayPal Order / Transaction ID</Label>
                        <Input
                          id="orderId"
                          placeholder="e.g. 9XR12345AB678901C (from your PayPal email)"
                          value={supportForm.orderId}
                          onChange={(e) => setSupportForm((f) => ({ ...f, orderId: e.target.value }))}
                          className="mt-1 h-9 text-sm font-mono"
                        />
                        <p className="text-[10px] text-muted-foreground mt-1">Found in your PayPal receipt email — speeds up our lookup massively.</p>
                      </div>
                      <div>
                        <Label htmlFor="message" className="text-xs">Anything else? (optional)</Label>
                        <Textarea
                          id="message"
                          rows={2}
                          placeholder="What did you buy? When? Any error messages?"
                          value={supportForm.message}
                          onChange={(e) => setSupportForm((f) => ({ ...f, message: e.target.value }))}
                          className="mt-1 text-sm resize-none"
                        />
                      </div>
                      <div className="flex gap-2 flex-wrap items-center">
                        <Button type="submit" size="sm" disabled={supportSubmitting}>
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          {supportSubmitting ? "Sending..." : "Send & open Discord"}
                        </Button>
                        <p className="text-[10px] text-muted-foreground">We reply fastest in Discord — usually under 1 hour.</p>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-border flex-wrap">
            <button
              onClick={() => setTab("keys")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "keys" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <Key className="h-4 w-4" /> Premium Keys ({keys.length})
            </button>
            <button
              onClick={() => setTab("messages")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === "messages" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              <MessageSquare className="h-4 w-4" /> Messages ({messages.length})
              {messages.some(m => m.admin_reply && m.status === "new") && (
                <span className="ml-1 inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
              )}
            </button>
          </div>

          {tab === "keys" && (
            keys.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <Key className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No Premium Keys Yet</p>
                <p className="text-muted-foreground mb-6">Purchase a premium key to get started</p>
                <Button onClick={() => navigate("/premium-keys")}>Browse Premium Keys</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {keys.map((purchase) => {
                  const isPending = purchase.status === "pending";
                  const isFailed = purchase.status === "failed";
                  const isExpired = !isPending && !isFailed && purchase.expires_at && new Date(purchase.expires_at) < new Date();
                  const daysLeft = !isExpired && !isPending && !isFailed && purchase.expires_at
                    ? Math.max(0, Math.ceil((new Date(purchase.expires_at).getTime() - Date.now()) / 86400000))
                    : null;

                  // eCheck still clearing — show a distinct "Payment clearing" card.
                  if (isPending) {
                    return (
                      <Card key={purchase.id} className="p-6 border-primary/30 bg-primary/5">
                        <div className="flex items-start gap-3">
                          <Clock className="h-5 w-5 text-primary shrink-0 mt-0.5 animate-pulse" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <h3 className="font-bold text-lg">{tierNames[purchase.tier] || purchase.tier}</h3>
                              <span className="text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary uppercase tracking-wider font-semibold">Payment clearing</span>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">
                              Your eCheck payment is still clearing (usually a few business days). Your license key will appear here automatically — this page refreshes itself — and is also emailed the moment funds clear.
                            </p>
                            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                              <div className="h-3 w-3 rounded-full border-2 border-primary/40 border-t-primary animate-spin" />
                              Checking for updates… · Ordered {new Date(purchase.created_at).toLocaleDateString()} · ${purchase.amount}
                            </div>
                          </div>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card key={purchase.id} className={`p-6 transition-all hover:shadow-lg ${isFailed ? "border-destructive/30" : isExpired ? "border-destructive/20" : "border-primary/20"}`}>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-3">
                            <Key className={`h-5 w-5 ${isExpired || isFailed ? "text-destructive" : "text-primary"}`} />
                            <div>
                              <h3 className="font-bold text-lg">{tierNames[purchase.tier] || purchase.tier}</h3>
                              <div className="flex items-center gap-2 text-sm">
                                {isFailed ? (
                                  <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive font-medium">Payment failed / reversed</span></>
                                ) : isExpired ? (
                                  <><XCircle className="h-4 w-4 text-destructive" /><span className="text-destructive font-medium">Expired</span></>
                                ) : (
                                  <>
                                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                    <span className="text-success font-medium">Active</span>
                                    {daysLeft !== null && daysLeft <= 365 && (
                                      <span className="text-muted-foreground">· {daysLeft} day{daysLeft === 1 ? "" : "s"} left</span>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {!isFailed && (
                            <div className="bg-background/50 p-4 rounded-lg mb-3 border border-border/50">
                              <p className="text-xs text-muted-foreground mb-1">License Key:</p>
                              <code className="text-sm font-mono break-all font-semibold">{purchase.key_generated}</code>
                            </div>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Purchased: {new Date(purchase.created_at).toLocaleDateString()}</span>
                            {purchase.expires_at && <span>Expires: {new Date(purchase.expires_at).toLocaleDateString()}</span>}
                            <span>${purchase.amount}</span>
                          </div>

                          {!isFailed && purchase.key_generated && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              {!isExpired && (
                                <Button size="sm" variant="default" className="gap-1.5" onClick={() => setTopUpKey(purchase.key_generated)}>
                                  <Plus className="h-3.5 w-3.5" /> Add More Hours
                                </Button>
                              )}
                              <Button size="sm" variant="outline" className="gap-1.5" disabled={checkingKey === purchase.key_generated} onClick={() => checkLiveStatus(purchase.key_generated)}>
                                {checkingKey === purchase.key_generated ? <div className="h-3.5 w-3.5 rounded-full border-2 border-primary/40 border-t-primary animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                Check live status
                              </Button>
                            </div>
                          )}

                          {liveStatus[purchase.key_generated] && (() => {
                            const li = liveStatus[purchase.key_generated];
                            const tr = li.time_remaining;
                            return (
                              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs space-y-1.5">
                                <p className="font-semibold text-foreground flex items-center gap-1.5"><Smartphone className="h-3.5 w-3.5 text-primary" /> Live key status</p>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                                  <span>{li.is_active && !li.is_expired ? <span className="text-success font-medium">● Active</span> : <span className="text-destructive font-medium">● Inactive</span>}</span>
                                  <span>HWID: {li.hwid_bound ? "Bound to a device" : "Not bound yet"}</span>
                                  {tr && <span>{tr.days}d {tr.hours % 24}h left</span>}
                                  {li.expires_at && <span>Expires {new Date(li.expires_at).toLocaleDateString()}</span>}
                                </div>
                              </div>
                            );
                          })()}
                        </div>

                        {!isFailed && (
                          <Button variant="outline" size="sm" onClick={() => copyText(purchase.key_generated, purchase.id)}>
                            {copied === purchase.id ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )
          )}

          {tab === "messages" && (
            messages.length === 0 ? (
              <Card className="p-12 text-center border-dashed">
                <MessageSquare className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold mb-2">No Messages Yet</p>
                <p className="text-muted-foreground mb-6">Send us a message from the contact page — replies will appear here.</p>
                <Button onClick={() => navigate("/contact")}>Go to Contact</Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {messages.map((m) => (
                  <Card key={m.id} className={`p-5 ${m.admin_reply ? "border-success/30" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
                      <h3 className="font-semibold">{m.subject}</h3>
                      {m.admin_reply ? (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-success/20 text-success uppercase tracking-wider">Replied</span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase tracking-wider">Awaiting reply</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">Sent {new Date(m.created_at).toLocaleString()}</p>
                    <div className="rounded-lg bg-background/50 border border-border/50 p-3 mb-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Your message</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.message}</p>
                    </div>
                    {m.admin_reply && (
                      <div className="rounded-lg bg-success/5 border border-success/30 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-success mb-1">
                          Combo_WICK team • {m.replied_at ? new Date(m.replied_at).toLocaleString() : ""}
                        </p>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.admin_reply}</p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      </section>

      {topUpKey && paypalClientId && (
        <TopUpModal
          isOpen={!!topUpKey}
          onClose={() => setTopUpKey(null)}
          paypalClientId={paypalClientId}
          keyValue={topUpKey}
          onSuccess={() => user && loadData(user)}
        />
      )}
    </Layout>
  );
}

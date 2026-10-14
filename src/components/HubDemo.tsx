// Lookalike of the in-game COMBO_WICK hub (Obsidian UI + our gold theme), so changes can be
// previewed in a browser before touching the real loader. It is a MOCKUP: it mirrors the layout and the
// real labels from combowick_main.lua / combowick_module.lua, and the Games tab uses the live game list.
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTranslation } from "@/lib/translation-context";
import { fetchGameThumbnailByUniverseId } from "@/lib/roblox-thumbnails";
import {
  CircleUser, User, Key, Gamepad2, MessageSquare, Settings, Info, Shield, List, Server, Link as LinkIcon,
  Wrench, LifeBuoy, Sparkles, Search, Loader2, Monitor, Smartphone, X,
} from "lucide-react";

// ---------- data from the module ----------
const RPC_URL = "https://yrlxosurmcpxrlmxckke.supabase.co/rest/v1/rpc/cw_games_list";
const RPC_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlybHhvc3VybWNweHJsbXhja2tlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA0MjQ2NzQsImV4cCI6MjA2NjAwMDY3NH0.F6y_yw26UOJPGDFyhBQ0u__QNf0FPzL2uwbuGhntWYQ";
const GAMES_HIDE = new Set(["9271746647"]);
const NEW_DAYS = 7;
const IQ = 'loadstring(game:HttpGet("https://raw.githubusercontent.com/checkurasshole/Script/main/IQ"))()';
type Game = { u: string; p: string; n: string; free: boolean; added?: string; upd?: string };

// M.THEMES (g1/g2 border gradient, hot streak, accent)
const THEMES: Record<string, { g1: string; g2: string; hot: string; accent: string; premium: boolean }> = {
  Gold: { g1: "rgb(150,105,15)", g2: "rgb(240,185,40)", hot: "rgb(255,240,180)", accent: "rgb(240,185,40)", premium: false },
  Ruby: { g1: "rgb(120,14,30)", g2: "rgb(235,55,80)", hot: "rgb(255,200,210)", accent: "rgb(235,55,80)", premium: true },
  Emerald: { g1: "rgb(10,80,48)", g2: "rgb(40,210,120)", hot: "rgb(205,255,222)", accent: "rgb(40,210,120)", premium: true },
  Ice: { g1: "rgb(16,72,122)", g2: "rgb(80,190,255)", hot: "rgb(210,238,255)", accent: "rgb(80,190,255)", premium: true },
};
// loader BLACK palette
const C = { bg: "#0f0f0f", main: "#191919", outline: "#282828", grey: "rgb(150,150,156)", text: "rgb(235,235,235)" };

const cleanName = (n: string) => (n || "").replace(/\[[^\]]*\]|【[^】]*】/g, "").replace(/\([^)]*\b(UPD|UPDATE|NEW|EVENT)\b[^)]*\)/gi, "")
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\(\s*\)|\[\s*\]/g, "").replace(/\s+/g, " ").trim();
const daysAgo = (d?: string) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400e3) : null);
const isNew = (g: Game) => { const d = daysAgo(g.added); return d !== null && d < NEW_DAYS; };
const isUpd = (g: Game) => { const d = daysAgo(g.upd); return d !== null && d < NEW_DAYS; };
const short = (n: number) => (n >= 1e6 ? (n / 1e6).toFixed(1) + "M" : n >= 1e3 ? (n / 1e3).toFixed(1) + "K" : String(n));

// ---------- Obsidian-ish building blocks ----------
function Groupbox({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-[5px] border" style={{ background: C.main, borderColor: C.outline }}>
      <div className="flex items-center gap-1.5 border-b px-2 py-1.5 text-[12.5px] font-semibold" style={{ borderColor: C.outline, color: C.text }}>
        <Icon className="h-3.5 w-3.5" style={{ color: "var(--acc)" }} /> {title}
      </div>
      <div className="space-y-1.5 p-2">{children}</div>
    </div>
  );
}
const Label = ({ children, grey }: { children: React.ReactNode; grey?: boolean }) => (
  <p className="text-[12px] leading-snug" style={{ color: grey ? C.grey : C.text }}>{children}</p>
);
const Gold = ({ children }: { children: React.ReactNode }) => <b style={{ color: "var(--tgold)" }}>{children}</b>;
function Btn({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button onClick={onClick} className="w-full rounded-[4px] border py-1.5 text-[12px] transition-all hover:scale-[1.02] active:scale-95"
      style={{ background: C.bg, borderColor: C.outline, color: C.text, boxShadow: "0 0 0 0 transparent" }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 1px var(--acc)")}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 0 0 0 transparent")}>{children}</button>
  );
}
function Toggle({ label, value, onChange, note }: { label: string; value: boolean; onChange?: (v: boolean) => void; note?: string }) {
  return (
    <button onClick={() => onChange?.(!value)} className="flex w-full items-center justify-between gap-2 text-left text-[12px]" style={{ color: C.text }}>
      <span>{label}{note && <span style={{ color: C.grey }}> {note}</span>}</span>
      <span className="relative h-4 w-7 shrink-0 rounded-full border transition-colors" style={{ background: value ? "var(--acc)" : C.bg, borderColor: C.outline }}>
        <span className="absolute top-0.5 h-2.5 w-2.5 rounded-full bg-white transition-all" style={{ left: value ? 14 : 2 }} />
      </span>
    </button>
  );
}
function Input({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px]" style={{ color: C.text }}>{label}</p>
      <input placeholder={placeholder} className="w-full rounded-[4px] border px-2 py-1 text-[12px] outline-none" style={{ background: C.bg, borderColor: C.outline, color: C.text }} />
    </div>
  );
}
function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange?: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[12px]" style={{ color: C.text }}>{label}</p>
      <select value={value} onChange={(e) => onChange?.(e.target.value)} className="w-full rounded-[4px] border px-1.5 py-1 text-[12px] outline-none" style={{ background: C.bg, borderColor: C.outline, color: C.text }}>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Thumb({ u, size }: { u: string; size: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { io.disconnect(); fetchGameThumbnailByUniverseId(Number(u)).then(setSrc).catch(() => {}); }
    }, { rootMargin: "100px" });
    io.observe(el); return () => io.disconnect();
  }, [u]);
  return (
    <div ref={ref} className="shrink-0 overflow-hidden rounded-[5px]" style={{ width: size, height: size, background: "rgb(34,34,36)" }}>
      {src ? <img src={src} alt="" className="h-full w-full object-cover" /> : <div className="h-full w-full animate-pulse" style={{ background: "rgb(50,50,54)" }} />}
    </div>
  );
}

// ---------- the Games tab (real data) ----------
function GamesTab({ toast }: { toast: (t: string) => void }) {
  const [games, setGames] = useState<Game[] | null>(null);
  const [filter, setFilter] = useState<"All" | "New" | "Upd">("All");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Game | null>(null);
  const [players, setPlayers] = useState<number | null>(null);
  useEffect(() => {
    fetch(RPC_URL, { method: "POST", headers: { "Content-Type": "application/json", apikey: RPC_ANON, Authorization: "Bearer " + RPC_ANON }, body: "{}" })
      .then((r) => r.json()).then((rows: any[]) => {
        const seen = new Set<string>();
        setGames(rows.filter((g) => g.u && !GAMES_HIDE.has(String(g.u)) && !seen.has(String(g.u)) && seen.add(String(g.u)))
          .map((g) => ({ u: String(g.u), p: String(g.p), n: cleanName(g.n), free: g.f === true, added: g.a, upd: g.d })));
      }).catch(() => setGames([]));
  }, []);
  const shown = useMemo(() => (games ?? []).filter((g) => (filter === "New" ? isNew(g) : filter === "Upd" ? isUpd(g) : true))
    .filter((g) => !q || g.n.toLowerCase().includes(q.toLowerCase())), [games, filter, q]);
  const pick = (g: Game) => {
    setSel(g); setPlayers(null);
    supabase.functions.invoke("script-requests", { body: { action: "lookup", query: g.p } }).then(({ data }) => setPlayers((data as any)?.games?.[0]?.playing ?? null)).catch(() => {});
  };
  const sub = (g: Game) => {
    if (isUpd(g)) { const d = daysAgo(g.upd)!; return { t: d === 0 ? "Updated today" : d === 1 ? "Updated yesterday" : `Updated ${d} days ago`, c: "rgb(240,200,90)" }; }
    if (isNew(g)) { const d = daysAgo(g.added)!; return { t: d === 0 ? "Added today" : d === 1 ? "Added yesterday" : `Added ${d} days ago`, c: "rgb(240,200,90)" }; }
    return null;
  };
  return (
    <div className="grid h-full grid-cols-2 gap-2">
      <Groupbox title="Supported Games" icon={List}>
        <Label grey>{games === null ? "Loading games..." : <><b style={{ color: C.text }}>{shown.length}</b> games</>}</Label>
        <div className="flex gap-1">
          {([["All", "All"], ["New", "New this week"], ["Upd", "Updated"]] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFilter(k)} className="rounded-[4px] border px-1.5 py-0.5 text-[10.5px] font-semibold"
              style={{ background: filter === k ? "var(--acc)" : "rgb(28,28,28)", color: filter === k ? "rgb(10,10,10)" : "rgb(190,190,195)", borderColor: "rgba(45,45,45,0.6)" }}>{l}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-[4px] border px-1.5" style={{ background: C.bg, borderColor: C.outline }}>
          <Search className="h-3 w-3" style={{ color: C.grey }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search games..." className="w-full bg-transparent py-1 text-[12px] outline-none" style={{ color: C.text }} />
        </div>
        <div className="max-h-[208px] space-y-1.5 overflow-y-auto pr-0.5">
          {games === null && <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin" style={{ color: "var(--acc)" }} /></div>}
          {games && shown.length === 0 && <p className="py-2 text-center text-[12px]" style={{ color: C.grey }}>No games match your search.</p>}
          {shown.map((g) => {
            const s = sub(g), pill = isUpd(g) ? "UPD" : isNew(g) ? "NEW" : null, on = sel?.u === g.u;
            return (
              <button key={g.u} onClick={() => pick(g)} className="relative flex h-[52px] w-full items-center gap-2 rounded-[5px] border px-[7px] text-left transition-transform hover:scale-[1.025]"
                style={{ background: "rgb(26,26,26)", borderColor: on ? "var(--acc)" : "rgb(45,45,45)", borderWidth: on ? 1.6 : 1 }}>
                <Thumb u={g.u} size={40} />
                <span className="min-w-0 flex-1">
                  <span className={`block truncate text-[13px] font-bold ${pill ? "pr-9" : ""}`} style={{ color: C.text }}>{g.n || g.p}</span>
                  {s && <span className="block truncate text-[11px]" style={{ color: s.c }}>{s.t}</span>}
                </span>
                {pill && <span className="absolute right-2 top-[7px] rounded-[3px] px-1 text-[9px] font-bold" style={{ background: "var(--acc)", color: "rgb(10,10,10)" }}>{pill}</span>}
              </button>
            );
          })}
        </div>
      </Groupbox>
      <Groupbox title="Game Info" icon={Info}>
        {!sel ? <Label grey>Pick a game on the left</Label> : (
          <>
            <div className="flex justify-center"><Thumb u={sel.u} size={110} /></div>
            <Label><b>{sel.n}</b></Label>
            <Label grey>{players === null ? "Checking players..." : `${short(players)} playing now`}</Label>
            {sub(sel) && <p className="text-[12px]" style={{ color: "var(--tgold)" }}>{sub(sel)!.t}</p>}
          </>
        )}
        <Btn onClick={() => toast(sel ? "Game link copied. Paste it in your browser." : "Pick a game first.")}>Copy Game Link</Btn>
        <Btn onClick={() => { navigator.clipboard?.writeText(IQ).catch(() => {}); toast("Script copied. Run it in any supported game."); }}>Copy Script</Btn>
        <Btn onClick={() => toast(sel ? "This game blocks teleports. Join link copied: paste it in your browser to jump straight in." : "Pick a game first.")}>Join Game</Btn>
      </Groupbox>
    </div>
  );
}

// ---------- page ----------
const TABS = [
  { k: "Info", icon: CircleUser }, { k: "Main", icon: User }, { k: "Premium Key", icon: Key },
  { k: "Games", icon: Gamepad2 }, { k: "Suggestions", icon: MessageSquare }, { k: "UI Settings", icon: Settings },
];

// admin = the /admin/hub-preview tool (all switches); public = the "see the hub" demo on the Premium page.
export function HubDemo({ admin = false }: { admin?: boolean }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState("Games");
  const [theme, setTheme] = useState("Gold");
  const [mode, setMode] = useState<"free" | "key">("free");
  const [device, setDevice] = useState<"pc" | "phone">(() => (typeof window !== "undefined" && window.innerWidth < 700 ? "phone" : "pc"));
  const [fx, setFx] = useState({ gold: true, float: true, hud: true, dust: true, splash: false, sound: true, streamer: false });
  const [open, setOpen] = useState(true);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = (t: string) => { setToastMsg(t); window.setTimeout(() => setToastMsg(null), 2600); };
  const T = THEMES[theme];
  const vars = { "--acc": fx.gold ? T.accent : "rgb(125,85,255)", "--tgold": fx.gold ? T.accent : "rgb(160,140,255)", "--g1": T.g1, "--g2": T.g2, "--hot": T.hot } as React.CSSProperties;
  const name = fx.streamer ? "Hidden" : "PlayerOne";


  const W = device === "pc" ? 560 : 340, H = device === "pc" ? 340 : 300, SIDE = device === "pc" ? 132 : 44;
  const content: Record<string, React.ReactNode> = {
    Info: (
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-2">
          <Groupbox title="You" icon={User}>
            <div className="flex justify-center"><div className="flex h-[72px] w-[72px] items-center justify-center rounded-full" style={{ background: "rgb(40,40,44)" }}><User className="h-9 w-9" style={{ color: C.grey }} /></div></div>
            <Label>Welcome back, <Gold>{fx.streamer ? "Hidden" : "Player One"}</Gold></Label>
            <Label grey>@{name}  ·  Delta</Label>
            <Label grey>Account age: 512 days</Label>
          </Groupbox>
          <Groupbox title="Links" icon={LinkIcon}>
            <Btn onClick={() => toast("Discord link copied.")}>Copy Discord</Btn>
            <Btn onClick={() => toast("Website link copied.")}>Copy Website</Btn>
          </Groupbox>
        </div>
        <Groupbox title="Server" icon={Server}>
          <Label grey>Kaiju Alpha</Label>
          <Label><span style={{ color: C.grey }}>Players: </span>14/20  <span style={{ color: C.grey }}>Ping: </span>84 ms  <span style={{ color: C.grey }}>In server: </span>6m</Label>
          <Btn onClick={() => toast("Job ID copied.")}>Copy Job ID</Btn>
          <Btn onClick={() => toast("Rejoining...")}>Rejoin</Btn>
          <Btn onClick={() => toast("Finding another server...")}>Server Hop</Btn>
        </Groupbox>
      </div>
    ),
    Main: (
      <div className="grid grid-cols-2 gap-2">
        <Groupbox title="Free Session" icon={Info}>
          <Label>{mode === "free" ? "Session time: 24:31" : "Session time: —"}</Label>
          <Label>Cooldown: —</Label>
          <Label grey>Upgrade to an 11-hour key to remove the cooldown.</Label>
          <Btn onClick={() => toast("Link copied. Paste it into your browser.")}>Copy Key Link</Btn>
        </Groupbox>
        <Groupbox title="Status" icon={Shield}>
          <Label>{mode === "free" ? "✅ Free session active" : "🔓 Key valid"}</Label>
          <Label grey>{mode === "free" ? "Time left: 24:31" : "Expires in 7h 52m"}</Label>
          <Label grey>{mode === "free" ? "Want no limits? Grab a key in the Premium Key tab." : ""}</Label>
        </Groupbox>
      </div>
    ),
    "Premium Key": (
      <div className="grid grid-cols-2 gap-2">
        <Groupbox title="Enter Your Key" icon={Key}>
          <Input label="Key 🔑" placeholder="Paste your key here..." />
          <Btn onClick={() => toast("🔑 Checking... Validating your key...")}>✅ Submit Key</Btn>
          <Btn onClick={() => toast("Key link copied.")}>🔗 Get Key</Btn>
        </Groupbox>
        <Groupbox title="Your HWID" icon={Shield}>
          <Label grey>3f9a1c7e5b2d48a6b0e1c2d3…</Label>
          <Btn onClick={() => toast("HWID copied.")}>📋 Copy HWID</Btn>
          <Btn onClick={() => toast("Encrypted HWID copied.")}>🔒 Copy Encrypted HWID</Btn>
        </Groupbox>
      </div>
    ),
    Games: <GamesTab toast={toast} />,
    Suggestions: (
      <div className="grid grid-cols-2 gap-2">
        <Groupbox title="Suggestions / Help" icon={MessageSquare}>
          <Dropdown label="Type" value="Suggestion" options={["Suggestion", "Bug", "Help"]} />
          <Input label="Message" placeholder="Type your message (500 characters max)" />
          <Btn onClick={() => toast("Your feedback was sent. Thank you!")}>📨 Send</Btn>
          <Label grey>Maximum 3 messages per hour. No links or mentions.</Label>
        </Groupbox>
        <Groupbox title="Help / FAQ" icon={LifeBuoy}>
          <Btn onClick={() => toast("Discord link copied. Paste it into your browser.")}>💬 Join Discord</Btn>
          <Label grey>❓ How do I get premium? Get a key at keys.combowick.com/verify, then paste it into the Premium Key tab.</Label>
          <Label grey>⏳ Why am I on cooldown? The free version has a waiting period between sessions. An 11-hour key removes it.</Label>
        </Groupbox>
      </div>
    ),
    "UI Settings": (
      <div className="grid grid-cols-2 gap-2">
        <Groupbox title="Menu" icon={Wrench}>
          <Toggle label="Custom Cursor" value={false} />
          <Label grey>Menu keybind: RightShift</Label>
          <Btn onClick={() => setOpen(false)}>Unload</Btn>
        </Groupbox>
        <Groupbox title="Effects" icon={Sparkles}>
          <Toggle label="Gold Theme" value={fx.gold} onChange={(v) => setFx({ ...fx, gold: v })} />
          <Dropdown label="Theme" value={theme} options={Object.keys(THEMES).map((k) => (THEMES[k].premium ? k + " ★" : k))} onChange={(v) => setTheme(v.replace(" ★", ""))} />
          <Toggle label="Floating Logo" value={fx.float} onChange={(v) => setFx({ ...fx, float: v })} />
          <Toggle label="Watermark HUD" value={fx.hud} onChange={(v) => setFx({ ...fx, hud: v })} />
          <Toggle label="Gold Dust" value={fx.dust} onChange={(v) => setFx({ ...fx, dust: v })} />
          <Toggle label="UI Sounds" value={fx.sound} onChange={(v) => setFx({ ...fx, sound: v })} />
          {admin && <Toggle label="Streamer Mode (hide my name)" note="· not live yet" value={fx.streamer} onChange={(v) => setFx({ ...fx, streamer: v })} />}
        </Groupbox>
      </div>
    ),
  };

  return (
    <div className={admin ? "min-h-screen bg-[#0b0b0d] text-white" : "text-white"} style={vars}>
      <style>{`
        @keyframes cwspin { to { transform: translate(-50%,-50%) rotate(360deg); } }
        @keyframes cwshine { 0% { background-position: -150% 0; } 60%,100% { background-position: 250% 0; } }
        @keyframes cwdust { from { transform: translateY(0); opacity: .0 } 20% { opacity: .8 } to { transform: translateY(-120px); opacity: 0 } }
        .cw-shine { background: linear-gradient(100deg, var(--tgold) 40%, #fff 50%, var(--tgold) 60%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; color: transparent; animation: cwshine 3.2s linear infinite; }
      `}</style>
      {/* controls */}
      {!admin && (
        <div className="flex flex-wrap items-center justify-center gap-2 pb-3">
          {Object.keys(THEMES).map((k) => (
            <button key={k} onClick={() => setTheme(k)} className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${theme === k ? "border-primary bg-primary/15 text-primary" : "border-white/15 text-white/70 hover:text-white"}`}>
              {k}{THEMES[k].premium && <span className="ml-1 text-[10px] text-primary">★ {t("Premium")}</span>}
            </button>
          ))}
          <button onClick={() => setMode(mode === "free" ? "key" : "free")} className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-white/70 hover:text-white">
            {mode === "free" ? t("Free version") : t("Premium version")} ⇄
          </button>
        </div>
      )}
      {admin && <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 border-b border-white/10 bg-black/80 px-4 py-3 backdrop-blur">
        <span className="mr-2 font-bold">Hub Preview</span>
        <select value={theme} onChange={(e) => setTheme(e.target.value)} className="rounded border border-white/15 bg-black px-2 py-1 text-sm">{Object.keys(THEMES).map((k) => <option key={k}>{k}</option>)}</select>
        <select value={mode} onChange={(e) => setMode(e.target.value as any)} className="rounded border border-white/15 bg-black px-2 py-1 text-sm"><option value="free">Free session</option><option value="key">Key user</option></select>
        <button onClick={() => setDevice("pc")} className={`rounded border px-2 py-1 text-sm ${device === "pc" ? "border-primary text-primary" : "border-white/15"}`}><Monitor className="inline h-4 w-4" /> PC</button>
        <button onClick={() => setDevice("phone")} className={`rounded border px-2 py-1 text-sm ${device === "phone" ? "border-primary text-primary" : "border-white/15"}`}><Smartphone className="inline h-4 w-4" /> Phone</button>
        {!open && <button onClick={() => setOpen(true)} className="rounded border border-white/15 px-2 py-1 text-sm">Reopen hub</button>}
        <span className="ml-auto text-xs text-white/50">Lookalike of the in-game hub · Games tab uses live data · nothing here changes the real loader</span>
      </div>}

      {/* "game" stage */}
      <div className={`relative mx-auto overflow-hidden rounded-xl border border-white/10 ${admin ? "my-6" : ""}`} style={{ width: device === "pc" ? 900 : 390, maxWidth: "calc(100vw - 32px)", height: device === "pc" ? 520 : 760, background: "radial-gradient(ellipse at 30% 20%, #3a5a7a 0%, #1e3348 40%, #0d1a26 100%)" }}>
        <div className="absolute inset-x-0 bottom-0 h-1/3" style={{ background: "linear-gradient(180deg, transparent, #2f4a22)" }} />
        {fx.hud && (
          <div className="absolute left-1/2 top-2 z-10 -translate-x-1/2 rounded-md border px-3 py-1 text-[11px] font-semibold" style={{ background: "rgba(10,10,10,.8)", borderColor: "var(--acc)" }}>
            <span className="cw-shine font-extrabold">COMBO_WICK</span><span className="text-white/40"> | </span>FPS <b className="text-green-400">60</b><span className="text-white/40"> | </span><b className="text-green-400">84</b> ms<span className="text-white/40"> | </span>
            {mode === "free" ? <b style={{ color: "#F0C040" }}>FREE 24:31</b> : <b className="text-green-400">KEY</b>}
          </div>
        )}
        {fx.float && (
          <button onClick={() => setOpen(!open)} className="absolute left-3 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border-2 text-sm font-black" style={{ background: "#111", borderColor: "var(--acc)", color: "var(--acc)", boxShadow: "0 0 18px var(--acc)" }}>CW</button>
        )}

        {open && (
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: W, height: H }}>
            {/* gold border: spinning streak behind a 1.5px gap */}
            <div className="absolute -inset-[1.5px] overflow-hidden rounded-[7px]" style={{ boxShadow: fx.gold ? "0 0 22px var(--g2)" : "none" }}>
              {fx.gold && <div className="absolute left-1/2 top-1/2 aspect-square w-[160%]" style={{ background: "conic-gradient(var(--g1), var(--g2), var(--hot), var(--g2), var(--g1), var(--g2), var(--g1))", animation: "cwspin 4s linear infinite" }} />}
              {!fx.gold && <div className="absolute inset-0" style={{ background: C.outline }} />}
            </div>
            <div className="relative flex h-full flex-col overflow-hidden rounded-[6px]" style={{ background: C.bg }}>
              {/* top bar */}
              <div className="flex h-10 shrink-0 items-center gap-2 border-b px-2" style={{ borderColor: C.outline }}>
                <div className="flex h-7 items-center rounded px-1"><span className="cw-shine text-[15px] font-black tracking-wide">COMBO_WICK</span></div>
                <div className="ml-auto flex h-6 flex-1 items-center gap-1 rounded border px-1.5" style={{ maxWidth: 170, background: C.main, borderColor: C.outline }}><Search className="h-3 w-3" style={{ color: C.grey }} /><span className="text-[11px]" style={{ color: C.grey }}>Search</span></div>
                <button onClick={() => setOpen(false)}><X className="h-4 w-4" style={{ color: C.grey }} /></button>
              </div>
              <div className="flex min-h-0 flex-1">
                {/* sidebar */}
                <div className="shrink-0 space-y-0.5 border-r p-1.5" style={{ width: SIDE, borderColor: C.outline, background: "#121212" }}>
                  {TABS.map(({ k, icon: Icon }) => (
                    <button key={k} onClick={() => setTab(k)} title={k} className="flex w-full items-center gap-1.5 rounded px-1.5 py-1.5 text-left text-[12px]"
                      style={{ background: tab === k ? C.main : "transparent", color: tab === k ? C.text : C.grey }}>
                      <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: tab === k ? "var(--acc)" : C.grey }} />
                      {device === "pc" && <span className="truncate">{k}</span>}
                    </button>
                  ))}
                </div>
                {/* content */}
                <div className="min-w-0 flex-1 overflow-y-auto p-2">{content[tab]}</div>
              </div>
              <div className="shrink-0 border-t px-2 py-1 text-center text-[10.5px]" style={{ borderColor: C.outline, color: C.grey }}>{mode === "free" ? "Free Version" : "Premium Version"}</div>
            </div>
            {fx.dust && fx.gold && Array.from({ length: 14 }).map((_, i) => (
              <span key={i} className="pointer-events-none absolute h-1 w-1 rounded-full" style={{ left: `${(i * 37) % 100}%`, bottom: -4, background: "var(--acc)", animation: `cwdust ${3 + (i % 4)}s ${i * 0.4}s linear infinite` }} />
            ))}
          </div>
        )}
        {toastMsg && (
          <div className="absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-md border px-3 py-1.5 text-[12px]" style={{ background: "rgba(10,10,10,.9)", borderColor: "var(--acc)", color: C.text }}>{toastMsg}</div>
        )}
      </div>
      {admin && <p className="pb-8 text-center text-xs text-white/40">Tip: change things here first, then we copy the look into the real hub and test it in-game once before going live.</p>}
      {!admin && THEMES[theme].premium && <p className="pt-3 text-center text-xs text-primary">★ {t("The {x} theme is a Premium perk.").replace("{x}", theme)}</p>}
    </div>
  );
}

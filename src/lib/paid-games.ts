// Shared definition of the hardcoded paid game scripts shown on the Premium Keys page.
// `key` is a stable identifier used to toggle visibility from the Admin dashboard.
export type PaidGame = {
  key: string;
  game: string;
  title: string;
  subtitle: string;
  features: string[];
  monthlyPrice: number;
  lifetimePrice?: number;
  thumbnail: string;
  badge: { text: string; variant: "red" | "primary" | "amber" };
  warning?: string;
  /** Lua loader delivered to the buyer on a successful purchase. */
  script?: string;
  /** Small note shown under the monthly price option. */
  monthlyNote?: string;
  /** Small note shown under the lifetime price option. */
  lifetimeNote?: string;
  changelog: { id: number; version: string; changes: string; created_at: string }[];
};

export const PAID_GAMES: PaidGame[] = [
  {
    key: "desert-war",
    game: "Desert War [UPDATE] 🌴",
    title: "Desert War Script",
    subtitle: "Combat utility suite",
    features: ["Infinite Ammo", "Kill All", "Aimbot", "ESP", "HitBox Expander", "Invisibility"],
    monthlyPrice: 9,
    thumbnail: "https://tr.rbxcdn.com/180DAY-07ecdc2f6af0cebd23dc934b6bbbf614/768/432/Image/Png/noFilter",
    badge: { text: "2.0", variant: "red" },
    warning: "Use a fresh / alt account — main accounts at your own risk.",
    changelog: [
      { id: 1, version: "v2.0", changes: "Rewrote aimbot for new map update.", created_at: "2026-05-01" },
      { id: 2, version: "v1.8", changes: "Added invisibility toggle.", created_at: "2026-04-15" },
    ],
  },
  {
    key: "jurassic-blocky",
    game: "Jurassic Blocky",
    title: "Jurassic Blocky Script",
    subtitle: "Auto farm + PvP",
    features: ["Auto Collect Amber", "Kill All Goat", "Kill Players", "Unpatched & Working"],
    monthlyPrice: 7.99,
    lifetimePrice: 11.99,
    thumbnail: "https://tr.rbxcdn.com/180DAY-72007dc11099c62685db43551189ca26/768/432/Image/Png/noFilter",
    badge: { text: "UNPATCHED", variant: "primary" },
    script: 'loadstring(game:HttpGet("https://project--99e78c61-02dc-4bac-bdf3-0501b0b864dc-dev.lovable.app/api/public/script-loader?id=14961600056"))()',
    monthlyNote: "Monthly gets instant updates",
    lifetimeNote: "If patched, updates come 1-2 weeks later",
    changelog: [
      { id: 1, version: "v1.4", changes: "Bypass for latest anti-cheat patch.", created_at: "2026-05-05" },
    ],
  },
  {
    key: "state-of-anarchy",
    game: "State of Anarchy",
    title: "State of Anarchy Script",
    subtitle: "Full PvP toolkit",
    features: ["Kill All Players", "ESP / Wallhack", "Teleport to Loot", "Aim-Bot", "Hitbox Expander"],
    monthlyPrice: 10,
    lifetimePrice: 17,
    thumbnail: "https://tr.rbxcdn.com/180DAY-43670f7186821eb93f47c92d53729cdd/768/432/Image/Png/noFilter",
    badge: { text: "POPULAR", variant: "amber" },
    warning: "Stay low-profile — heavy usage may flag your account.",
    changelog: [
      { id: 1, version: "v3.1", changes: "Improved teleport reliability.", created_at: "2026-04-28" },
    ],
  },
];

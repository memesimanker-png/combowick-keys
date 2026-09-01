// SEO landing pages for high-volume game keywords.
// IMPORTANT: features[] must reflect REAL script features only.
// For games we don't have scripts for yet, leave features empty and the
// landing page will show a "Request features / coming soon" block instead.

export type GameLanding = {
  slug: string;
  game: string;
  keyword: string;
  volume: string;
  difficulty: string;
  title: string;
  metaDescription: string;
  h1: string;
  intro: string;
  features: string[];          // empty array = show "coming soon" block
  status: "live" | "coming-soon" | "in-development";
  faqs: { q: string; a: string }[];
};

export const GAME_LANDINGS: Record<string, GameLanding> = {
  "jurassic-blocky": {
    slug: "jurassic-blocky",
    game: "Jurassic Blocky",
    keyword: "jurassic blocky script",
    volume: "170/mo",
    difficulty: "Easy",
    title: "Jurassic Blocky Script — Auto Collect Amber, Kill All Goat | ComboWick",
    metaDescription:
      "Free Jurassic Blocky script — Auto Collect Amber, Kill All Goat, Kill Players and more. HWID-locked, undetected and updated weekly by ComboWick.",
    h1: "Jurassic Blocky Script",
    intro:
      "ComboWick's Jurassic Blocky exploit pack — auto collect amber, kill all goats, kill players and a stack of utility features. HWID-key protected, free to use, patched within hours of every Jurassic Blocky update.",
    features: [
      "Auto Collect Amber",
      "Kill All Goat",
      "Kill Players",
      "Anti-AFK + Auto-Reconnect",
      "HWID Key System (free 11-hour keys)",
      "Works on all major executors",
    ],
    status: "live",
    faqs: [
      {
        q: "Is the Jurassic Blocky script free?",
        a: "Yes. Free with a 24-hour HWID key obtained through the standard ComboWick verification flow. Premium keys remove the daily refresh.",
      },
      {
        q: "Will I get banned?",
        a: "We patch within hours of any Jurassic Blocky update, but no exploit is 100% safe. Use an alt account if you care about your main.",
      },
      {
        q: "Which executors are supported?",
        a: "Hydrogen (Android), Delta, Wave, Solara, Xeno and any executor with full UNC support.",
      },
      {
        q: "How do I report bugs?",
        a: "Discord — linked in the footer. Bug reports are usually fixed within the next drop window (Mon/Wed/Fri 18:00 UTC).",
      },
    ],
  },

  "blox-fruits": {
    slug: "blox-fruits",
    game: "Blox Fruits",
    keyword: "blox fruits script",
    volume: "6,600/mo",
    difficulty: "Easy (22/100)",
    title: "Blox Fruits Script — Coming Soon | ComboWick",
    metaDescription:
      "ComboWick is building a Blox Fruits script. Join the Discord to suggest features and be notified the moment it drops.",
    h1: "Blox Fruits Script",
    intro:
      "ComboWick doesn't have a Blox Fruits script live yet — but it's on the roadmap. Join the Discord to vote on which features ship first (auto farm, devil fruit sniper, raid auto, ESP) and get notified the moment it drops.",
    features: [],
    status: "coming-soon",
    faqs: [
      {
        q: "When will the Blox Fruits script release?",
        a: "No fixed date yet. Drops happen Mon/Wed/Fri 18:00 UTC. Join Discord to be notified instantly.",
      },
      {
        q: "Will it be free?",
        a: "Yes. Same model as the rest of ComboWick — free with a 24-hour HWID key, premium keys for no-refresh access.",
      },
      {
        q: "Can I request specific features?",
        a: "Absolutely. Drop your requests in the Discord #suggestions channel — top-voted features ship in the first version.",
      },
      {
        q: "Which executors will it support?",
        a: "All UNC-compliant executors — Hydrogen, Delta, Wave, Solara, Xeno.",
      },
    ],
  },

  "arsenal": {
    slug: "arsenal",
    game: "Arsenal",
    keyword: "arsenal script",
    volume: "2,900/mo",
    difficulty: "Easy (18/100)",
    title: "Arsenal Script — Coming Soon | ComboWick",
    metaDescription:
      "ComboWick is building an Arsenal script. Join the Discord to suggest features and be notified the moment it drops.",
    h1: "Arsenal Script",
    intro:
      "ComboWick doesn't have an Arsenal script live yet — but it's on the roadmap. Join the Discord to vote on features (silent aim, ESP, hitbox extender, auto-shoot) and get notified the moment it drops.",
    features: [],
    status: "coming-soon",
    faqs: [
      {
        q: "When does the Arsenal script release?",
        a: "No fixed date yet. Drops happen Mon/Wed/Fri 18:00 UTC. Join Discord for instant notifications.",
      },
      {
        q: "Will it be free?",
        a: "Yes — free with a 24-hour HWID key. Premium keys ($5 / 7 days) remove the daily refresh.",
      },
      {
        q: "Can I suggest features?",
        a: "Yes — Discord #suggestions channel. Top-voted features ship in v1.",
      },
      {
        q: "Will it work on mobile?",
        a: "Yes. Hydrogen Android and Delta Mobile will be supported on launch.",
      },
    ],
  },

  "pet-simulator": {
    slug: "pet-simulator",
    game: "Pet Simulator",
    keyword: "pet simulator script",
    volume: "110/mo",
    difficulty: "Easy (21/100)",
    title: "Pet Simulator Script — Coming Soon | ComboWick",
    metaDescription:
      "ComboWick is building a Pet Simulator 99 / X script. Join the Discord to suggest features and be notified the moment it drops.",
    h1: "Pet Simulator Script",
    intro:
      "ComboWick doesn't have a Pet Simulator script live yet — but it's on the roadmap. Join the Discord to vote on features (auto farm, auto hatch, dupe, best-area teleport) and get notified the moment it drops.",
    features: [],
    status: "coming-soon",
    faqs: [
      {
        q: "When will the Pet Sim script release?",
        a: "No fixed date yet. Drops happen Mon/Wed/Fri 18:00 UTC. Join Discord to be notified.",
      },
      {
        q: "Will it cover PS99 and PSX?",
        a: "Plan is full PS99 + PSX support in one unified UI. Final scope depends on Discord feature voting.",
      },
      {
        q: "Will it be free?",
        a: "Yes — free with a 24-hour HWID key, premium for no-refresh access.",
      },
      {
        q: "Can I request features?",
        a: "Yes — Discord #suggestions channel.",
      },
    ],
  },
};

export const GAME_SLUGS = Object.keys(GAME_LANDINGS);

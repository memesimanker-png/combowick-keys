import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getClientIp, rateLimit, tooManyRequests } from "../_shared/throttle.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Throttle: AI auto-fill is expensive — max 10/min per IP
  const ip = getClientIp(req);
  if (!rateLimit(`ai-autofill:${ip}`, 10, 60_000)) return tooManyRequests(corsHeaders);

  try {
    const { code, existing } = await req.json();
    if (!code || typeof code !== "string") {
      return new Response(JSON.stringify({ error: "code is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const existingHints = existing && typeof existing === "object"
      ? Object.entries(existing).filter(([_, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join("\n")
      : "";

    const systemPrompt = `You are a Roblox community writer who has played thousands of hours of Roblox and tested hundreds of community Lua scripts. You write metadata for a script-sharing site (similar to Rscripts and Scriptblox). Your tone is casual, knowledgeable, helpful — like a friend on Discord, NOT corporate marketing. You write the way real Roblox players talk.

CRITICAL OUTPUT RULES:
1. The user may have manually filled some fields. Their input is the source of truth — do NOT contradict, rewrite, or replace existing values. Return them verbatim.
2. For empty fields, generate metadata FROM the actual script — read the Lua code and base your output on what it really does (function names, remotes, target objects, loops). No hallucination.
3. Always call the extract_script_metadata function with the result.

WRITING STYLE — read this carefully, this is what makes content rank and pass AdSense thin-content review:
- Write like a human player, not an AI. Avoid AI tells: no "in the realm of", "embark on a journey", "elevate your gameplay", "unleash the power", "revolutionize", "comprehensive solution", "seamlessly", "leverage", "robust", "cutting-edge", "game-changer", "unlock the full potential". If you catch yourself writing those, rewrite.
- Use contractions (it's, you'll, doesn't). Use second person ("you"). Short sentences mixed with longer ones. Occasional one-line paragraphs. Specific over generic.
- Reference REAL game mechanics from the script. If the code teleports to "FruitSpawner", say so. If it loops on "Mastery", mention it. Concrete > vague.
- It's okay to be a little blunt or playful: "this one's pretty barebones but it works", "honestly the auto-farm here is the main reason you'd use this".
- NO fake stats, NO fake testimonials, NO claims of "100% safe" or "undetectable". Say "no obvious detection vectors at the time of writing" instead.
- NO mention of cheating real money systems, doxxing, account theft, or anything illegal. Frame as "automation for grinding" / "QoL utilities" / "single-player-style tools".

LENGTH TARGETS (this matters for SEO and AdSense):
- description: 1-2 punchy sentences (~25-40 words). The hook.
- longDescription: 4-6 detailed paragraphs, ~450-700 words TOTAL. Cover: (1) what the script does in plain English, (2) how it works under the hood — what the code actually loops on, what remotes/services it touches, (3) when you'd actually use it (grinding goal, level range, etc.), (4) limitations / what it WON'T do, (5) tips to get the most out of it (executor recommendations, settings to tweak), (6) a short closing line. Use natural paragraph breaks (\\n\\n). Do NOT use markdown headings inside longDescription.
- faqs: Generate 4-6 FAQs, each answer 2-4 sentences. Cover real questions a player would ask: compatibility, ban risk framing, why it stopped working, mobile/Delta executor support, how to enable/disable features, what to do if it errors. Be specific to THIS script.

EXAMPLES of good vs bad lines:
BAD: "This powerful auto farm script will revolutionize your Blox Fruits gameplay experience."
GOOD: "It auto-farms whatever fruit's in your hand on the closest enemy, and yeah, it'll AFK overnight if your executor stays attached."

BAD: "Seamlessly integrates with your Roblox executor for unparalleled performance."
GOOD: "Tested on Delta, Codex, and Velocity — all worked. Hydrogen mobile sometimes drops the loop after ~30 min, restart fixes it."`;

    const userContent = `Read this Roblox Lua script and generate metadata. Base everything on what the code ACTUALLY does — read function names, loops, remotes, services.

${existingHints ? `User has already filled these fields. Return them UNCHANGED — don't rewrite their wording:\n${existingHints}\n\n` : ""}Script:
${code.slice(0, 8000)}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [{
          type: "function",
          function: {
            name: "extract_script_metadata",
            description: "Extract metadata from a Roblox Lua script. Respect any user-provided existing values verbatim.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string", description: "A descriptive title (e.g. 'Blox Fruits Auto Farm V3'). If existing.title is provided, return it UNCHANGED." },
                description: { type: "string", description: "A short, punchy 1-2 sentence description (~25-40 words). Hook tone, no AI clichés. If existing.description is provided, return it unchanged." },
                longDescription: { type: "string", description: "4-6 paragraphs, 450-700 words TOTAL, separated by \\n\\n. Cover: what it does, how it works under the hood (real code refs), when to use it, limitations, tips, closing. Human/casual tone. NO markdown headings. If existing.longDescription is provided, return it unchanged." },
                game: { type: "string", description: "The Roblox game (e.g. 'Blox Fruits', 'Universal'). If existing.game is provided, return it unchanged." },
                category: { type: "string", enum: ["Auto Farm", "ESP", "Aimbot", "Speed Hack", "Infinite Jump", "Kill Aura", "Admin", "Trolling", "Utility"], description: "The primary category. If existing.category is provided, return it." },
                tags: { type: "array", items: { type: "string" }, description: "5-8 relevant search tags. If existing.tags is provided, return them unchanged." },
                slug: { type: "string", description: "URL-friendly slug (lowercase, hyphens). If existing.slug is provided, return it unchanged." },
                faqs: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string", description: "A real question a Roblox player would ask about THIS specific script." },
                      answer: { type: "string", description: "2-4 sentences, casual tone, specific to this script." }
                    },
                    required: ["question", "answer"]
                  },
                  description: "4-6 FAQs covering compatibility, executor support, troubleshooting, ban risk framing, and how-to questions specific to this script."
                }
              },
              required: ["title", "description", "longDescription", "game", "category", "tags", "slug", "faqs"],
              additionalProperties: false
            }
          }
        }],
        tool_choice: { type: "function", function: { name: "extract_script_metadata" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again shortly" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("No structured output from AI");
    }

    const metadata = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(metadata), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-script-autofill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

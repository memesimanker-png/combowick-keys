import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Self-invokes /translate from inside Supabase edge runtime — bypasses client timeout.
const TEXTS_URL = "https://iphiksvnuzpteoryrdxf.supabase.co/functions/v1/translate";
const LANGS = ["fr","es","de","pt","ru","zh-CN","ko","th","id","fil","vi"];

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  const { texts } = await req.json();
  if (!Array.isArray(texts)) return new Response("texts required", { status: 400 });

  // Fire-and-forget: respond immediately, keep working via waitUntil-style background.
  (async () => {
    for (const lang of LANGS) {
      for (let i = 0; i < texts.length; i += 40) {
        const slice = texts.slice(i, i + 40);
        try {
          const r = await fetch(TEXTS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ texts: slice, language: lang }),
          });
          if (r.status === 429 || r.status === 402) await new Promise(r => setTimeout(r, 8000));
          await r.text();
        } catch (e) { console.error(lang, i, e); }
        await new Promise(r => setTimeout(r, 150));
      }
      console.log("done lang", lang);
    }
  })();

  return new Response(JSON.stringify({ started: true, langs: LANGS.length, texts: texts.length }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});

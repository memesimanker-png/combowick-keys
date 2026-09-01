// Posts a script announcement to a Discord webhook with a rich, branded embed.
// Admin-only. Triggered manually from the admin dashboard per script.
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://combowick.com'
const BRAND_COLOR = 0x7C3AED // violet-600
const BOT_USERNAME = 'Combo_WICK'
const FALLBACK_AVATAR = 'https://wsrv.nl/?url=upload.wikimedia.org/wikipedia/commons/thumb/6/69/Roblox_Logo.svg/512px-Roblox_Logo.svg.png&w=512&h=512&output=png'

// Strict URL validator — Discord rejects the entire payload if ANY url is malformed
function safeUrl(u: unknown): string | undefined {
  if (typeof u !== 'string') return undefined
  const trimmed = u.trim()
  if (!trimmed) return undefined
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return undefined
    return parsed.toString()
  } catch {
    return undefined
  }
}

function extractFeatures(longDescription: string | null | undefined, fallback: string): string[] {
  if (!longDescription) return splitBullets(fallback)
  const lines = longDescription.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const bullets = lines
    .filter(l => /^([-*•+]|\d+[.)])\s+/.test(l))
    .map(l => l.replace(/^([-*•+]|\d+[.)])\s+/, ''))
  if (bullets.length >= 2) return bullets.slice(0, 6)
  return splitBullets(fallback)
}

function splitBullets(text: string): string[] {
  if (!text) return []
  return text.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean).slice(0, 4)
}

function proxy(url: string, w: number, h: number): string {
  return `https://wsrv.nl/?url=${encodeURIComponent(url.replace(/^https?:\/\//, ''))}&w=${w}&h=${h}&output=png`
}

async function getUniverseId(id: number): Promise<number | null> {
  try {
    const probe = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${id}&size=150x150&format=Png&isCircular=false`)
    const pj = await probe.json().catch(() => ({}))
    if (Array.isArray(pj?.data) && pj.data.length > 0 && pj.data[0]?.imageUrl) return id
  } catch {}
  try {
    const r = await fetch(`https://apis.roblox.com/universes/v1/places/${id}/universe`)
    if (!r.ok) return null
    const j = await r.json()
    return typeof j?.universeId === 'number' ? j.universeId : null
  } catch { return null }
}

async function resolveGameIcon(universeId: number): Promise<string | undefined> {
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/games/icons?universeIds=${universeId}&size=512x512&format=Png&isCircular=false`)
    const j = await r.json()
    const url = j?.data?.[0]?.imageUrl
    return typeof url === 'string' ? proxy(url, 512, 512) : undefined
  } catch { return undefined }
}

async function resolveBanner(universeId: number): Promise<string | undefined> {
  try {
    const r = await fetch(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${universeId}&countPerUniverse=1&defaults=true&size=768x432&format=Png`)
    const j = await r.json()
    const url = j?.data?.[0]?.thumbnails?.[0]?.imageUrl
    return typeof url === 'string' ? proxy(url, 1280, 720) : undefined
  } catch { return undefined }
}

function fmtDate(d: string | null | undefined): string {
  try { return new Date(d || Date.now()).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }
  catch { return 'Today' }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Prefer admin-editable webhook from app_settings, fall back to env secret
    let webhookUrl = Deno.env.get('DISCORD_WEBHOOK_URL') || ''
    try {
      const settingsClient = createClient(supabaseUrl, serviceKey)
      const { data: settings } = await settingsClient
        .from('app_settings').select('discord_webhook_url').eq('id', 1).maybeSingle()
      if (settings?.discord_webhook_url) webhookUrl = settings.discord_webhook_url
    } catch (_) { /* ignore, env fallback used */ }
    if (!webhookUrl) {
      return new Response(JSON.stringify({ error: 'Discord webhook not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      global: { headers: { Authorization: authHeader } },
    })
    const admin = createClient(supabaseUrl, serviceKey)

    const { data: userRes, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userRes?.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userRes.user.id, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const scriptId: string | undefined = body.scriptId
    if (!scriptId) {
      return new Response(JSON.stringify({ error: 'scriptId required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // New options from client
    const mentionType: 'none' | 'everyone' | 'here' | 'role' = body.mentionType || 'none'
    const roleId: string | undefined = typeof body.roleId === 'string' ? body.roleId.trim() : undefined
    const customNote: string = typeof body.customNote === 'string' ? body.customNote.slice(0, 500) : ''
    const includeCodePreview: boolean = !!body.includeCodePreview

    const { data: script, error: scriptErr } = await admin
      .from('scripts').select('*').eq('id', scriptId).maybeSingle()
    if (scriptErr || !script) {
      return new Response(JSON.stringify({ error: 'Script not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const features = extractFeatures(script.long_description, script.description)
    const url = `${SITE_URL}/scripts/${script.slug}`
    const rawId = script.game_universe_id
    const universeId = rawId ? await getUniverseId(rawId) : null
    const [icon, resolvedBanner] = universeId
      ? await Promise.all([resolveGameIcon(universeId), resolveBanner(universeId)])
      : [undefined, undefined]

    // Validate every URL strictly so Discord doesn't reject the embed
    const safeIcon = safeUrl(icon)
    const safeBanner = safeUrl(resolvedBanner) || safeIcon || FALLBACK_AVATAR
    const safeAvatar = safeIcon || FALLBACK_AVATAR
    const safeYoutube = safeUrl(script.youtube_url)
    const safeGameUrl = safeUrl(script.game_url)

    const tagList = Array.isArray(script.tags) ? script.tags.filter(Boolean).slice(0, 6) : []
    const status = script.verified ? '✅ Verified' : '🆕 New'
    const trending = script.trending ? ' • 🔥 Trending' : ''
    const paid = script.is_paid ? ' • 💎 Premium' : ' • 🆓 Free'

    const fields: { name: string; value: string; inline?: boolean }[] = [
      { name: '🎮 Game', value: String(script.game || 'Roblox').slice(0, 1024), inline: true },
      { name: '📂 Category', value: String(script.category || 'Script').slice(0, 1024), inline: true },
      { name: '⚡ Status', value: `${status}${trending}${paid}`, inline: true },
    ]

    if (features.length) {
      fields.push({
        name: '✨ Features',
        value: features.map(f => `🔥 ${f}`).join('\n').slice(0, 1024),
      })
    }

    if (tagList.length) {
      fields.push({
        name: '🏷️ Tags',
        value: tagList.map((t: string) => `\`${String(t).slice(0, 30)}\``).join(' ').slice(0, 1024),
      })
    }

    if (includeCodePreview && script.code) {
      const preview = String(script.code).split('\n').slice(0, 6).join('\n').slice(0, 900)
      fields.push({
        name: '📜 Code Preview',
        value: '```lua\n' + preview + '\n```',
      })
    }

    fields.push({
      name: '🔗 Get the Script',
      value: `**[▶ Open Script Page](${url})** • [🌐 combowick.com](${SITE_URL})`,
    })

    const embed: Record<string, unknown> = {
      author: {
        name: 'Combo_WICK • Premium Scripts',
        url: SITE_URL,
        icon_url: safeAvatar,
      },
      title: String(script.title || 'New Script').slice(0, 256),
      url,
      description:
        `> ${String(script.description || 'New script just dropped.').slice(0, 380)}\n\n` +
        `📅 Released **${fmtDate(script.created_at)}** • [View on site →](${url})`,
      color: BRAND_COLOR,
      fields,
      image: { url: safeBanner },
      footer: {
        text: `Combo_WICK Scripts • ${String(script.game || 'Roblox').slice(0, 80)} • Always run on a trusted executor`,
        icon_url: safeAvatar,
      },
      timestamp: new Date().toISOString(),
    }
    if (safeIcon) (embed as any).thumbnail = { url: safeIcon }

    // Build link buttons — only include URLs that passed validation
    const buttons: any[] = [
      { type: 2, style: 5, label: '▶  Open Script', url },
      { type: 2, style: 5, label: '🌐  combowick.com', url: SITE_URL },
    ]
    if (safeYoutube) buttons.push({ type: 2, style: 5, label: '📺  Watch Tutorial', url: safeYoutube })
    if (safeGameUrl) buttons.push({ type: 2, style: 5, label: '🎮  Play Game', url: safeGameUrl })

    const components = [{ type: 1, components: buttons.slice(0, 5) }]

    // Mention prefix + allowed_mentions
    let mentionPrefix = ''
    const allowed_mentions: any = { parse: [] as string[], roles: [] as string[] }
    if (mentionType === 'everyone') {
      mentionPrefix = '@everyone '
      allowed_mentions.parse.push('everyone')
    } else if (mentionType === 'here') {
      mentionPrefix = '@here '
      allowed_mentions.parse.push('everyone') // @here is enabled via 'everyone' parse
    } else if (mentionType === 'role' && roleId && /^\d{5,25}$/.test(roleId)) {
      mentionPrefix = `<@&${roleId}> `
      allowed_mentions.roles.push(roleId)
    }

    const noteLine = customNote.trim() ? `\n${customNote.trim()}` : ''
    const headlineEmoji = script.is_paid ? '💎' : '🚀'
    const content = `${mentionPrefix}${headlineEmoji} **New ${script.is_paid ? 'Premium ' : ''}Script Released:** ${script.title}${noteLine}`.slice(0, 1900)

    const payload: Record<string, unknown> = {
      username: BOT_USERNAME,
      avatar_url: safeAvatar,
      content,
      embeds: [embed],
      components,
      allowed_mentions,
    }

    const resp = await fetch(`${webhookUrl}${webhookUrl.includes('?') ? '&' : '?'}with_components=true`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!resp.ok) {
      const txt = await resp.text()
      console.error('Discord webhook failed', resp.status, txt)
      // Retry once without components (older webhooks reject them)
      if (resp.status === 400) {
        const fallback = { ...payload }
        delete (fallback as any).components
        const retry = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallback),
        })
        if (retry.ok) {
          return new Response(JSON.stringify({ success: true, fallback: true }), {
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }
        const retryTxt = await retry.text()
        console.error('Discord retry also failed', retry.status, retryTxt)
        return new Response(JSON.stringify({ error: `Discord error ${retry.status}`, detail: retryTxt }), {
          status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
      return new Response(JSON.stringify({ error: `Discord error ${resp.status}`, detail: txt }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error('post-script-to-discord error', e)
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// Where a buyer came from (?src=hub-offer, ?src=hub-toptab, ?src=discord ...): remembered on ANY page for 3 days
// and sent with the PayPal capture, so every sale in premium_key_purchases.source shows which link sold it.
const SRC_KEY = "cw_src";
const SRC_DAYS = 3;

export function rememberSourceFromUrl() {
  try {
    const s = new URLSearchParams(window.location.search).get("src");
    if (s && /^[a-z0-9_-]{2,40}$/i.test(s)) localStorage.setItem(SRC_KEY, JSON.stringify({ s: s.toLowerCase(), at: Date.now() }));
  } catch { /* storage blocked */ }
}

export function saleSource(): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(SRC_KEY) || "null");
    if (v?.s && Date.now() - Number(v.at) < SRC_DAYS * 864e5) return String(v.s);
  } catch { /* storage blocked */ }
  return null;
}

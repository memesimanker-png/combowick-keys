import { useMemo, useState } from "react";
import { Globe, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/lib/translation-context";
import { detectInApp, chromeUrl } from "@/lib/in-app-browser";

/**
 * Shows only inside an app's built-in browser (or always, on the Blocked page with `always`).
 * Texts are hand-translated here so they don't depend on the translation service.
 */
type Tx = { title: string; body: string; blocked: string; open: string; copy: string; copied: string };
const TX: Record<string, Tx> = {
  en: { title: "Open this page in Chrome", body: "You're in an app's built-in browser{app}. The key steps often fail here and say you skipped them. Open this page in Chrome and do the steps there.", blocked: "Did the steps normally and still got this? You're probably in an app's built-in browser. Open the key page in Chrome and start again.", open: "Open in Chrome", copy: "Copy link", copied: "Link copied. Paste it in Chrome." },
  es: { title: "Abre esta página en Chrome", body: "Estás en el navegador de una app{app}. Aquí los pasos de la key suelen fallar y dicen que los saltaste. Abre esta página en Chrome y haz los pasos ahí.", blocked: "¿Hiciste los pasos bien y aun así te salió esto? Seguramente estás en el navegador de una app. Abre la página de la key en Chrome y empieza de nuevo.", open: "Abrir en Chrome", copy: "Copiar enlace", copied: "Enlace copiado. Pégalo en Chrome." },
  pt: { title: "Abra esta página no Chrome", body: "Você está no navegador de um app{app}. Aqui os passos da key costumam falhar e dizem que você pulou. Abra esta página no Chrome e faça os passos lá.", blocked: "Fez os passos certinho e mesmo assim apareceu isso? Você provavelmente está no navegador de um app. Abra a página da key no Chrome e comece de novo.", open: "Abrir no Chrome", copy: "Copiar link", copied: "Link copiado. Cole no Chrome." },
  fr: { title: "Ouvre cette page dans Chrome", body: "Tu es dans le navigateur intégré d'une app{app}. Ici les étapes de la clé échouent souvent et disent que tu les as sautées. Ouvre cette page dans Chrome et fais les étapes là-bas.", blocked: "Tu as fait les étapes normalement et tu as quand même ça ? Tu es sûrement dans le navigateur d'une app. Ouvre la page de la clé dans Chrome et recommence.", open: "Ouvrir dans Chrome", copy: "Copier le lien", copied: "Lien copié. Colle-le dans Chrome." },
  de: { title: "Öffne diese Seite in Chrome", body: "Du bist im eingebauten Browser einer App{app}. Hier schlagen die Key-Schritte oft fehl und sagen, du hättest sie übersprungen. Öffne diese Seite in Chrome und mach die Schritte dort.", blocked: "Schritte normal gemacht und trotzdem das hier? Du bist wahrscheinlich im Browser einer App. Öffne die Key-Seite in Chrome und fang neu an.", open: "In Chrome öffnen", copy: "Link kopieren", copied: "Link kopiert. Füge ihn in Chrome ein." },
  ru: { title: "Открой эту страницу в Chrome", body: "Ты во встроенном браузере приложения{app}. Здесь шаги для ключа часто ломаются и пишут, что ты их пропустил. Открой эту страницу в Chrome и пройди шаги там.", blocked: "Проходил шаги честно, но всё равно видишь это? Скорее всего ты во встроенном браузере приложения. Открой страницу ключа в Chrome и начни заново.", open: "Открыть в Chrome", copy: "Копировать ссылку", copied: "Ссылка скопирована. Вставь её в Chrome." },
  id: { title: "Buka halaman ini di Chrome", body: "Kamu sedang di browser bawaan aplikasi{app}. Di sini langkah key sering gagal dan bilang kamu melewatinya. Buka halaman ini di Chrome dan kerjakan langkahnya di sana.", blocked: "Sudah kerjakan langkahnya dengan benar tapi tetap muncul ini? Kamu mungkin di browser bawaan aplikasi. Buka halaman key di Chrome dan mulai lagi.", open: "Buka di Chrome", copy: "Salin link", copied: "Link disalin. Tempel di Chrome." },
  fil: { title: "Buksan ang page na ito sa Chrome", body: "Nasa built-in browser ka ng isang app{app}. Dito madalas pumalya ang key steps at sinasabing nilaktawan mo. Buksan ang page na ito sa Chrome at doon gawin ang steps.", blocked: "Ginawa mo nang tama ang steps pero ito pa rin? Malamang nasa browser ka ng isang app. Buksan ang key page sa Chrome at magsimula ulit.", open: "Buksan sa Chrome", copy: "Kopyahin ang link", copied: "Nakopya ang link. I-paste sa Chrome." },
  vi: { title: "Mở trang này bằng Chrome", body: "Bạn đang ở trình duyệt có sẵn của một ứng dụng{app}. Ở đây các bước lấy key hay bị lỗi và báo bạn đã bỏ qua. Hãy mở trang này bằng Chrome và làm các bước ở đó.", blocked: "Làm các bước bình thường mà vẫn bị báo vậy? Có thể bạn đang ở trình duyệt của một ứng dụng. Mở trang key bằng Chrome và làm lại từ đầu.", open: "Mở bằng Chrome", copy: "Sao chép link", copied: "Đã sao chép link. Dán vào Chrome." },
  th: { title: "เปิดหน้านี้ใน Chrome", body: "คุณอยู่ในเบราว์เซอร์ในแอป{app} ขั้นตอนรับคีย์มักพังที่นี่และบอกว่าคุณข้ามขั้นตอน ให้เปิดหน้านี้ใน Chrome แล้วทำขั้นตอนที่นั่น", blocked: "ทำขั้นตอนปกติแต่ยังเจอแบบนี้? คุณน่าจะอยู่ในเบราว์เซอร์ของแอป ให้เปิดหน้ารับคีย์ใน Chrome แล้วเริ่มใหม่", open: "เปิดใน Chrome", copy: "คัดลอกลิงก์", copied: "คัดลอกลิงก์แล้ว วางใน Chrome ได้เลย" },
  ko: { title: "이 페이지를 Chrome에서 열어 주세요", body: "지금 앱 안의 브라우저에 있어요{app}. 여기서는 키 단계가 자주 실패하고 단계를 건너뛰었다고 나와요. 이 페이지를 Chrome에서 열고 거기서 단계를 진행하세요.", blocked: "단계를 정상적으로 했는데도 이게 떴나요? 앱 안의 브라우저일 가능성이 커요. 키 페이지를 Chrome에서 열고 처음부터 다시 하세요.", open: "Chrome에서 열기", copy: "링크 복사", copied: "링크를 복사했어요. Chrome에 붙여 넣으세요." },
  "zh-CN": { title: "请用 Chrome 打开此页面", body: "你正在使用应用内置浏览器{app}。在这里获取密钥的步骤经常失败，并提示你跳过了步骤。请用 Chrome 打开此页面，在那里完成步骤。", blocked: "正常完成了步骤却还是看到这个？你很可能在应用的内置浏览器里。请用 Chrome 打开密钥页面并重新开始。", open: "用 Chrome 打开", copy: "复制链接", copied: "链接已复制，粘贴到 Chrome 即可。" },
  ar: { title: "افتح هذه الصفحة في Chrome", body: "أنت داخل متصفح مدمج في تطبيق{app}. هنا غالبًا تفشل خطوات المفتاح وتقول إنك تخطيتها. افتح هذه الصفحة في Chrome وأكمل الخطوات هناك.", blocked: "أكملت الخطوات بشكل طبيعي وما زالت هذه الرسالة تظهر؟ غالبًا أنت داخل متصفح تطبيق. افتح صفحة المفتاح في Chrome وابدأ من جديد.", open: "افتح في Chrome", copy: "انسخ الرابط", copied: "تم نسخ الرابط. الصقه في Chrome." },
};

export function InAppBrowserNotice({ always = false, url }: { always?: boolean; url?: string }) {
  const { currentLanguage } = useTranslation();
  const info = useMemo(() => detectInApp(), []);
  const [copied, setCopied] = useState(false);
  if (!info.inApp && !always) return null;
  const tx = TX[currentLanguage as string] || TX.en;
  const target = url || (typeof window !== "undefined" ? window.location.href : "https://keys.combowick.com/verify/provider-select");
  const appName = info.app ? ` (${info.app})` : "";
  const copy = async () => {
    try { await navigator.clipboard.writeText(target); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <div className="m-3 rounded-xl border border-amber-500/60 bg-amber-500/10 p-4 text-sm sm:m-5" dir={currentLanguage === "ar" ? "rtl" : undefined}>
      <div className="mb-1 flex items-center gap-2 font-semibold text-amber-400">
        <Globe className="h-4 w-4 shrink-0" />
        <span>{tx.title}</span>
      </div>
      <p className="mb-3 text-muted-foreground">{info.inApp ? tx.body.replace("{app}", appName) : tx.blocked}</p>
      <div className="flex flex-wrap gap-2">
        {info.os !== "other" && (
          <a href={chromeUrl(target, info.os)}>
            <Button size="sm" className="bg-amber-500 text-black hover:bg-amber-400">
              <Globe className="mr-1 h-4 w-4" /> {tx.open}
            </Button>
          </a>
        )}
        <Button size="sm" variant="outline" onClick={copy}>
          {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />} {copied ? tx.copied : tx.copy}
        </Button>
      </div>
    </div>
  );
}

import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE_URL = "https://combowick.com";

const SUPPORTED_LANGS = ["en", "es", "fr", "de", "pt", "ru", "zh", "ja", "ko", "ar"];

interface SEOHeadProps {
  title: string;
  description: string;
  jsonLd?: Record<string, any> | Record<string, any>[];
  breadcrumbs?: { name: string; url: string }[];
  canonical?: string;
  ogType?: "website" | "article" | "product";
}

export function SEOHead({ title, description, jsonLd, breadcrumbs, canonical, ogType }: SEOHeadProps) {
  const location = useLocation();
  const pageUrl = canonical || `${BASE_URL}${location.pathname}`;

  useEffect(() => {
    document.title = title;

    const upsertMeta = (selector: string, attr: "name" | "property", key: string, value: string) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", value);
    };

    upsertMeta('meta[name="description"]', "name", "description", description);

    // Canonical
    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonicalEl) {
      canonicalEl = document.createElement("link");
      canonicalEl.rel = "canonical";
      document.head.appendChild(canonicalEl);
    }
    canonicalEl.href = pageUrl;

    // OG tags (upsert — index.html no longer ships static og:title/desc/url)
    upsertMeta('meta[property="og:title"]', "property", "og:title", title);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:url"]', "property", "og:url", pageUrl);
    if (ogType) {
      upsertMeta('meta[property="og:type"]', "property", "og:type", ogType);
    }

    // Twitter
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", title);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    // Hreflang tags
    const existingHreflangs = document.querySelectorAll('link[hreflang]');
    existingHreflangs.forEach(el => el.remove());

    SUPPORTED_LANGS.forEach(lang => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = lang;
      link.href = `${pageUrl}${pageUrl.includes("?") ? "&" : "?"}lang=${lang}`;
      document.head.appendChild(link);
    });

    // x-default
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.setAttribute("hreflang", "x-default");
    xDefault.href = pageUrl;
    document.head.appendChild(xDefault);

    // JSON-LD
    const existingPageLd = document.querySelectorAll('script[data-page-ld]');
    existingPageLd.forEach(el => el.remove());

    const schemas: Record<string, any>[] = [];

    // Breadcrumbs
    if (breadcrumbs && breadcrumbs.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: breadcrumbs.map((bc, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: bc.name,
          item: bc.url.startsWith("http") ? bc.url : `${BASE_URL}${bc.url}`,
        })),
      });
    }

    // Custom JSON-LD
    if (jsonLd) {
      if (Array.isArray(jsonLd)) {
        schemas.push(...jsonLd);
      } else {
        schemas.push(jsonLd);
      }
    }

    schemas.forEach(schema => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-page-ld", "true");
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });

    return () => {
      document.querySelectorAll('script[data-page-ld]').forEach(el => el.remove());
      document.querySelectorAll('link[hreflang]').forEach(el => el.remove());
    };
  }, [title, description, pageUrl, jsonLd, breadcrumbs]);

  return null;
}

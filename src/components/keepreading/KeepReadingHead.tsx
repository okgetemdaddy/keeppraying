import { useEffect } from "react";

/**
 * Injects KeepRead.ing SEO meta tags, structured data, and dynamic favicon.
 * Mount once in the KeepReading shell.
 */
export function KeepReadingHead() {
  useEffect(() => {
    const originalTitle = document.title;

    // Title
    document.title = "KeepRead.ing — Keep Reading. Go Deeper. | Free Bible Study";

    // Helper to set/create a meta tag
    const setMeta = (attr: string, key: string, content: string) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
      return el;
    };

    const metas: HTMLMetaElement[] = [];

    // Standard meta
    metas.push(setMeta("name", "description", "KeepRead.ing — a free, beautiful Bible reader with highlights, bookmarks, notes, verse bunches, Apple Pencil handwriting, and cross-translation study tools. Keep Reading. Go Deeper."));
    metas.push(setMeta("name", "keywords", "Bible reader, Bible study, Apple Pencil, highlights, bookmarks, notes, verse bunches, free Bible app, scripture study"));
    metas.push(setMeta("name", "author", "KeepPray.ing"));
    metas.push(setMeta("name", "theme-color", "#1a1a2e"));

    // Open Graph
    metas.push(setMeta("property", "og:title", "KeepRead.ing — Keep Reading. Go Deeper."));
    metas.push(setMeta("property", "og:description", "A free, beautiful Bible reader with highlights, bookmarks, notes, Apple Pencil handwriting, and study tools. No ads, no distractions."));
    metas.push(setMeta("property", "og:url", "https://keepread.ing/"));
    metas.push(setMeta("property", "og:type", "website"));
    metas.push(setMeta("property", "og:site_name", "KeepRead.ing"));
    metas.push(setMeta("property", "og:locale", "en_US"));

    // Twitter
    metas.push(setMeta("name", "twitter:card", "summary_large_image"));
    metas.push(setMeta("name", "twitter:title", "KeepRead.ing — Keep Reading. Go Deeper."));
    metas.push(setMeta("name", "twitter:description", "Free Bible reader with Apple Pencil handwriting, highlights, bookmarks, notes, and study tools."));
    metas.push(setMeta("name", "twitter:site", "@keeppraying"));

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const createdCanonical = !canonical;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://keepread.ing/");

    // Structured data (JSON-LD)
    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "KeepRead.ing",
      url: "https://keepread.ing",
      description: "A free, beautiful Bible reader with Apple Pencil handwriting, highlights, bookmarks, notes, verse bunches, and cross-translation study tools.",
      applicationCategory: "ReligiousApplication",
      operatingSystem: "Web",
      browserRequirements: "Requires a modern browser with JavaScript enabled",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      featureList: [
        "Apple Pencil handwriting on verses",
        "Verse highlights with 6 colors",
        "Bookmarks with color coding",
        "Inline verse notes",
        "Verse bunches for thematic grouping",
        "Cross-translation comparison",
        "Dark mode and OLED mode",
        "Voice annotations",
        "Circle-to-select gesture",
      ],
      author: {
        "@type": "Organization",
        name: "KeepPray.ing",
        url: "https://keeppraying.lovable.app",
      },
    });
    document.head.appendChild(jsonLd);

    // Dynamic favicon — open book SVG
    const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M4 6h8a4 4 0 0 1 4 4v16a3 3 0 0 0-3-3H4z" fill="%23c8a24e" opacity="0.9"/><path d="M28 6h-8a4 4 0 0 0-4 4v16a3 3 0 0 1 3-3h9z" fill="%23d4a843"/></svg>`;
    let favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    const origFaviconHref = favicon?.getAttribute("href") ?? "";
    if (!favicon) {
      favicon = document.createElement("link");
      favicon.setAttribute("rel", "icon");
      document.head.appendChild(favicon);
    }
    favicon.setAttribute("type", "image/svg+xml");
    favicon.setAttribute("href", `data:image/svg+xml,${faviconSvg}`);

    // Cleanup on unmount
    return () => {
      document.title = originalTitle;
      metas.forEach((m) => m.remove());
      if (createdCanonical && canonical) canonical.remove();
      jsonLd.remove();
      if (favicon && origFaviconHref) {
        favicon.setAttribute("href", origFaviconHref);
        favicon.setAttribute("type", "image/x-icon");
      }
    };
  }, []);

  return null;
}

import config from "../config/config.js";
import { normalizeCrawlUrl } from "../utils/urlUtils.js";

export default function ($, baseUrl) {
  const internalLinks = new Map();
  const externalLinks = new Map();
  const base = new URL(baseUrl);

  $("a").each((i, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    const anchorText = $(el).text().replace(/\s+/g, " ").trim();
    const rel = ($(el).attr("rel") || "").toLowerCase();
    const normalizedUrl = normalizeCrawlUrl(href, baseUrl, config.crawl);

    if (normalizedUrl) {
      internalLinks.set(normalizedUrl, {
        url: normalizedUrl,
        anchorText,
        rel
      });
      return;
    }

    try {
      const absoluteUrl = new URL(href, baseUrl);
      if (["http:", "https:"].includes(absoluteUrl.protocol) && absoluteUrl.origin !== base.origin) {
        absoluteUrl.hash = "";
        externalLinks.set(absoluteUrl.href, {
          url: absoluteUrl.href,
          anchorText,
          rel
        });
      }
    } catch {
      // Ignore malformed href values.
    }
  });

  const internalLinkList = [...internalLinks.values()];
  const externalLinkList = [...externalLinks.values()];
  const paginationLinkList = internalLinkList.filter((link) => isPaginationLink(link));

  return {
    crawlLinks: internalLinkList.map((link) => link.url),
    linkData: {
      internalLinkCount: internalLinkList.length,
      externalLinkCount: externalLinkList.length,
      nofollowLinkCount: [...internalLinkList, ...externalLinkList].filter((link) =>
        link.rel.split(/\s+/).includes("nofollow")
      ).length,
      internalLinkSamples: internalLinkList.slice(0, 10),
      externalLinkSamples: externalLinkList.slice(0, 10),
      paginationLinkCount: paginationLinkList.length,
      paginationLinkSamples: paginationLinkList.slice(0, 10)
    }
  };
}

function isPaginationLink(link) {
  const text = (link.anchorText || "").toLowerCase();
  const url = link.url || "";

  return (
    /\b(next|previous|prev)\b/.test(text) ||
    /(?:[?&](?:page|paged|p)=\d+\b|\/page\/\d+\/?$|\/page-\d+\/?$)/i.test(url)
  );
}

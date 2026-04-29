import axios from "axios";
import * as cheerio from "cheerio";
import zlib from "zlib";
import config from "../config/config.js";
import { normalizeCrawlUrl } from "../utils/urlUtils.js";

const SITEMAP_TYPE_PATTERNS = [
  { type: "product", patterns: ["product-sitemap", "/product/", "/shop/"] },
  { type: "course", patterns: ["course-sitemap", "lesson-sitemap", "/courses/", "/course/", "/lessons/", "/lesson/"] },
  { type: "service", patterns: ["service-sitemap", "/services/", "/service/"] },
  { type: "location", patterns: ["location-sitemap", "city-sitemap", "/locations/", "/location/", "/service-area/"] },
  { type: "case-study", patterns: ["case-sitemap", "case-study-sitemap", "portfolio-sitemap", "/case-studies/", "/case-study/", "/portfolio/"] },
  { type: "testimonial", patterns: ["testimony-sitemap", "testimonial-sitemap", "/testimonials/", "/testimonial/"] },
  { type: "team", patterns: ["team-sitemap", "staff-sitemap", "/teams/", "/team/"] },
  { type: "page", patterns: ["page-sitemap"] },
  { type: "post", patterns: ["post-sitemap", "/blog/"] },
  { type: "category", patterns: ["category-sitemap", "_category-sitemap", "/category/"] },
  { type: "tag", patterns: ["tag-sitemap", "_tag-sitemap", "/tag/"] },
  { type: "author", patterns: ["author-sitemap", "/author/"] }
];

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export default async function parseSitemap(sitemapUrl, options = {}) {
  const limit = options.limit ?? config.maxPages;
  const urls = new Set();
  const visitedSitemaps = new Set();

  await expandSitemap(sitemapUrl, {
    limit,
    urls,
    visitedSitemaps
  });

  return {
    urls: [...urls],
    total: urls.size
  };
}

export async function inspectSitemapIndex(sitemapUrl) {
  if (!isValidUrl(sitemapUrl)) {
    return {
      mainSitemap: sitemapUrl,
      type: "unknown",
      sitemapType: classifySitemapByUrlName(sitemapUrl),
      urlCount: 0,
      sampleUrls: [],
      lastmodFirst: "",
      lastmodLast: "",
      childSitemaps: [],
      totalChildSitemaps: 0
    };
  }

  const xml = await fetchSitemapXml(sitemapUrl);
  if (!xml) {
    return {
      mainSitemap: sitemapUrl,
      type: "unknown",
      sitemapType: classifySitemapByUrlName(sitemapUrl),
      urlCount: 0,
      sampleUrls: [],
      lastmodFirst: "",
      lastmodLast: "",
      childSitemaps: [],
      totalChildSitemaps: 0
    };
  }

  const parsed = parseXmlDocument(xml, sitemapUrl);

  if (parsed.type !== "index") {
    return {
      mainSitemap: sitemapUrl,
      type: parsed.type,
      sitemapType: classifySitemapByEvidence(sitemapUrl, parsed.urls),
      urlCount: parsed.urls.length,
      sampleUrls: parsed.urls.slice(0, 5),
      ...getLastmodRange(parsed.entries),
      childSitemaps: [],
      totalChildSitemaps: 0
    };
  }

  const childSitemaps = [];

  for (const childSitemapUrl of parsed.urls) {
    const childDetails = await inspectSingleSitemap(childSitemapUrl);
    childSitemaps.push(childDetails);
  }

  return {
    mainSitemap: sitemapUrl,
    type: "index",
    childSitemaps,
    totalChildSitemaps: childSitemaps.length
  };
}

async function expandSitemap(sitemapUrl, context) {
  if (!isValidUrl(sitemapUrl)) {
    return;
  }

  if (context.urls.size >= context.limit || context.visitedSitemaps.has(sitemapUrl)) {
    return;
  }

  context.visitedSitemaps.add(sitemapUrl);

  const xml = await fetchSitemapXml(sitemapUrl);
  if (!xml) {
    return;
  }

  const parsed = parseXmlDocument(xml, sitemapUrl);
  if (parsed.type === "index") {
    for (const childSitemapUrl of parsed.urls) {
      if (context.urls.size >= context.limit) {
        break;
      }

      await expandSitemap(childSitemapUrl, context);
    }

    return;
  }

  if (parsed.type === "urlset") {
    for (const pageUrl of parsed.urls) {
      if (context.urls.size >= context.limit) {
        break;
      }

      const normalizedPageUrl = normalizePageUrl(pageUrl, sitemapUrl);
      if (normalizedPageUrl) {
        context.urls.add(normalizedPageUrl);
      }
    }
  }
}

async function fetchSitemapXml(sitemapUrl) {
  const xml = await fetchSitemapXmlWithUserAgent(sitemapUrl, config.userAgent);

  if (xml) {
    return xml;
  }

  return fetchSitemapXmlWithUserAgent(sitemapUrl, BROWSER_USER_AGENT);
}

async function fetchSitemapXmlWithUserAgent(sitemapUrl, userAgent) {
  try {
    const response = await axios.get(sitemapUrl, {
      timeout: config.timeout,
      responseType: "arraybuffer",
      maxRedirects: 5,
      headers: {
        "User-Agent": userAgent,
        Accept: "application/xml,text/xml,text/plain,text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9"
      },
      validateStatus: () => true
    });

    if (response.status !== 200) {
      return null;
    }

    return decodeSitemapResponse(response, sitemapUrl);
  } catch {
    return null;
  }
}

function parseXmlDocument(xml, baseUrl) {
  try {
    const $ = cheerio.load(xml, { xmlMode: true });

    if ($("sitemapindex").length > 0) {
      return {
        type: "index",
        urls: collectLocValues($, "sitemap > loc", { normalizePages: false }),
        entries: []
      };
    }

    if ($("urlset").length > 0) {
      const entries = collectUrlEntries($, baseUrl);

      return {
        type: "urlset",
        urls: entries.map((entry) => entry.loc),
        entries
      };
    }
  } catch {
    return {
      type: "unknown",
      urls: [],
      entries: []
    };
  }

  return {
    type: "unknown",
    urls: [],
    entries: []
  };
}

function decodeSitemapResponse(response, sitemapUrl) {
  const buffer = Buffer.from(response.data);
  const contentEncoding = response.headers["content-encoding"] || "";
  const contentType = response.headers["content-type"] || "";
  const isGzip =
    sitemapUrl.toLowerCase().endsWith(".gz") ||
    contentEncoding.includes("gzip") ||
    contentType.includes("gzip");

  if (isGzip) {
    return zlib.gunzipSync(buffer).toString("utf8");
  }

  return buffer.toString("utf8");
}

export function classifySitemapByUrlName(sitemapUrl) {
  const normalizedUrl = getNormalizedSitemapName(sitemapUrl);

  if (normalizedUrl.includes("category-sitemap") || normalizedUrl.includes("_category-sitemap")) {
    return "category";
  }

  if (normalizedUrl.includes("tag-sitemap") || normalizedUrl.includes("_tag-sitemap")) {
    return "tag";
  }

  if (normalizedUrl.includes("author-sitemap")) {
    return "author";
  }

  const matchedType = SITEMAP_TYPE_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => normalizedUrl.includes(pattern))
  );

  return matchedType?.type || "other";
}

export function classifySitemapByEvidence(sitemapUrl, sampleUrls = []) {
  const nameClassification = classifySitemapByUrlName(sitemapUrl);
  if (nameClassification !== "other") {
    return nameClassification;
  }

  const sampleText = sampleUrls.map((value) => value.toLowerCase()).join(" ");
  const matchedType = SITEMAP_TYPE_PATTERNS.find(({ patterns }) =>
    patterns.some((pattern) => sampleText.includes(pattern))
  );

  return matchedType?.type || "other";
}

async function inspectSingleSitemap(sitemapUrl) {
  if (!isValidUrl(sitemapUrl)) {
    return {
      sitemapUrl,
      type: "unknown",
      sitemapType: classifySitemapByUrlName(sitemapUrl),
      urlCount: 0,
      sampleUrls: [],
      lastmodFirst: "",
      lastmodLast: ""
    };
  }

  const xml = await fetchSitemapXml(sitemapUrl);
  if (!xml) {
    return {
      sitemapUrl,
      type: "unknown",
      sitemapType: classifySitemapByUrlName(sitemapUrl),
      urlCount: 0,
      sampleUrls: [],
      lastmodFirst: "",
      lastmodLast: ""
    };
  }

  const parsed = parseXmlDocument(xml, sitemapUrl);

  return {
    sitemapUrl,
    type: parsed.type,
    sitemapType: classifySitemapByEvidence(sitemapUrl, parsed.urls),
    urlCount: parsed.urls.length,
    sampleUrls: parsed.urls.slice(0, 5),
    ...getLastmodRange(parsed.entries)
  };
}

function collectLocValues($, selector, options = {}) {
  const normalizePages = options.normalizePages ?? false;
  const baseUrl = options.baseUrl ?? config.startUrl;

  return [...new Set(
    $(selector)
      .map((_, element) => {
        const value = $(element).text().trim();
        return normalizePages ? normalizePageUrl(value, baseUrl) : value;
      })
      .get()
      .filter(Boolean)
  )];
}

function collectUrlEntries($, baseUrl) {
  return $("url")
    .map((_, element) => {
      const loc = normalizePageUrl($(element).find("loc").first().text().trim(), baseUrl);

      if (!loc) {
        return null;
      }

      return {
        loc,
        lastmod: $(element).find("lastmod").first().text().trim(),
        changefreq: $(element).find("changefreq").first().text().trim(),
        priority: $(element).find("priority").first().text().trim()
      };
    })
    .get()
    .filter(Boolean);
}

function getLastmodRange(entries = []) {
  const lastmods = entries
    .map((entry) => entry.lastmod)
    .filter(Boolean)
    .sort();

  return {
    lastmodFirst: lastmods[0] || "",
    lastmodLast: lastmods[lastmods.length - 1] || ""
  };
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizePageUrl(value, baseUrl) {
  return normalizeCrawlUrl(value, baseUrl, config.crawl);
}

function getNormalizedSitemapName(sitemapUrl) {
  try {
    return new URL(sitemapUrl).pathname.toLowerCase().split("/").pop() || sitemapUrl.toLowerCase();
  } catch {
    return sitemapUrl.toLowerCase();
  }
}

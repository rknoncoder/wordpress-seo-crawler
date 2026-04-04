import axios from "axios";
import * as cheerio from "cheerio";
import config from "../config/config.js";

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
      urlCount: 0,
      childSitemaps: [],
      totalChildSitemaps: 0
    };
  }

  const xml = await fetchSitemapXml(sitemapUrl);
  if (!xml) {
    return {
      mainSitemap: sitemapUrl,
      type: "unknown",
      urlCount: 0,
      childSitemaps: [],
      totalChildSitemaps: 0
    };
  }

  const parsed = parseXmlDocument(xml);

  if (parsed.type !== "index") {
    return {
      mainSitemap: sitemapUrl,
      type: parsed.type,
      urlCount: parsed.urls.length,
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

  const parsed = parseXmlDocument(xml);
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

      const normalizedPageUrl = normalizePageUrl(pageUrl);
      if (normalizedPageUrl) {
        context.urls.add(normalizedPageUrl);
      }
    }
  }
}

async function fetchSitemapXml(sitemapUrl) {
  try {
    const response = await axios.get(sitemapUrl, {
      timeout: config.timeout,
      responseType: "text",
      maxRedirects: 5,
      validateStatus: () => true
    });

    if (response.status !== 200 || typeof response.data !== "string") {
      return null;
    }

    return response.data;
  } catch {
    return null;
  }
}

function parseXmlDocument(xml) {
  try {
    const $ = cheerio.load(xml, { xmlMode: true });

    if ($("sitemapindex").length > 0) {
      return {
        type: "index",
        urls: collectLocValues($, "sitemap > loc", { normalizePages: false })
      };
    }

    if ($("urlset").length > 0) {
      return {
        type: "urlset",
        urls: collectLocValues($, "url > loc", { normalizePages: true })
      };
    }
  } catch {
    return {
      type: "unknown",
      urls: []
    };
  }

  return {
    type: "unknown",
    urls: []
  };
}

export function classifySitemapByUrlName(sitemapUrl) {
  const normalizedUrl = sitemapUrl.toLowerCase();

  if (normalizedUrl.includes("page")) return "page";
  if (normalizedUrl.includes("post")) return "post";
  return "other";
}

async function inspectSingleSitemap(sitemapUrl) {
  if (!isValidUrl(sitemapUrl)) {
    return {
      sitemapUrl,
      type: "unknown",
      urlCount: 0
    };
  }

  const xml = await fetchSitemapXml(sitemapUrl);
  if (!xml) {
    return {
      sitemapUrl,
      type: "unknown",
      urlCount: 0
    };
  }

  const parsed = parseXmlDocument(xml);

  return {
    sitemapUrl,
    type: parsed.type,
    urlCount: parsed.urls.length
  };
}

function collectLocValues($, selector, options = {}) {
  const normalizePages = options.normalizePages ?? false;

  return [...new Set(
    $(selector)
      .map((_, element) => {
        const value = $(element).text().trim();
        return normalizePages ? normalizePageUrl(value) : value;
      })
      .get()
      .filter(Boolean)
  )];
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizePageUrl(value) {
  if (!isValidUrl(value)) {
    return null;
  }

  const parsedUrl = new URL(value);

  if (parsedUrl.search) {
    return null;
  }

  parsedUrl.hash = "";
  return parsedUrl.href;
}

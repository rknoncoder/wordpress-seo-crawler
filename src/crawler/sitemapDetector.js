import { buildAbsoluteUrl, normalizeBaseUrl } from "../utils/urlUtils.js";
import axios from "axios";
import config from "../config/config.js";

const FALLBACK_SITEMAP_PATHS = [
  "/sitemap_index.xml",
  "/wp-sitemap.xml",
  "/sitemap.xml",
  "/sitemaps.xml"
];

export default async function detectSitemapUrls(inputUrl) {
  const baseUrl = normalizeBaseUrl(inputUrl);
  const sitemapUrlsFromRobots = await extractSitemapsFromRobots(baseUrl);

  if (sitemapUrlsFromRobots.length > 0) {
    return {
      sitemapUrls: sitemapUrlsFromRobots,
      source: "robots"
    };
  }

  const fallbackSitemapUrl = await findFallbackSitemap(baseUrl);

  if (fallbackSitemapUrl) {
    return {
      sitemapUrls: [fallbackSitemapUrl],
      source: "fallback"
    };
  }

  return {
    sitemapUrls: [],
    source: "not_found"
  };
}

async function extractSitemapsFromRobots(baseUrl) {
  const robotsUrl = buildAbsoluteUrl(baseUrl, "/robots.txt");
  const response = await fetchText(robotsUrl);

  if (!response || response.status !== 200 || typeof response.data !== "string") {
    return [];
  }

  const sitemapUrls = response.data
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line))
    .map((line) => line.replace(/^sitemap:\s*/i, "").trim())
    .filter(Boolean)
    .filter(isValidUrl);

  return [...new Set(sitemapUrls)];
}

async function findFallbackSitemap(baseUrl) {
  for (const path of FALLBACK_SITEMAP_PATHS) {
    const sitemapUrl = buildAbsoluteUrl(baseUrl, path);
    const response = await fetchText(sitemapUrl);

    if (response && response.status === 200) {
      return sitemapUrl;
    }
  }

  return null;
}

async function fetchText(url) {
  try {
    return await axios.get(url, {
      timeout: config.timeout,
      responseType: "text",
      maxRedirects: 5,
      validateStatus: () => true
    });
  } catch {
    return null;
  }
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

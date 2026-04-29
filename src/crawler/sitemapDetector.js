import axios from "axios";
import config from "../config/config.js";
import { buildAbsoluteUrl, normalizeBaseUrl } from "../utils/urlUtils.js";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

const COMMON_SITEMAP_PATHS = [
  "/sitemap_index.xml",
  "/sitemap.xml",
  "/wp-sitemap.xml",
  "/sitemap-index.xml",
  "/sitemaps.xml",
  "/sitemap.xml.gz",
  "/sitemap.php"
];

const SEO_PLUGIN_DEFINITIONS = [
  {
    name: "Yoast SEO",
    patterns: ["yoast seo", "yoast-schema-graph", "wordpress-seo", "wpseo"],
    sitemapPaths: ["/sitemap_index.xml", "/post-sitemap.xml", "/page-sitemap.xml"]
  },
  {
    name: "Rank Math",
    patterns: ["rank-math", "rank math", "seo-by-rank-math", "rankmath"],
    sitemapPaths: ["/sitemap_index.xml", "/post-sitemap.xml", "/page-sitemap.xml"]
  },
  {
    name: "All in One SEO",
    patterns: ["aioseo", "all in one seo", "all-in-one-seo-pack"],
    sitemapPaths: ["/sitemap.xml", "/sitemap_index.xml"]
  },
  {
    name: "SEOPress",
    patterns: ["seopress", "wp-seopress"],
    sitemapPaths: ["/sitemaps.xml", "/sitemap_index.xml"]
  },
  {
    name: "The SEO Framework",
    patterns: ["the-seo-framework", "autodescription"],
    sitemapPaths: ["/sitemap.xml", "/sitemap_index.xml"]
  }
];

export default async function detectSitemapUrls(inputUrl) {
  const baseUrl = normalizeBaseUrl(inputUrl);
  const attempts = [];
  const detectedSeoPlugins = [];

  const robotsResult = await extractSitemapsFromRobots(baseUrl, config.userAgent, attempts);
  if (robotsResult.sitemapUrls.length > 0) {
    return buildResult(robotsResult.sitemapUrls, "robots", "found", attempts, detectedSeoPlugins);
  }

  const commonSitemaps = await findSitemapsByPaths(baseUrl, COMMON_SITEMAP_PATHS, config.userAgent, "common_path", attempts);
  if (commonSitemaps.length > 0) {
    return buildResult(commonSitemaps, "common_path", "found", attempts, detectedSeoPlugins);
  }

  detectedSeoPlugins.push(...await detectSeoPlugins(baseUrl, config.userAgent, attempts));

  const pluginPaths = getSeoPluginSitemapPaths(detectedSeoPlugins);
  const pluginSitemaps = await findSitemapsByPaths(baseUrl, pluginPaths, config.userAgent, "seo_plugin_path", attempts);
  if (pluginSitemaps.length > 0) {
    return buildResult(pluginSitemaps, "seo_plugin_path", "found", attempts, detectedSeoPlugins);
  }

  const browserRobotsResult = await extractSitemapsFromRobots(baseUrl, BROWSER_USER_AGENT, attempts, "robots_browser_retry");
  if (browserRobotsResult.sitemapUrls.length > 0) {
    return buildResult(browserRobotsResult.sitemapUrls, "robots_browser_retry", "found", attempts, detectedSeoPlugins);
  }

  const browserPathSitemaps = await findSitemapsByPaths(
    baseUrl,
    [...new Set([...COMMON_SITEMAP_PATHS, ...pluginPaths])],
    BROWSER_USER_AGENT,
    "browser_retry",
    attempts
  );

  if (browserPathSitemaps.length > 0) {
    return buildResult(browserPathSitemaps, "browser_retry", "found", attempts, detectedSeoPlugins);
  }

  const status = hasBlockedAttempt(attempts) ? "blocked" : "unavailable";

  return buildResult([], status, status, attempts, detectedSeoPlugins);
}

async function extractSitemapsFromRobots(baseUrl, userAgent, attempts, step = "robots") {
  const robotsUrl = buildAbsoluteUrl(baseUrl, "/robots.txt");
  const response = await fetchText(robotsUrl, userAgent);

  attempts.push(buildAttempt(step, robotsUrl, response));

  if (!response || response.status !== 200 || typeof response.data !== "string") {
    return { sitemapUrls: [] };
  }

  const sitemapUrls = response.data
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^sitemap:/i.test(line))
    .map((line) => line.replace(/^sitemap:\s*/i, "").trim())
    .filter(Boolean)
    .map((value) => normalizeRobotsSitemapUrl(value, baseUrl))
    .filter(Boolean);

  return {
    sitemapUrls: [...new Set(sitemapUrls)]
  };
}

async function findSitemapsByPaths(baseUrl, paths, userAgent, step, attempts) {
  const sitemapUrls = [];

  for (const sitemapPath of paths) {
    const sitemapUrl = buildAbsoluteUrl(baseUrl, sitemapPath);
    const response = await fetchText(sitemapUrl, userAgent);

    attempts.push(buildAttempt(step, sitemapUrl, response));

    if (isValidSitemapResponse(response)) {
      sitemapUrls.push(sitemapUrl);
    }
  }

  return [...new Set(sitemapUrls)];
}

async function detectSeoPlugins(baseUrl, userAgent, attempts) {
  const response = await fetchText(baseUrl, userAgent);
  attempts.push(buildAttempt("seo_plugin_detection", baseUrl, response));

  if (!response || response.status !== 200 || typeof response.data !== "string") {
    return [];
  }

  const html = response.data.toLowerCase();

  return SEO_PLUGIN_DEFINITIONS
    .filter((definition) => definition.patterns.some((pattern) => html.includes(pattern)))
    .map((definition) => definition.name);
}

function getSeoPluginSitemapPaths(pluginNames) {
  return [
    ...new Set(
      SEO_PLUGIN_DEFINITIONS
        .filter((definition) => pluginNames.includes(definition.name))
        .flatMap((definition) => definition.sitemapPaths)
    )
  ];
}

async function fetchText(url, userAgent) {
  try {
    return await axios.get(url, {
      timeout: config.timeout,
      responseType: "text",
      maxRedirects: 5,
      headers: {
        "User-Agent": userAgent,
        Accept: "text/plain,application/xml,text/xml,text/html,*/*",
        "Accept-Language": "en-US,en;q=0.9"
      },
      validateStatus: () => true
    });
  } catch (error) {
    return {
      status: 0,
      data: "",
      error: error.code || error.message
    };
  }
}

function isValidSitemapResponse(response) {
  if (!response || response.status !== 200 || typeof response.data !== "string") {
    return false;
  }

  const body = response.data.slice(0, 5000).toLowerCase();
  return body.includes("<urlset") || body.includes("<sitemapindex") || body.includes("<loc>");
}

function buildAttempt(step, url, response) {
  return {
    step,
    url,
    status: response?.status ?? 0,
    blocked: isBlockedStatus(response?.status),
    error: response?.error || ""
  };
}

function buildResult(sitemapUrls, source, status, attempts, detectedSeoPlugins) {
  return {
    sitemapUrls,
    source,
    status,
    detectedSeoPlugins: [...new Set(detectedSeoPlugins)],
    attempts,
    unavailableReason: sitemapUrls.length > 0 ? "" : getUnavailableReason(status, attempts)
  };
}

function getUnavailableReason(status, attempts) {
  if (status === "blocked") {
    const blockedAttempt = attempts.find((attempt) => attempt.blocked);
    return `Sitemap discovery appears blocked at ${blockedAttempt?.url || "one or more endpoints"}.`;
  }

  return "No sitemap was found in robots.txt, common sitemap paths, SEO plugin paths, or browser user-agent retry.";
}

function hasBlockedAttempt(attempts) {
  return attempts.some((attempt) => attempt.blocked);
}

function isBlockedStatus(status) {
  return [401, 403, 429].includes(status);
}

function isValidUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function normalizeRobotsSitemapUrl(value, baseUrl) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return "";
  }
}

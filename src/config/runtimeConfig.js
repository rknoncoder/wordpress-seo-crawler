import fs from "fs";
import path from "path";

const URL_FLAGS = new Set(["--url", "-u", "--site", "--start-url"]);
const SITEMAP_FLAGS = new Set(["--sitemap", "--sitemap-url"]);
const MODE_FLAGS = new Set(["--mode", "--crawl-mode"]);

export function getTargetUrl(defaultUrl) {
  return getTargetUrlConfig(defaultUrl).targetUrl;
}

export function getTargetUrlConfig(defaultUrl) {
  loadDotEnv();

  const cliUrl = getCliUrl(getRuntimeArgs());
  const envUrl = process.env.START_URL || process.env.WEBSITE_URL || process.env.SITE_URL;
  const targetUrl = cliUrl || envUrl || defaultUrl;

  return {
    targetUrl: normalizeUrl(targetUrl),
    source: cliUrl || envUrl ? "direct_url" : "sitemap"
  };
}

export function getSitemapUrls() {
  loadDotEnv();

  const cliSitemaps = getCliValues(getRuntimeArgs(), SITEMAP_FLAGS, "--sitemap=");
  const envSitemaps = splitList(process.env.SITEMAP_URLS || process.env.SITEMAP_URL || "");

  return [...new Set([...cliSitemaps, ...envSitemaps].map(normalizeUrl))];
}

export function getCrawlMode(defaultMode = "seo") {
  loadDotEnv();

  const cliMode = getCliMode(getRuntimeArgs());
  const envMode = process.env.CRAWL_MODE || "";

  return normalizeMode(cliMode || envMode || defaultMode);
}

function getCliUrl(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (URL_FLAGS.has(arg)) {
      return args[index + 1] || "";
    }

    if (SITEMAP_FLAGS.has(arg)) {
      index += 1;
      continue;
    }

    if (MODE_FLAGS.has(arg)) {
      index += 1;
      continue;
    }

    if (arg.startsWith("--url=")) {
      return arg.slice("--url=".length);
    }

    if (arg.startsWith("--sitemap=")) {
      continue;
    }

    if (arg.startsWith("--mode=") || arg.startsWith("--crawl-mode=")) {
      continue;
    }

    if (!arg.startsWith("-")) {
      return arg;
    }
  }

  return "";
}

function getCliMode(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (MODE_FLAGS.has(arg)) {
      return args[index + 1] || "";
    }

    if (arg.startsWith("--mode=")) {
      return arg.slice("--mode=".length);
    }

    if (arg.startsWith("--crawl-mode=")) {
      return arg.slice("--crawl-mode=".length);
    }
  }

  return "";
}

function getCliValues(args, flags, equalsPrefix) {
  const values = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (flags.has(arg) && args[index + 1]) {
      values.push(args[index + 1]);
      index += 1;
      continue;
    }

    if (arg.startsWith(equalsPrefix)) {
      values.push(arg.slice(equalsPrefix.length));
    }
  }

  return values.flatMap(splitList).filter(Boolean);
}

function splitList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getRuntimeArgs() {
  return process.argv
    .slice(1)
    .filter((arg) => !/\.(cjs|js|mjs)$/i.test(arg));
}

function loadDotEnv() {
  const envPath = path.resolve(".env");

  if (!fs.existsSync(envPath)) {
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith("#")) {
      return;
    }

    const separatorIndex = trimmedLine.indexOf("=");
    if (separatorIndex === -1) {
      return;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

function normalizeUrl(value) {
  const rawUrl = String(value || "").trim();

  if (!rawUrl) {
    throw new Error("Missing website URL. Set startUrl in config.js or pass --url https://example.com/");
  }

  const urlWithProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

  try {
    const parsedUrl = new URL(urlWithProtocol);
    parsedUrl.hash = "";
    return parsedUrl.toString();
  } catch {
    throw new Error(`Invalid website URL: ${rawUrl}`);
  }
}

function normalizeMode(value) {
  const mode = String(value || "").trim().toLowerCase();

  if (["single", "seo", "full"].includes(mode)) {
    return mode;
  }

  throw new Error(`Invalid crawl mode: ${value}. Use single, seo, or full.`);
}

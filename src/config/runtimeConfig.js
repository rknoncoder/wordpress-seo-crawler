import fs from "fs";
import path from "path";

const URL_FLAGS = new Set(["--url", "-u", "--site", "--start-url"]);

export function getTargetUrl(defaultUrl) {
  loadDotEnv();

  const cliUrl = getCliUrl(process.argv.slice(2));
  const envUrl = process.env.START_URL || process.env.WEBSITE_URL || process.env.SITE_URL;
  const targetUrl = cliUrl || envUrl || defaultUrl;

  return normalizeUrl(targetUrl);
}

function getCliUrl(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (URL_FLAGS.has(arg)) {
      return args[index + 1] || "";
    }

    if (arg.startsWith("--url=")) {
      return arg.slice("--url=".length);
    }

    if (!arg.startsWith("-")) {
      return arg;
    }
  }

  return "";
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

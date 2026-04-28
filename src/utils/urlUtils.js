export function normalizeBaseUrl(inputUrl) {
  const parsedUrl = new URL(inputUrl);
  return parsedUrl.origin.replace(/\/$/, "");
}

export function buildAbsoluteUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).href;
}

export function normalizeCrawlUrl(inputUrl, baseUrl, options = {}) {
  const sameOriginOnly = options.sameOriginOnly ?? true;
  const keepQueryStrings = options.keepQueryStrings ?? false;
  const excludedPathPatterns = options.excludedPathPatterns ?? [];
  const excludedExtensions = options.excludedExtensions ?? [];

  let parsedUrl;
  let base;

  try {
    parsedUrl = new URL(inputUrl, baseUrl);
    base = new URL(baseUrl);
  } catch {
    return null;
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return null;
  }

  if (sameOriginOnly && parsedUrl.origin !== base.origin) {
    return null;
  }

  parsedUrl.hash = "";

  if (!keepQueryStrings) {
    parsedUrl.search = "";
  }

  if (isExcludedPath(parsedUrl, excludedPathPatterns)) {
    return null;
  }

  if (hasExcludedExtension(parsedUrl.pathname, excludedExtensions)) {
    return null;
  }

  parsedUrl.pathname = normalizePathname(parsedUrl.pathname);

  return parsedUrl.href;
}

function normalizePathname(pathname) {
  if (!pathname || pathname === "/") {
    return "/";
  }

  const normalizedPathname = pathname.replace(/\/{2,}/g, "/");
  return normalizedPathname.endsWith("/") ? normalizedPathname : `${normalizedPathname}/`;
}

function isExcludedPath(parsedUrl, patterns) {
  const pathWithSearch = `${parsedUrl.pathname}${parsedUrl.search}`.toLowerCase();

  return patterns.some((pattern) => {
    const normalizedPattern = pattern.toLowerCase();
    return pathWithSearch.includes(normalizedPattern);
  });
}

function hasExcludedExtension(pathname, extensions) {
  const normalizedPathname = pathname.toLowerCase();
  return extensions.some((extension) => normalizedPathname.endsWith(extension.toLowerCase()));
}

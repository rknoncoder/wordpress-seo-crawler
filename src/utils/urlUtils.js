export function normalizeBaseUrl(inputUrl) {
  const parsedUrl = new URL(inputUrl);
  return parsedUrl.origin.replace(/\/$/, "");
}

export function buildAbsoluteUrl(baseUrl, path) {
  return new URL(path, `${baseUrl}/`).href;
}

export default {
  startUrl: "https://www.togrowmarketing.com/",
  maxPages: 5000,
  maxDepth: 10,
  timeout: 10000,
  concurrency: 1,
  crawlDelayMs: 250,
  userAgent: "WordPress SEO Crawler/1.0 (+https://example.com/bot)",
  retries: 2,
  retryDelayMs: 750,
  crawl: {
    sameOriginOnly: true,
    keepQueryStrings: false,
    excludedPathPatterns: [
      "/wp-admin",
      "/wp-login.php",
      "/xmlrpc.php",
      "/feed",
      "/comments/feed",
      "/search",
      "/?s=",
      "whatsapp",
      "wa.me",
      "api.whatsapp.com",
      "share=whatsapp",
      "/login",
      "/register",
      "/cart",
      "/checkout",
      "/my-account",
      "/account"
    ],
    excludedExtensions: [
      ".pdf",
      ".jpg",
      ".jpeg",
      ".png",
      ".gif",
      ".webp",
      ".svg",
      ".css",
      ".js",
      ".zip",
      ".xml"
    ]
  },
  sitemapSelection: {
    crawlAll: true,
    includePatterns: [],
    excludePatterns: []
  }
};

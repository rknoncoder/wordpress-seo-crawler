export default {
  startUrl: "https://www.togrowmarketing.com/",
  maxPages: 200,
  maxDepth: 3,
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
      "/cart",
      "/checkout",
      "/my-account",
      "/account",
      "/login",
      "/register",
      "/author/",
      "/category/",
      "/tag/",
      "/page/",
      "/privacy-policy",
      "/terms"
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
    includePatterns: [
      "page-sitemap",
      "post-sitemap",
      "service",
      "product",
      "course",
      "lesson",
      "location",
      "case",
      "portfolio"
    ],
    excludePatterns: [
      "category",
      "tag",
      "author"
    ]
  }
};

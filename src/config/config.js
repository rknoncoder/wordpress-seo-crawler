export default {
  startUrl: "https://www.togrowmarketing.com/",
  crawlMode: "seo",
  maxPages: 700,
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
      "whatsapp",
      "wa.me",
      "api.whatsapp.com",
      "share=whatsapp",
      "/author/",
      "/page/",
      "/tag/",
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
    crawlAll: false,
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
      "tag",
      "author"
    ]
  },
  crawlModes: {
    single: {
      maxPages: 1,
      maxDepth: 0,
      sitemapSelection: {
        crawlAll: false,
        includePatterns: [],
        excludePatterns: []
      }
    },
    seo: {
      maxPages: 700,
      maxDepth: 3,
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
        "/author/",
        "/page/",
        "/tag/",
        "/login",
        "/register",
        "/cart",
        "/checkout",
        "/my-account",
        "/account"
      ],
      sitemapSelection: {
        crawlAll: false,
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
          "tag",
          "author"
        ]
      }
    },
    full: {
      maxPages: 5000,
      maxDepth: 10,
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
      sitemapSelection: {
        crawlAll: true,
        includePatterns: [],
        excludePatterns: []
      }
    }
  }
};

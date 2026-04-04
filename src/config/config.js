export default {
  startUrl: "https://togrowmarketing.com",
  maxPages: 200,
  timeout: 10000,
  sitemapSelection: {
    includePatterns: [
      "page-sitemap",
      "post-sitemap",
      "service",
      "product",
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

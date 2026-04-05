export default {
  startUrl: "https://www.nytco.com/",
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

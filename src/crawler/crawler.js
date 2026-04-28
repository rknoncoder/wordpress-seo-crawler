import fetchPage from "./fetcher.js";
import extractData from "../parser/htmlParser.js";
import saveJson from "../storage/saveJson.js";
import saveCsv from "../storage/saveCsv.js";
import classifySite from "../classifier/siteClassifier.js";
import runAudits from "../audits/runAudits.js";
import saveIssuesCsv from "../storage/saveIssuesCsv.js";
import saveIssuesJson from "../storage/saveIssuesJson.js";
import saveSiteProfileCsv from "../storage/saveSiteProfileCsv.js";
import saveSiteProfileJson from "../storage/saveSiteProfileJson.js";
import config from "../config/config.js";

export default async function startCrawler(initialUrls = [config.startUrl]) {
  const visited = new Set();
  const queue = [...new Set(initialUrls)].map((url) => ({ url, depth: 0 }));
  const queued = new Set(queue.map((item) => item.url));
  const results = [];

  while (queue.length && visited.size < config.maxPages) {
    const { url, depth } = queue.shift();
    queued.delete(url);

    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`Crawling: ${url}`);

    const page = await fetchPage(url);

    if (!page.html) {
      results.push(buildFailedPageResult(page, depth));
      console.log(`Skipped: ${url} (${page.error || page.status})`);
      await waitForCrawlDelay();
      continue;
    }

    const { data, links } = await extractData(page.finalUrl, page.html);
    results.push({
      requestedUrl: page.requestedUrl,
      finalUrl: page.finalUrl,
      status: page.status,
      contentType: page.contentType,
      redirected: page.redirected,
      depth,
      fetchError: "",
      ...data
    });

    if (depth < config.maxDepth) {
      links.forEach((link) => {
        if (
          !visited.has(link) &&
          !queued.has(link) &&
          visited.size + queue.length < config.maxPages
        ) {
          queue.push({ url: link, depth: depth + 1 });
          queued.add(link);
        }
      });
    }

    await waitForCrawlDelay();
  }

  const siteProfile = classifySite(results);
  const issues = runAudits(results, siteProfile);
  saveJson(results);
  saveCsv(results);
  saveSiteProfileJson(siteProfile);
  saveSiteProfileCsv(siteProfile);
  saveIssuesJson(issues);
  saveIssuesCsv(issues);
  console.log("Crawl completed");

  return {
    pages: results,
    siteProfile,
    issues
  };
}

function buildFailedPageResult(page, depth) {
  return {
    requestedUrl: page.requestedUrl,
    finalUrl: page.finalUrl,
    url: page.finalUrl,
    status: page.status,
    contentType: page.contentType,
    redirected: page.redirected,
    depth,
    fetchError: page.error,
    title: "",
    metaDescription: "",
    metaDescriptionLength: 0,
    canonical: "",
    robots: "",
    isNoindex: false,
    titleLength: 0,
    h1Count: 0,
    h1Text: "",
    h2Count: 0,
    h3Count: 0,
    wordCount: 0,
    textLength: 0,
    htmlLength: 0,
    textToHtmlRatio: 0,
    totalImages: 0,
    imagesWithoutAlt: 0,
    imagesWithEmptyAlt: 0,
    lazyImages: 0,
    imagesWithoutDimensions: 0,
    internalLinkCount: 0,
    externalLinkCount: 0,
    nofollowLinkCount: 0,
    schema: {
      types: [],
      jsonLdCount: 0,
      jsonLdParseErrors: 0,
      microdataTypes: [],
      hasArticleSchema: false,
      hasProductSchema: false,
      hasLocalBusinessSchema: false,
      hasOrganizationSchema: false,
      hasCourseSchema: false,
      hasBreadcrumbSchema: false,
      hasFaqSchema: false
    },
    classification: {
      pageType: "fetch_error",
      modules: ["basicSeo"],
      evidence: []
    },
    wordpress: {
      isWordPress: false,
      signals: [],
      generator: "",
      plugins: [],
      themes: [],
      seoPlugins: [],
      ecommercePlugins: [],
      lmsPlugins: [],
      builders: [],
      routeSignals: [],
      localSignals: [],
      hasWooCommerce: false,
      hasLms: false,
      hasLocalSignals: false
    }
  };
}

function waitForCrawlDelay() {
  return new Promise((resolve) => {
    setTimeout(resolve, config.crawlDelayMs);
  });
}

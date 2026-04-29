import config from "./config/config.js";
import { getSitemapUrls, getTargetUrl } from "./config/runtimeConfig.js";
import detectDuplicates from "./analyzer/duplicateDetector.js";
import generateSummary from "./analyzer/summary.js";
import startCrawler from "./crawler/crawler.js";
import detectSitemapUrls from "./crawler/sitemapDetector.js";
import exportExcel from "./storage/exportExcel.js";
import saveSitemapCsv from "./storage/saveSitemapCsv.js";
import saveSitemapJson from "./storage/saveSitemapJson.js";
import parseSitemap, {
  classifySitemapByUrlName,
  inspectSitemapIndex
} from "./parser/sitemapParser.js";

async function main() {
  const targetUrl = getTargetUrl(config.startUrl);
  const manualSitemapUrls = getSitemapUrls();

  console.log(`Target website: ${targetUrl}`);

  const detectionResult = manualSitemapUrls.length > 0
    ? {
        sitemapUrls: manualSitemapUrls,
        source: "manual",
        status: "found",
        detectedSeoPlugins: [],
        attempts: [],
        unavailableReason: ""
      }
    : await detectSitemapUrls(targetUrl);

  if (detectionResult.sitemapUrls.length === 0) {
    console.log(`No sitemap found (${detectionResult.status}). ${detectionResult.unavailableReason}`);
    console.log("Falling back to start URL crawling.");
    const sitemapInventory = buildSitemapInventory([], [], detectionResult);
    saveSitemapJson(sitemapInventory);
    saveSitemapCsv(sitemapInventory.sitemaps);
    await runCrawlAndExport([targetUrl]);
    return;
  }

  const discoveredSitemaps = [];

  console.log("\nDetected sitemaps:\n");

  for (const sitemapUrl of detectionResult.sitemapUrls) {
    const inventory = await inspectSitemapIndex(sitemapUrl);

    if (inventory.type === "index") {
      printChildSitemaps(inventory.childSitemaps);
      appendUniqueSitemaps(discoveredSitemaps, inventory.childSitemaps);
      continue;
    }

    console.log(`[1] ${sitemapUrl} | type=${inventory.type} | urls=${inventory.urlCount}`);
    appendUniqueSitemaps(discoveredSitemaps, [
      {
        sitemapUrl,
        type: inventory.type,
        urlCount: inventory.urlCount
      }
    ]);
  }

  const totalSitemapsFound = discoveredSitemaps.length;
  const totalUrlsFound = discoveredSitemaps.reduce((sum, sitemap) => sum + sitemap.urlCount, 0);
  const sitemapsForCrawl = selectSitemapsForCrawl(discoveredSitemaps, totalUrlsFound);
  const sitemapInventory = buildSitemapInventory(discoveredSitemaps, sitemapsForCrawl, detectionResult);
  saveSitemapJson(sitemapInventory);
  saveSitemapCsv(sitemapInventory.sitemaps);

  const finalCrawlUrls = await extractUrlsForCrawl(sitemapsForCrawl);

  console.log("");
  console.log(`Total sitemaps found: ${totalSitemapsFound}`);
  console.log(`Total URLs found: ${totalUrlsFound}`);

  if (totalUrlsFound <= 500) {
    console.log("Applying smart filter: using all extracted sitemap URLs");
  } else {
    console.log("Applying smart filter: only post + page sitemaps");
  }

  console.log(`Final URLs selected: ${finalCrawlUrls.length}`);
  console.log("URLs selected for crawl:");
  finalCrawlUrls.forEach((url, index) => {
    console.log(`${index + 1}. ${url}`);
  });
  console.log("");

  await runCrawlAndExport(finalCrawlUrls.length > 0 ? finalCrawlUrls : [targetUrl]);
}

function printChildSitemaps(childSitemaps) {
  childSitemaps.forEach((childSitemap, index) => {
    console.log(
      `[${index + 1}] ${childSitemap.sitemapUrl} | xml=${childSitemap.type} | sitemapType=${childSitemap.sitemapType} | urls=${childSitemap.urlCount}`
    );
  });
}

function appendUniqueSitemaps(target, sitemaps) {
  sitemaps.forEach((sitemap) => {
    if (!target.some((existing) => existing.sitemapUrl === sitemap.sitemapUrl)) {
      target.push(sitemap);
    }
  });
}

function selectSitemapsForCrawl(sitemaps, totalUrlsFound) {
  if (totalUrlsFound <= 500) {
    const configuredSitemaps = filterSitemapsByConfig(sitemaps);
    return configuredSitemaps.length > 0 ? configuredSitemaps : sitemaps;
  }

  const recommendedSitemaps = sitemaps.filter((sitemap) => {
    const classification = sitemap.sitemapType || classifySitemapByUrlName(sitemap.sitemapUrl);
    return ["post", "page", "product", "service", "course", "location", "case-study"].includes(classification);
  });

  return recommendedSitemaps.length > 0 ? recommendedSitemaps : sitemaps;
}

function filterSitemapsByConfig(sitemaps) {
  const includePatterns = config.sitemapSelection?.includePatterns ?? [];
  const excludePatterns = config.sitemapSelection?.excludePatterns ?? [];

  return sitemaps.filter((sitemap) => {
    const sitemapUrl = sitemap.sitemapUrl.toLowerCase();
    const isExcluded = excludePatterns.some((pattern) => sitemapUrl.includes(pattern.toLowerCase()));
    const isIncluded =
      includePatterns.length === 0 ||
      includePatterns.some((pattern) => sitemapUrl.includes(pattern.toLowerCase()));

    return isIncluded && !isExcluded;
  });
}

function buildSitemapInventory(discoveredSitemaps, selectedSitemaps, detectionResult) {
  const selectedUrls = new Set(selectedSitemaps.map((sitemap) => sitemap.sitemapUrl));

  return {
    source: detectionResult.source,
    status: detectionResult.status,
    detectedSitemapUrls: detectionResult.sitemapUrls,
    detectedSeoPlugins: detectionResult.detectedSeoPlugins || [],
    unavailableReason: detectionResult.unavailableReason || "",
    attempts: detectionResult.attempts || [],
    totalSitemapsFound: discoveredSitemaps.length,
    totalUrlsFound: discoveredSitemaps.reduce((sum, sitemap) => sum + sitemap.urlCount, 0),
    selectedSitemapsForCrawl: selectedSitemaps.length,
    sitemaps: discoveredSitemaps.map((sitemap) => ({
      ...sitemap,
      selectedForCrawl: selectedUrls.has(sitemap.sitemapUrl)
    }))
  };
}

async function extractUrlsForCrawl(sitemaps) {
  const crawlUrls = [];

  for (const sitemap of sitemaps) {
    if (crawlUrls.length >= config.maxPages) {
      break;
    }

    const parsedSitemap = await parseSitemap(sitemap.sitemapUrl, {
      limit: config.maxPages - crawlUrls.length
    });

    appendUniqueUrls(crawlUrls, parsedSitemap.urls, config.maxPages);
  }

  return crawlUrls;
}

function appendUniqueUrls(target, urls, limit) {
  urls.forEach((url) => {
    if (target.length < limit && !target.includes(url)) {
      target.push(url);
    }
  });
}

async function runCrawlAndExport(urls) {
  await startCrawler(urls);
  const summary = await generateSummary();
  console.log("SEO issue summary:");
  console.log(JSON.stringify(summary, null, 2));
  const duplicates = await detectDuplicates();
  console.log("Duplicate SEO values:");
  console.log(JSON.stringify(duplicates, null, 2));
  const outputPath = await exportExcel();
  console.log(`Excel export completed: ${outputPath}`);
}

main();

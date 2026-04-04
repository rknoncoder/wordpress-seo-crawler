import config from "./config/config.js";
import startCrawler from "./crawler/crawler.js";
import detectSitemapUrls from "./crawler/sitemapDetector.js";
import parseSitemap, {
  classifySitemapByUrlName,
  inspectSitemapIndex
} from "./parser/sitemapParser.js";

async function main() {
  const detectionResult = await detectSitemapUrls(config.startUrl);

  if (detectionResult.sitemapUrls.length === 0) {
    console.log("No sitemap found. Falling back to start URL crawling.");
    await startCrawler([config.startUrl]);
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

  await startCrawler(finalCrawlUrls.length > 0 ? finalCrawlUrls : [config.startUrl]);
}

function printChildSitemaps(childSitemaps) {
  childSitemaps.forEach((childSitemap, index) => {
    console.log(
      `[${index + 1}] ${childSitemap.sitemapUrl} | type=${childSitemap.type} | urls=${childSitemap.urlCount}`
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
    return sitemaps;
  }

  const recommendedSitemaps = sitemaps.filter((sitemap) => {
    const classification = classifySitemapByUrlName(sitemap.sitemapUrl);
    return classification === "post" || classification === "page";
  });

  return recommendedSitemaps.length > 0 ? recommendedSitemaps : sitemaps;
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

main();

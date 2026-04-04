import config from "./config/config.js";
import detectSitemapUrls from "./crawler/sitemapDetector.js";
import parseSitemap, { inspectSitemapIndex } from "./parser/sitemapParser.js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

async function main() {
  const detectionResult = await detectSitemapUrls(config.startUrl);

  if (detectionResult.sitemapUrls.length === 0) {
    console.log(JSON.stringify(detectionResult, null, 2));
    return;
  }

  const initialCrawlQueue = [];
  const sitemapInventory = [];
  const recommendedChildSitemaps = [];
  let selectedChildSitemaps = [];

  for (const sitemapUrl of detectionResult.sitemapUrls) {
    const inventory = await inspectSitemapIndex(sitemapUrl);
    sitemapInventory.push(inventory);

    const prioritizedChildSitemaps = prioritizeChildSitemaps(inventory.childSitemaps);
    appendUniqueSitemaps(recommendedChildSitemaps, prioritizedChildSitemaps);
  }

  selectedChildSitemaps = await chooseChildSitemaps(recommendedChildSitemaps, detectionResult.sitemapUrls);

  for (const selectedSitemap of selectedChildSitemaps) {
    if (initialCrawlQueue.length >= config.maxPages) {
      break;
    }

    const parsedSitemap = await parseSitemap(selectedSitemap.sitemapUrl, {
      limit: config.maxPages - initialCrawlQueue.length
    });

    for (const url of parsedSitemap.urls) {
      if (initialCrawlQueue.length >= config.maxPages) {
        break;
      }

      if (!initialCrawlQueue.includes(url)) {
        initialCrawlQueue.push(url);
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ...detectionResult,
        sitemapInventory,
        recommendedChildSitemaps,
        selectedChildSitemaps,
        initialCrawlQueue,
        total: initialCrawlQueue.length
      },
      null,
      2
    )
  );
}

function prioritizeChildSitemaps(childSitemaps) {
  return [...childSitemaps]
    .map((childSitemap) => ({
      ...childSitemap,
      priority: getSitemapPriority(childSitemap.sitemapUrl)
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return right.urlCount - left.urlCount;
    });
}

function getSitemapPriority(sitemapUrl) {
  const normalizedUrl = sitemapUrl.toLowerCase();

  if (normalizedUrl.includes("page-sitemap")) return 1;
  if (normalizedUrl.includes("post-sitemap")) return 2;
  if (normalizedUrl.includes("service") || normalizedUrl.includes("product")) return 3;
  if (normalizedUrl.includes("case") || normalizedUrl.includes("portfolio")) return 4;
  if (normalizedUrl.includes("category")) return 7;
  if (normalizedUrl.includes("tag")) return 8;
  if (normalizedUrl.includes("author")) return 9;
  return 5;
}

function appendUniqueSitemaps(target, items) {
  items.forEach((item) => {
    if (!target.some((existing) => existing.sitemapUrl === item.sitemapUrl)) {
      target.push(item);
    }
  });
}

async function chooseChildSitemaps(recommendedChildSitemaps, fallbackSitemapUrls) {
  if (recommendedChildSitemaps.length === 0) {
    return fallbackSitemapUrls.map((sitemapUrl) => ({ sitemapUrl, type: "unknown", urlCount: 0 }));
  }

  const defaultSelection = getDefaultChildSitemaps(recommendedChildSitemaps);

  if (!input.isTTY || !output.isTTY) {
    return defaultSelection;
  }

  printSitemapChoices(recommendedChildSitemaps, defaultSelection);

  const rl = readline.createInterface({ input, output });

  try {
    const answer = await rl.question(
      "Choose sitemap numbers separated by commas, type 'all', or press Enter for recommended: "
    );

    const selected = parseSelection(answer, recommendedChildSitemaps);
    return selected.length > 0 ? selected : defaultSelection;
  } finally {
    rl.close();
  }
}

function getDefaultChildSitemaps(childSitemaps) {
  const includePatterns = config.sitemapSelection?.includePatterns ?? [];
  const excludePatterns = config.sitemapSelection?.excludePatterns ?? [];

  const selected = childSitemaps.filter((childSitemap) => {
    const normalizedUrl = childSitemap.sitemapUrl.toLowerCase();
    const isExcluded = excludePatterns.some((pattern) => normalizedUrl.includes(pattern));

    if (isExcluded) {
      return false;
    }

    if (includePatterns.length === 0) {
      return true;
    }

    return includePatterns.some((pattern) => normalizedUrl.includes(pattern));
  });

  return selected.length > 0 ? selected : childSitemaps;
}

function printSitemapChoices(childSitemaps, defaultSelection) {
  console.log("\nAvailable child sitemaps:\n");

  childSitemaps.forEach((childSitemap, index) => {
    const isDefault = defaultSelection.some((item) => item.sitemapUrl === childSitemap.sitemapUrl);
    const label = isDefault ? " [recommended]" : "";
    console.log(
      `${index + 1}. ${childSitemap.sitemapUrl} | type=${childSitemap.type} | urls=${childSitemap.urlCount}${label}`
    );
  });

  console.log("");
}

function parseSelection(answer, childSitemaps) {
  const normalizedAnswer = answer.trim().toLowerCase();

  if (!normalizedAnswer) {
    return [];
  }

  if (normalizedAnswer === "all") {
    return childSitemaps;
  }

  const indexes = normalizedAnswer
    .split(",")
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= childSitemaps.length);

  const uniqueIndexes = [...new Set(indexes)];
  return uniqueIndexes.map((index) => childSitemaps[index - 1]);
}

main();

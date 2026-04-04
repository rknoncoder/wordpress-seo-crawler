import fetchPage from "./fetcher.js";
import extractData from "../parser/htmlParser.js";
import saveJson from "../storage/saveJson.js";
import config from "../config/config.js";

export default async function startCrawler(initialUrls = [config.startUrl]) {
  const visited = new Set();
  const queue = [...new Set(initialUrls)];
  const queued = new Set(queue);
  const results = [];

  while (queue.length && visited.size < config.maxPages) {
    const url = queue.shift();
    queued.delete(url);

    if (visited.has(url)) continue;
    visited.add(url);

    console.log(`Crawling: ${url}`);

    const page = await fetchPage(url);
    if (!page) continue;

    const { data, links } = await extractData(page.finalUrl, page.html);
    results.push(data);

    links.forEach((link) => {
      if (
        !visited.has(link) &&
        !queued.has(link) &&
        visited.size + queue.length < config.maxPages
      ) {
        queue.push(link);
        queued.add(link);
      }
    });
  }

  saveJson(results);
  console.log("Crawl completed");
}

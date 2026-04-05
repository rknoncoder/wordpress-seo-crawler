import * as cheerio from "cheerio";
import metaExtractor from "./metaExtractor.js";
import linkExtractor from "./linkExtractor.js";
import imageExtractor from "./imageExtractor.js";
import headingExtractor from "./headingExtractor.js";
import wordpressDetector from "./wordpressDetector.js";

export default async function extractData(url, html) {
  const $ = cheerio.load(html);

  const meta = metaExtractor($);
  const links = linkExtractor($, url);
  const images = imageExtractor($);
  const headings = headingExtractor($);
  const wordpress = await wordpressDetector($, url);

  const data = {
    url,
    ...meta,
    ...images,
    ...headings,
    wordpress
  };

  return { data, links };
}

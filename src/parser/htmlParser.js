import * as cheerio from "cheerio";
import metaExtractor from "./metaExtractor.js";
import linkExtractor from "./linkExtractor.js";
import imageExtractor from "./imageExtractor.js";
import headingExtractor from "./headingExtractor.js";
import contentExtractor from "./contentExtractor.js";
import schemaExtractor from "./schemaExtractor.js";
import wordpressDetector from "./wordpressDetector.js";
import classifyPage from "../classifier/pageClassifier.js";
import { detectFacetedUrl } from "../utils/facetedUrl.js";

export default async function extractData(url, html) {
  const $ = cheerio.load(html);

  const meta = metaExtractor($);
  const { crawlLinks, linkData } = linkExtractor($, url);
  const images = imageExtractor($);
  const headings = headingExtractor($);
  const content = contentExtractor($);
  const schema = schemaExtractor($);
  const wordpress = await wordpressDetector($, url);
  const facetedUrl = detectFacetedUrl(url);

  const data = {
    url,
    ...meta,
    ...headings,
    ...content,
    ...images,
    ...linkData,
    ...schema,
    ...facetedUrl,
    wordpress
  };

  data.classification = classifyPage(data);

  return { data, links: crawlLinks };
}

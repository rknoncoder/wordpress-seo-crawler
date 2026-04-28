export default function ($) {
  const title = $("title").first().text().trim();
  const metaDescription = getMetaContent($, 'meta[name="description"]');
  const canonicalTags = $('link[rel="canonical"]');
  const canonical = canonicalTags.first().attr("href") || "";
  const robots = getMetaContent($, 'meta[name="robots"]');

  return {
    title,
    titleLength: title.length,
    metaDescription,
    metaDescriptionLength: metaDescription.length,
    canonical,
    canonicalTagCount: canonicalTags.length,
    robots,
    isNoindex: robots.toLowerCase().includes("noindex"),
    openGraph: {
      title: getMetaContent($, 'meta[property="og:title"]'),
      description: getMetaContent($, 'meta[property="og:description"]'),
      type: getMetaContent($, 'meta[property="og:type"]'),
      image: getMetaContent($, 'meta[property="og:image"]'),
      url: getMetaContent($, 'meta[property="og:url"]')
    },
    twitter: {
      card: getMetaContent($, 'meta[name="twitter:card"]'),
      title: getMetaContent($, 'meta[name="twitter:title"]'),
      description: getMetaContent($, 'meta[name="twitter:description"]'),
      image: getMetaContent($, 'meta[name="twitter:image"]')
    }
  };
}

function getMetaContent($, selector) {
  return $(selector).first().attr("content")?.trim() || "";
}

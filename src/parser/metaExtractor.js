export default function ($) {
  const canonicalTags = $('link[rel="canonical"]');

  return {
    title: $("title").text(),
    metaDescription: $('meta[name="description"]').attr("content") || "",
    canonical: canonicalTags.first().attr("href") || "",
    canonicalTagCount: canonicalTags.length
  };
}

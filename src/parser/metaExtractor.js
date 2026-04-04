export default function ($) {
  return {
    title: $("title").text(),
    metaDescription: $('meta[name="description"]').attr("content") || "",
    canonical: $('link[rel="canonical"]').attr("href") || ""
  };
}
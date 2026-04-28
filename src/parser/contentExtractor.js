export default function contentExtractor($) {
  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(/\s+/).length : 0;
  const htmlLength = $.html().length;
  const textLength = bodyText.length;

  return {
    wordCount,
    textLength,
    htmlLength,
    textToHtmlRatio: htmlLength > 0 ? Number((textLength / htmlLength).toFixed(4)) : 0
  };
}

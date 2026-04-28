export default function headingExtractor($) {
  const headings = {};

  for (const tag of ["h1", "h2", "h3", "h4", "h5", "h6"]) {
    headings[tag] = collectHeadingText($, tag);
  }

  return {
    headings,
    h1Count: headings.h1.length,
    h1Text: headings.h1.join(" | "),
    h2Count: headings.h2.length,
    h3Count: headings.h3.length
  };
}

function collectHeadingText($, tag) {
  return $(tag)
    .map((_, element) => $(element).text().replace(/\s+/g, " ").trim())
    .get()
    .filter(Boolean);
}

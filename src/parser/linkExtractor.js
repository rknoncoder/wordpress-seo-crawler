export default function ($, baseUrl) {
  const links = new Set();
  const base = new URL(baseUrl);

  $("a").each((i, el) => {
    const href = $(el).attr("href");
    if (!href) return;

    try {
      const absoluteUrl = new URL(href, baseUrl);

      if (absoluteUrl.origin === base.origin && !["mailto:", "tel:"].includes(absoluteUrl.protocol)) {
        absoluteUrl.hash = "";
        links.add(absoluteUrl.href);
      }
    } catch {}
  });

  return [...links];
}

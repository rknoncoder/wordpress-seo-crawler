import axios from "axios";

const siteChecks = new Map();

export default async function ($, url) {
  let isWordPress = false;
  const signals = [];
  const origin = new URL(url).origin;

  const generator = $('meta[name="generator"]').attr("content");
  if (generator && generator.toLowerCase().includes("wordpress")) {
    isWordPress = true;
    signals.push("meta-generator");
  }

  const html = $.html();
  if (html.includes("wp-content") || html.includes("wp-includes")) {
    isWordPress = true;
    signals.push("wp-path");
  }

  const cachedChecks = await getSiteChecks(origin);

  if (cachedChecks.has("wp-json")) {
    isWordPress = true;
    signals.push("wp-json");
  }

  if (cachedChecks.has("wp-login")) {
    isWordPress = true;
    signals.push("wp-login");
  }

  return {
    isWordPress,
    signals: [...new Set(signals)]
  };
}

async function getSiteChecks(origin) {
  if (siteChecks.has(origin)) {
    return siteChecks.get(origin);
  }

  const signals = new Set();

  try {
    const wpJsonResponse = await axios.get(new URL("/wp-json/", origin).href, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (wpJsonResponse.status === 200 && typeof wpJsonResponse.data === "object") {
      signals.add("wp-json");
    }
  } catch {}

  try {
    const loginResponse = await axios.get(new URL("/wp-login.php", origin).href, {
      timeout: 5000,
      validateStatus: () => true
    });

    if (loginResponse.status === 200) {
      signals.add("wp-login");
    }
  } catch {}

  siteChecks.set(origin, signals);
  return signals;
}

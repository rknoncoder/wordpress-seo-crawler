import fs from "fs/promises";
import path from "path";

const INPUT_PATH = path.resolve("data/raw/output.json");

export default async function detectDuplicates() {
  const records = await readAnalyzedPages();

  return {
    duplicateTitles: findDuplicates(records, "title"),
    duplicateMeta: findDuplicates(records, "metaDescription")
  };
}

async function readAnalyzedPages() {
  let raw;

  try {
    raw = await fs.readFile(INPUT_PATH, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }

    throw error;
  }

  if (!raw.trim()) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function findDuplicates(records, fieldName) {
  const groups = new Map();

  records.forEach((record = {}) => {
    const value = normalizeValue(record[fieldName]);

    if (!value || shouldIgnoreValue(fieldName, value)) {
      return;
    }

    if (!groups.has(value.normalized)) {
      groups.set(value.normalized, {
        value: value.original,
        urls: []
      });
    }

    groups.get(value.normalized).urls.push(record.url || "");
  });

  return [...groups.values()]
    .filter((group) => group.urls.length > 1)
    .map((group) => ({
      value: group.value,
      count: group.urls.length,
      severity: getSeverity(group.urls.length),
      urls: group.urls
    }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}

function normalizeValue(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  return {
    original: trimmedValue,
    normalized: trimmedValue.toLowerCase()
  };
}

function shouldIgnoreValue(fieldName, value) {
  if (fieldName === "title" && value.original.length < 10) {
    return true;
  }

  return false;
}

function getSeverity(count) {
  return "high";
}

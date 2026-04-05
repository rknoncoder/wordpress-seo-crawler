import fs from "fs/promises";
import path from "path";

const INPUT_PATH = path.resolve("data/raw/output.json");

export default async function generateSummary() {
  const records = await readAnalyzedPages();
  const summary = {
    totalPages: records.length,
    issues: {
      missing_title: 0,
      missing_meta_description: 0,
      multiple_h1: 0,
      missing_h1: 0,
      missing_alt: 0
    },
    canonical: {
      missing_canonical: 0,
      canonical_mismatch: 0,
      multiple_canonical_tags: 0
    }
  };

  records.forEach((record) => {
    const issues = Array.isArray(record.issues) ? record.issues : [];

    issues.forEach((issue) => {
      const summaryKey = mapIssueType(issue?.type);
      if (summaryKey) {
        summary.issues[summaryKey] += 1;
      }

      const canonicalSummaryKey = mapCanonicalIssueType(issue?.type);
      if (canonicalSummaryKey) {
        summary.canonical[canonicalSummaryKey] += 1;
      }
    });
  });

  printCanonicalSummary(summary.canonical);
  return summary;
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

function mapIssueType(issueType) {
  if (issueType === "images_without_alt") {
    return "missing_alt";
  }

  if (issueType === "missing_title") {
    return "missing_title";
  }

  if (issueType === "missing_meta_description") {
    return "missing_meta_description";
  }

  if (issueType === "multiple_h1") {
    return "multiple_h1";
  }

  if (issueType === "missing_h1") {
    return "missing_h1";
  }

  return null;
}

function mapCanonicalIssueType(issueType) {
  if (issueType === "missing_canonical") {
    return "missing_canonical";
  }

  if (issueType === "canonical_mismatch") {
    return "canonical_mismatch";
  }

  if (issueType === "multiple_canonical_tags") {
    return "multiple_canonical_tags";
  }

  return null;
}

function printCanonicalSummary(canonicalSummary) {
  console.log("Canonical Summary:");
  console.log(`missing_canonical: ${canonicalSummary.missing_canonical}`);
  console.log(`canonical_mismatch: ${canonicalSummary.canonical_mismatch}`);
  console.log(`multiple_canonical_tags: ${canonicalSummary.multiple_canonical_tags}`);
}

export function isNonNegativeInt(value: unknown) {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 0;
  }
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isInteger(n) && n >= 0;
  }
  return false;
}

export function validateRoundEntries(
  candidateIds: string[],
  entries: Array<{ candidate_id: string; votes: unknown }>,
) {
  if (entries.length !== candidateIds.length) {
    return "Submit a count for every candidate in a single round.";
  }
  const seen = new Set<string>();
  for (const entry of entries) {
    if (!candidateIds.includes(entry.candidate_id)) {
      return "One or more candidates do not belong to this post.";
    }
    if (seen.has(entry.candidate_id)) {
      return "Duplicate candidate in this round.";
    }
    if (!isNonNegativeInt(entry.votes)) {
      return "Votes must be whole numbers of 0 or more.";
    }
    seen.add(entry.candidate_id);
  }
  return null;
}

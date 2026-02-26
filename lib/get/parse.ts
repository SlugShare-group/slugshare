const UUID_PATTERN =
  /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}/;

const SESSION_PARAM_NAMES = [
  "sessionId",
  "sessionID",
  "session",
  "token",
  "validatedToken",
];

export function extractValidatedSessionId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const embeddedUuid = trimmed.match(UUID_PATTERN)?.[0];
  if (embeddedUuid) {
    return embeddedUuid;
  }

  try {
    const parsed = new URL(trimmed);
    for (const key of SESSION_PARAM_NAMES) {
      const fromQuery = parsed.searchParams.get(key);
      if (!fromQuery) continue;
      const maybeUuid = fromQuery.match(UUID_PATTERN)?.[0];
      if (maybeUuid) {
        return maybeUuid;
      }
    }

    const joinedPath = `${parsed.pathname}${parsed.search}${parsed.hash}`;
    const pathUuid = joinedPath.match(UUID_PATTERN)?.[0];
    if (pathUuid) {
      return pathUuid;
    }
  } catch {
    // If it's not a URL, fall through.
  }

  return null;
}

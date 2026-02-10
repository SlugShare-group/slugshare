const UUID_REGEX =
  /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/;

export function extractValidatedSessionId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) {
    return null;
  }

  const directMatch = trimmed.match(UUID_REGEX);
  if (directMatch?.[1]) {
    return directMatch[1];
  }

  try {
    const parsed = new URL(trimmed);
    const candidates = [
      parsed.searchParams.get("sessionId"),
      parsed.searchParams.get("sid"),
      parsed.searchParams.get("token"),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const match = candidate.match(UUID_REGEX);
      if (match?.[1]) {
        return match[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function generateDeviceId(): string {
  return Math.round(Math.random() * 100_000_000_000_000_000)
    .toString(16)
    .padStart(16, "9")
    .slice(0, 16);
}

export function generatePin(): string {
  return Math.floor(Math.random() * 9999)
    .toString()
    .padStart(4, "0");
}

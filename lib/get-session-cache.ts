type CachedSession = {
  sessionId: string;
  expiresAt: number;
};

const SESSION_TTL_MS = 60_000;
const sessionCache = new Map<string, CachedSession>();

export function getCachedSession(userId: string): string | null {
  const cached = sessionCache.get(userId);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    sessionCache.delete(userId);
    return null;
  }
  return cached.sessionId;
}

export function setCachedSession(userId: string, sessionId: string): void {
  sessionCache.set(userId, {
    sessionId,
    expiresAt: Date.now() + SESSION_TTL_MS,
  });
}

export function clearCachedSession(userId: string): void {
  sessionCache.delete(userId);
}

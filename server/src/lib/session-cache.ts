/**
 * In-process TTL cache for resolved user sessions.
 *
 * Before this existed, every single `/api/*` request paid for:
 *   1. a network round-trip to the Clerk API (`clerk.users.getUser`)
 *   2. a `SELECT` on `users`
 *   3. an `UPDATE` on `users` (to re-sync name/clerk_id/status)
 *
 * That is ~200–400ms of pure overhead per request, and a page like the
 * dashboard fires six requests. The identity behind a Clerk user id is
 * effectively static, so we resolve it once and reuse it for a short TTL.
 *
 * Because the cached entry also carries the authorization decision
 * (is_active, role), mutations that change either MUST call
 * `invalidateUserById` so a deactivation or role change takes effect
 * immediately rather than after the TTL.
 */

export type CachedSession = {
    userId: string;
    role: "OWNER" | "STAFF";
};

type Entry = CachedSession & { expiresAt: number };

const TTL_MS = Number(process.env.SESSION_CACHE_TTL_MS ?? 60_000);
const MAX_ENTRIES = 5_000;

/** clerkUserId -> entry */
const byClerkId = new Map<string, Entry>();
/** internal userId -> clerkUserId, so admin mutations can evict by user id */
const clerkIdByUserId = new Map<string, string>();

export function getCachedSession(clerkUserId: string): CachedSession | null {
    const entry = byClerkId.get(clerkUserId);
    if (!entry) return null;

    if (entry.expiresAt <= Date.now()) {
        byClerkId.delete(clerkUserId);
        clerkIdByUserId.delete(entry.userId);
        return null;
    }

    // Refresh LRU recency: re-inserting moves the key to the end of the Map.
    byClerkId.delete(clerkUserId);
    byClerkId.set(clerkUserId, entry);

    return { userId: entry.userId, role: entry.role };
}

export function setCachedSession(clerkUserId: string, session: CachedSession): void {
    // Evict the least-recently-used entry once we hit the cap. Map preserves
    // insertion order, so the first key is the oldest.
    if (byClerkId.size >= MAX_ENTRIES && !byClerkId.has(clerkUserId)) {
        const oldest = byClerkId.keys().next();
        if (!oldest.done) {
            const evicted = byClerkId.get(oldest.value);
            byClerkId.delete(oldest.value);
            if (evicted) clerkIdByUserId.delete(evicted.userId);
        }
    }

    byClerkId.set(clerkUserId, { ...session, expiresAt: Date.now() + TTL_MS });
    clerkIdByUserId.set(session.userId, clerkUserId);
}

/** Evict by internal user id — call after any change to role or is_active. */
export function invalidateUserById(userId: string): void {
    const clerkUserId = clerkIdByUserId.get(userId);
    if (clerkUserId) byClerkId.delete(clerkUserId);
    clerkIdByUserId.delete(userId);
}

export function invalidateAllSessions(): void {
    byClerkId.clear();
    clerkIdByUserId.clear();
}

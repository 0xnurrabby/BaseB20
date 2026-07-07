const SESSION_KEY = "b20.analytics.session.v1";

export interface TrackPayload {
  eventType: "page_view" | "token_created";
  wallet?: string;
  tokenAddress?: string;
  tokenName?: string;
  tokenSymbol?: string;
  chainId?: number;
  pagePath?: string;
  txHash?: string;
  metadata?: Record<string, unknown>;
}

export function getAnalyticsSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) return existing;
    const next =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, next);
    return next;
  } catch {
    return "anonymous";
  }
}

export function trackEvent(payload: TrackPayload) {
  const body = JSON.stringify({ ...payload, sessionId: getAnalyticsSessionId() });
  fetch("/api/track", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: body.length < 60_000,
  }).catch(() => {
    /* analytics must never block the app */
  });
}

export function adminMessage(address: string, issuedAt = new Date().toISOString()): string {
  return `B20 admin access\nAddress: ${address.toLowerCase()}\nIssued At: ${issuedAt}`;
}

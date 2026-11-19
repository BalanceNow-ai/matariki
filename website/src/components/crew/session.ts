/** The applicant's session lives in sessionStorage: this tab only, gone when it closes. */
export type ClientSession = { applicationId: string; sessionToken: string; expiresAt: number };

const KEY = "crew:session";

export function saveSession(s: ClientSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function loadSession(): ClientSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as ClientSession;
    return s.expiresAt > Date.now() ? s : null;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

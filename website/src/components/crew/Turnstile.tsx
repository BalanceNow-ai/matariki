"use client";

import { useCallback, useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

function loadScript(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  return new Promise((resolve, reject) => {
    let s = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    s.addEventListener("load", () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile failed"))));
    s.addEventListener("error", () => reject(new Error("Turnstile failed to load")));
  });
}

/**
 * Turnstile tokens are single-use, and the form needs one for the application
 * and another for the CV upload. `getToken()` hands out the current token and
 * resets the widget so the next call waits for a fresh one.
 */
export function useTurnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((t: string) => void)[]>([]);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;
    loadScript()
      .then((ts) => {
        if (cancelled || !containerRef.current || widgetId.current) return;
        widgetId.current = ts.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (t: string) => {
            const next = waiters.current.shift();
            if (next) next(t);
            else token.current = t;
          },
          "expired-callback": () => {
            token.current = null;
          },
        });
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const getToken = useCallback(async (): Promise<string> => {
    // Without a site key the server skips verification outside production.
    if (!siteKey) return "turnstile-not-configured";
    const fresh = token.current
      ? Promise.resolve(token.current)
      : new Promise<string>((resolve, reject) => {
          waiters.current.push(resolve);
          setTimeout(() => reject(new Error("Verification timed out. Please try again.")), 60_000);
        });
    const t = await fresh;
    token.current = null;
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
    return t;
  }, [siteKey]);

  return { containerRef, getToken, enabled: Boolean(siteKey) };
}

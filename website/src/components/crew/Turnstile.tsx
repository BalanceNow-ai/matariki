"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
 *
 * The container is tracked with a callback ref, not a ref object: the wizard
 * only renders it on the last step, and the widget must be created when it
 * actually mounts (and removed when it unmounts), not when the hook first runs.
 */
export function useTurnstile() {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const containerRef = useCallback((el: HTMLDivElement | null) => setContainer(el), []);
  const widgetId = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((t: string) => void)[]>([]);

  useEffect(() => {
    if (!siteKey || !container) return;
    let cancelled = false;
    loadScript()
      .then((ts) => {
        if (cancelled || widgetId.current) return;
        widgetId.current = ts.render(container, {
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
      // A token from a removed widget can't be redeemed; wait for the next one.
      token.current = null;
    };
  }, [siteKey, container]);

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

/**
 * Regression: the wizard renders the Turnstile container only on its last
 * step. The widget must be created when that container mounts, not only when
 * the hook first runs (when there is no container yet).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, render, screen, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { useTurnstile } from "@/components/crew/Turnstile";

type RenderOpts = { callback: (t: string) => void };

const turnstile = {
  render: vi.fn<(el: HTMLElement, opts: RenderOpts) => string>(),
  reset: vi.fn(),
  remove: vi.fn(),
};

function Wizard() {
  const [step, setStep] = useState(0);
  const { containerRef, getToken } = useTurnstile();
  const [token, setToken] = useState("");
  return (
    <div>
      <button onClick={() => setStep((s) => (s === 2 ? 0 : s + 1))}>step</button>
      {step === 2 && <div data-testid="ts" ref={containerRef} />}
      <button onClick={async () => setToken(await getToken())}>submit</button>
      <span data-testid="token">{token}</span>
    </div>
  );
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site-key";
  turnstile.render.mockReset().mockImplementation((_el, opts) => {
    queueMicrotask(() => opts.callback("token-1"));
    return "widget-1";
  });
  turnstile.reset.mockReset();
  turnstile.remove.mockReset();
  (window as unknown as { turnstile: typeof turnstile }).turnstile = turnstile;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  delete (window as unknown as { turnstile?: unknown }).turnstile;
});

describe("useTurnstile", () => {
  it("renders the widget when its container mounts on a later step", async () => {
    render(<Wizard />);
    expect(turnstile.render).not.toHaveBeenCalled();

    await act(async () => fireEvent.click(screen.getByText("step"))); // step 1
    await act(async () => fireEvent.click(screen.getByText("step"))); // step 2: container mounts
    expect(turnstile.render).toHaveBeenCalledOnce();
    expect(turnstile.render.mock.calls[0][0]).toBe(screen.getByTestId("ts"));

    await act(async () => fireEvent.click(screen.getByText("submit")));
    expect(screen.getByTestId("token").textContent).toBe("token-1");
    expect(turnstile.reset).toHaveBeenCalledWith("widget-1");
  });

  it("removes the widget when the container unmounts and recreates it on return", async () => {
    render(<Wizard />);
    for (let i = 0; i < 2; i++) await act(async () => fireEvent.click(screen.getByText("step")));
    expect(turnstile.render).toHaveBeenCalledTimes(1);

    await act(async () => fireEvent.click(screen.getByText("step"))); // back to step 0
    expect(turnstile.remove).toHaveBeenCalledWith("widget-1");

    for (let i = 0; i < 2; i++) await act(async () => fireEvent.click(screen.getByText("step")));
    expect(turnstile.render).toHaveBeenCalledTimes(2);
  });
});

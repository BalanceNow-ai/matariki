"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { clearSession, loadSession, type ClientSession } from "./session";

type Message = { role: "applicant" | "assistant"; content: string };
type Phase = "loading" | "ready" | "waiting" | "finished" | "no-session" | "error";

const MAX_TURNS = 14;

async function* readEvents(res: Response): AsyncGenerator<Record<string, unknown>> {
  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (line) yield JSON.parse(line);
    }
  }
}

export function InterviewChat() {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string>();
  const [draft, setDraft] = useState("");
  const [turnsRemaining, setTurnsRemaining] = useState(MAX_TURNS);
  const [cvWarning, setCvWarning] = useState<string>();
  const started = useRef(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const send = useCallback(
    async (s: ClientSession, message: string | null) => {
      setError(undefined);
      setPhase("waiting");
      if (message) setMessages((m) => [...m, { role: "applicant", content: message }]);
      try {
        const res = await fetch("/api/crew/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-crew-session": s.sessionToken },
          body: JSON.stringify({ applicationId: s.applicationId, message }),
        });
        if (res.status === 401) {
          setPhase("no-session");
          return;
        }
        const type = res.headers.get("content-type") ?? "";
        if (!type.includes("ndjson")) {
          const body = (await res.json().catch(() => ({}))) as { finished?: boolean; error?: string };
          if (body.finished) {
            clearSession();
            setPhase("finished");
            return;
          }
          throw new Error(body.error || "Something went wrong");
        }

        let assistantStarted = false;
        for await (const ev of readEvents(res)) {
          if (ev.type === "history") {
            setMessages(ev.entries as Message[]);
          } else if (ev.type === "text") {
            const text = ev.text as string;
            setMessages((m) => {
              if (!assistantStarted) {
                assistantStarted = true;
                return [...m, { role: "assistant", content: text }];
              }
              const copy = [...m];
              copy[copy.length - 1] = { ...copy[copy.length - 1], content: copy[copy.length - 1].content + text };
              return copy;
            });
          } else if (ev.type === "done") {
            setTurnsRemaining(ev.turnsRemaining as number);
            if (ev.finished) {
              clearSession();
              setPhase("finished");
              return;
            }
          } else if (ev.type === "error") {
            throw new Error(ev.message as string);
          }
        }
        setPhase("ready");
      } catch (e) {
        // Let the applicant resend: drop their unanswered message from the input history.
        if (message) {
          setMessages((m) => (m[m.length - 1]?.role === "applicant" ? m.slice(0, -1) : m));
          setDraft(message);
        }
        setError(e instanceof Error ? e.message : "Something went wrong");
        setPhase("error");
      }
    },
    []
  );

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const s = loadSession();
    try {
      const w = sessionStorage.getItem("crew:cv-warning");
      if (w) {
        setCvWarning(w);
        sessionStorage.removeItem("crew:cv-warning");
      }
    } catch {
      /* ignore */
    }
    if (!s) {
      setPhase("no-session");
      return;
    }
    setSession(s);
    void send(s, null);
  }, [send]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !session || phase === "waiting") return;
    setDraft("");
    void send(session, text);
  };

  if (phase === "no-session") {
    return (
      <div className="card rounded-lg p-8 [&]:hover:transform-none">
        <p className="text-salt-white mb-4">We couldn&apos;t find an interview in progress in this browser tab.</p>
        <p className="text-mist mb-6">
          If you&apos;ve already finished, there&apos;s nothing more to do — Greg will be in touch. Otherwise you can start a new application.
        </p>
        <Button href="/crew/apply">Back to the application</Button>
      </div>
    );
  }

  const answered = MAX_TURNS - turnsRemaining;

  return (
    <div className="flex flex-col">
      <div className="mb-6 p-4 border border-copper-accent/30 bg-copper-accent/5 text-sm text-mist">
        You&apos;re chatting with an <strong className="text-salt-white">AI assistant</strong>. It asks about your sailing and writes a
        summary for Greg. It doesn&apos;t accept or reject anyone — Greg reads every application himself and makes all the decisions.
      </div>
      {cvWarning && (
        <p className="mb-6 text-sm text-warning-red">
          Your application was saved, but your CV didn&apos;t upload ({cvWarning}). You can email it to Greg later.
        </p>
      )}

      {phase !== "finished" && (
        <div className="mb-4" aria-live="polite">
          <div className="flex justify-between text-caption text-mist mb-2">
            <span>About 10 minutes</span>
            <span>
              {answered < 3 ? "Getting started" : answered < 8 ? "About halfway" : "Nearly there"}
            </span>
          </div>
          <div className="h-1 bg-mist/20">
            <div className="h-1 bg-copper-accent transition-all" style={{ width: `${Math.min(100, (answered / MAX_TURNS) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="space-y-4 min-h-[300px]" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "applicant" ? "justify-end" : "justify-start")}>
            <div
              className={cn(
                "max-w-[85%] px-4 py-3 whitespace-pre-wrap leading-relaxed",
                m.role === "applicant" ? "bg-copper-accent/15 border border-copper-accent/30 text-salt-white" : "bg-midnight-blue border border-mist/10 text-foam"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {phase === "waiting" && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="text-mist text-sm">…</div>
        )}
        {phase === "loading" && <div className="text-mist text-sm">Starting the interview…</div>}
        <div ref={endRef} />
      </div>

      {error && <p className="mt-4 text-warning-red text-sm">{error}</p>}

      {phase === "finished" ? (
        <div className="mt-10 p-6 border border-sea-green/40">
          <p className="text-salt-white mb-2">Thanks — your application is in.</p>
          <p className="text-mist mb-6">You&apos;ll get a confirmation email shortly. Greg reads every application himself and will be in touch if it looks like a fit.</p>
          <Link href="/crew" className="text-copper-accent hover:underline">
            Back to the crew page
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-8 flex gap-3">
          <label htmlFor="crew-reply" className="sr-only">
            Your reply
          </label>
          <textarea
            id="crew-reply"
            rows={2}
            maxLength={2000}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit(e);
              }
            }}
            disabled={phase === "waiting" || phase === "loading"}
            placeholder="Type your answer…"
            className="flex-1 px-4 py-3 bg-midnight-blue/50 border border-mist/20 text-salt-white placeholder:text-storm-grey focus:outline-none focus:border-copper-accent"
          />
          <Button type="submit" disabled={phase === "waiting" || phase === "loading" || !draft.trim()}>
            Send
          </Button>
        </form>
      )}
    </div>
  );
}

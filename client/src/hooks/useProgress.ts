import { useState, useCallback, useEffect } from "react";
import { totalTopics } from "@/lib/content";

const STORAGE_KEY = "matariki-crew-progress";

export function useProgress() {
  const [read, setRead] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Persist to localStorage whenever read set changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(read)));
    } catch {
      // ignore storage errors
    }
  }, [read]);

  const markRead = useCallback((topicId: string) => {
    setRead((prev) => {
      const next = new Set(prev);
      next.add(topicId);
      return next;
    });
  }, []);

  const markUnread = useCallback((topicId: string) => {
    setRead((prev) => {
      const next = new Set(prev);
      next.delete(topicId);
      return next;
    });
  }, []);

  const toggleRead = useCallback((topicId: string) => {
    setRead((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) {
        next.delete(topicId);
      } else {
        next.add(topicId);
      }
      return next;
    });
  }, []);

  const isRead = useCallback(
    (topicId: string) => read.has(topicId),
    [read]
  );

  const sectionProgress = useCallback(
    (topicIds: string[]) => {
      const done = topicIds.filter((id) => read.has(id)).length;
      return { done, total: topicIds.length, pct: topicIds.length ? Math.round((done / topicIds.length) * 100) : 0 };
    },
    [read]
  );

  const overallProgress = {
    done: read.size,
    total: totalTopics,
    pct: totalTopics ? Math.round((read.size / totalTopics) * 100) : 0,
  };

  const resetAll = useCallback(() => {
    setRead(new Set());
  }, []);

  return { isRead, markRead, markUnread, toggleRead, sectionProgress, overallProgress, resetAll };
}

/* ============================================================
   SECTION PAGE — Matariki III Crew Preparation Guide
   Design: Offshore Operations Dashboard — dark slate, colour-coded sections
   ============================================================ */

import { useParams, useLocation } from "wouter";
import { sections } from "@/lib/content";
import { useProgress } from "@/hooks/useProgress";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Info,
  ListChecks,
  ClipboardList,
} from "lucide-react";
import { useState } from "react";

const SECTION_COLORS: Record<string, string> = {
  welcome:  "oklch(0.68 0.14 185)",
  sailing:  "oklch(0.62 0.18 220)",
  offshore: "oklch(0.58 0.20 265)",
  safety:   "oklch(0.72 0.18 45)",
  packing:  "oklch(0.65 0.16 145)",
};

type TopicType = "info" | "warning" | "procedure" | "checklist";

function typeIcon(type?: TopicType) {
  switch (type) {
    case "warning":   return <AlertTriangle size={14} />;
    case "procedure": return <ClipboardList size={14} />;
    case "checklist": return <ListChecks size={14} />;
    default:          return <Info size={14} />;
  }
}

function typeLabel(type?: TopicType) {
  switch (type) {
    case "warning":   return "Important";
    case "procedure": return "Procedure";
    case "checklist": return "Checklist";
    default:          return "Information";
  }
}

/** Very lightweight markdown renderer — handles bold, code, tables, lists, headings */
function SimpleMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  function renderInline(text: string): React.ReactNode {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={idx} className="font-semibold text-foreground">{part.slice(2, -2)}</strong>;
      }
      // Inline code `text`
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((cp, ci) => {
        if (cp.startsWith("`") && cp.endsWith("`")) {
          return (
            <code key={ci} className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-foreground">
              {cp.slice(1, -1)}
            </code>
          );
        }
        return cp;
      });
    });
  }

  while (i < lines.length) {
    const line = lines[i];

    // Empty line
    if (line.trim() === "") { i++; continue; }

    // Heading
    if (line.startsWith("## ")) {
      elements.push(
        <h3 key={i} className="text-base font-bold text-foreground mt-5 mb-2">
          {renderInline(line.slice(3))}
        </h3>
      );
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(
        <h2 key={i} className="text-lg font-bold text-foreground mt-6 mb-2">
          {renderInline(line.slice(2))}
        </h2>
      );
      i++; continue;
    }

    // Table
    if (line.startsWith("|")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].startsWith("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = tableLines.filter((l) => !l.match(/^\|[-| ]+\|$/));
      elements.push(
        <div key={`table-${i}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {rows[0].split("|").filter((_, ci) => ci > 0 && ci < rows[0].split("|").length - 1).map((cell, ci) => (
                  <th key={ci} className="text-left px-3 py-2 border-b border-white/15 text-muted-foreground font-medium text-xs uppercase tracking-wide">
                    {cell.trim()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-white/8 hover:bg-white/4">
                  {row.split("|").filter((_, ci) => ci > 0 && ci < row.split("|").length - 1).map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-foreground/80">
                      {renderInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Checklist item [ ]
    if (line.match(/^- \[[ x]\]/)) {
      const checked = line.includes("[x]");
      const text = line.replace(/^- \[[ x]\] /, "");
      elements.push(
        <div key={i} className="flex items-start gap-2 py-1">
          <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-primary border-primary" : "border-white/30"}`}>
            {checked && <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-white"><path d="M1 4l3 3 5-6"/></svg>}
          </div>
          <span className="text-sm text-foreground/80">{renderInline(text)}</span>
        </div>
      );
      i++; continue;
    }

    // Bullet list
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].startsWith("- ") || lines[i].startsWith("* "))) {
        listItems.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <ul key={`ul-${i}`} className="space-y-1.5 my-3 ml-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-2 text-sm text-foreground/80">
              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />
              <span>{renderInline(item)}</span>
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (line.match(/^\d+\. /)) {
      const listItems: string[] = [];
      let num = 1;
      while (i < lines.length && lines[i].match(/^\d+\. /)) {
        listItems.push(lines[i].replace(/^\d+\. /, ""));
        i++;
        num++;
      }
      elements.push(
        <ol key={`ol-${i}`} className="space-y-2 my-3 ml-1">
          {listItems.map((item, li) => (
            <li key={li} className="flex items-start gap-3 text-sm text-foreground/80">
              <span className="shrink-0 w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono font-medium text-foreground/60">
                {li + 1}
              </span>
              <span className="pt-0.5">{renderInline(item)}</span>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote / italic emphasis lines starting with *
    if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
      elements.push(
        <p key={i} className="text-sm italic text-muted-foreground my-2">
          {renderInline(line.slice(1, -1))}
        </p>
      );
      i++; continue;
    }

    // Paragraph
    elements.push(
      <p key={i} className="text-sm text-foreground/80 leading-relaxed my-2">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

export default function SectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { isRead, toggleRead, sectionProgress } = useProgress();

  const sectionIndex = sections.findIndex((s) => s.slug === slug);
  const section = sections[sectionIndex];

  const [openTopic, setOpenTopic] = useState<string | null>(
    section ? section.topics[0].id : null
  );

  if (!section) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Section not found.</p>
          <button onClick={() => navigate("/")} className="text-primary hover:underline">
            Back to home
          </button>
        </div>
      </div>
    );
  }

  const color = SECTION_COLORS[section.id] ?? "oklch(0.62 0.18 220)";
  const topicIds = section.topics.map((t) => t.id);
  const { done, total, pct } = sectionProgress(topicIds);

  const prevSection = sectionIndex > 0 ? sections[sectionIndex - 1] : null;
  const nextSection = sectionIndex < sections.length - 1 ? sections[sectionIndex + 1] : null;

  return (
    <div className="min-h-screen bg-background">
      {/* ── Header ── */}
      <div
        className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur"
        style={{ borderBottomColor: `color-mix(in oklch, ${color} 30%, transparent)` }}
      >
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-3 flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">All sections</span>
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-lg leading-none">{section.icon}</span>
              <h1 className="text-sm font-bold text-foreground truncate">{section.title}</h1>
              <span
                className="hidden sm:inline-flex items-center gap-1 text-xs font-mono px-2 py-0.5 rounded-full"
                style={{
                  color,
                  backgroundColor: `color-mix(in oklch, ${color} 15%, transparent)`,
                }}
              >
                {pct}%
              </span>
            </div>
          </div>

          {/* Mini progress */}
          <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
            {done}/{total} read
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-white/8">
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* ── Hero band ── */}
      {section.heroImage && (
        <div className="relative h-36 md:h-48 overflow-hidden">
          <img
            src={section.heroImage}
            alt={section.title}
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-background" />
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 md:px-8 py-6">
        {/* Section intro */}
        <div className="mb-6">
          <div
            className="text-xs font-mono uppercase tracking-widest mb-1"
            style={{ color }}
          >
            Section {sectionIndex + 1} of {sections.length}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
            {section.title}
          </h1>
          <p className="text-muted-foreground">{section.subtitle}</p>
        </div>

        {/* ── Topics ── */}
        <div className="space-y-3">
          {section.topics.map((topic) => {
            const read = isRead(topic.id);
            const open = openTopic === topic.id;

            return (
              <div
                key={topic.id}
                className="rounded-xl border border-white/8 bg-card overflow-hidden"
                style={open ? { borderColor: `color-mix(in oklch, ${color} 35%, transparent)` } : {}}
              >
                {/* Topic header */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/4 transition-colors"
                  onClick={() => setOpenTopic(open ? null : topic.id)}
                >
                  {/* Read indicator */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRead(topic.id);
                    }}
                    className="shrink-0 transition-transform hover:scale-110"
                    title={read ? "Mark as unread" : "Mark as read"}
                  >
                    {read ? (
                      <CheckCircle2 size={20} style={{ color }} />
                    ) : (
                      <Circle size={20} className="text-white/25" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium"
                        style={{
                          color,
                          backgroundColor: `color-mix(in oklch, ${color} 12%, transparent)`,
                        }}
                      >
                        {typeIcon(topic.type as TopicType)}
                        {typeLabel(topic.type as TopicType)}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground leading-snug">
                      {topic.title}
                    </h3>
                  </div>

                  <ChevronRight
                    size={16}
                    className="shrink-0 text-muted-foreground transition-transform duration-200"
                    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
                  />
                </button>

                {/* Topic content */}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-5 pt-1 border-t border-white/8">
                        <SimpleMarkdown content={topic.content} />

                        {/* Mark as read button */}
                        <div className="mt-5 pt-4 border-t border-white/8 flex items-center justify-between">
                          <button
                            onClick={() => toggleRead(topic.id)}
                            className="flex items-center gap-2 text-sm font-medium transition-colors"
                            style={{ color: read ? "oklch(0.58 0.012 240)" : color }}
                          >
                            {read ? (
                              <>
                                <CheckCircle2 size={16} />
                                Marked as read — click to undo
                              </>
                            ) : (
                              <>
                                <Circle size={16} />
                                Mark as read
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* ── Section navigation ── */}
        <div className="mt-10 pt-6 border-t border-border flex items-center justify-between gap-4">
          {prevSection ? (
            <button
              onClick={() => navigate(`/section/${prevSection.slug}`)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              <span>
                <div className="text-xs text-muted-foreground/60">Previous</div>
                {prevSection.title}
              </span>
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronLeft size={16} />
              Home
            </button>
          )}

          {nextSection ? (
            <button
              onClick={() => navigate(`/section/${nextSection.slug}`)}
              className="flex items-center gap-2 text-sm font-medium transition-colors"
              style={{ color }}
            >
              <span className="text-right">
                <div className="text-xs opacity-60">Next section</div>
                {nextSection.title}
              </span>
              <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-2 text-sm font-medium text-primary"
            >
              Back to home
              <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

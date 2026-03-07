/* ============================================================
   HOME PAGE — Matariki III Crew Preparation Guide
   Design: Offshore Operations Dashboard — dark slate, colour-coded sections
   ============================================================ */

import { useLocation } from "wouter";
import { sections } from "@/lib/content";
import { useProgress } from "@/hooks/useProgress";
import { motion } from "framer-motion";
import { CheckCircle2, ChevronRight, Anchor } from "lucide-react";

const HERO_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/98435114/83bumnWMKEggvxgpnFgoSR/matariki-hero-M9jbNUNLFopv65zkM23JkL.webp";

const SECTION_COLORS: Record<string, string> = {
  welcome:  "oklch(0.68 0.14 185)",
  sailing:  "oklch(0.62 0.18 220)",
  offshore: "oklch(0.58 0.20 265)",
  safety:   "oklch(0.72 0.18 45)",
  packing:  "oklch(0.65 0.16 145)",
};

function SectionCard({ section, index }: { section: typeof sections[0]; index: number }) {
  const { sectionProgress } = useProgress();
  const topicIds = section.topics.map((t) => t.id);
  const { done, total, pct } = sectionProgress(topicIds);
  const color = SECTION_COLORS[section.id] ?? "oklch(0.62 0.18 220)";
  const href = `/section/${section.slug}`;
  const [, navigate] = useLocation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      onClick={() => navigate(href)}
      className="topic-card group relative cursor-pointer rounded-xl overflow-hidden border border-white/8 bg-card"
      style={{ borderTopColor: color, borderTopWidth: "3px" }}
    >
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl leading-none">{section.icon}</span>
            <div>
              <div
                className="text-xs font-mono font-medium uppercase tracking-widest mb-0.5"
                style={{ color }}
              >
                Section {index + 1}
              </div>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {section.title}
              </h2>
            </div>
          </div>
          {done === total && total > 0 && (
            <CheckCircle2 className="shrink-0 mt-0.5" size={18} style={{ color }} />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
          {section.subtitle}
        </p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-muted-foreground">
              {done} of {total} topics read
            </span>
            <span className="text-xs font-mono" style={{ color }}>
              {pct}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: color }}
            />
          </div>
        </div>

        {/* Topics preview */}
        <div className="space-y-1 mb-4">
          {section.topics.slice(0, 3).map((topic) => (
            <div key={topic.id} className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: color, opacity: 0.6 }}
              />
              {topic.title}
            </div>
          ))}
          {section.topics.length > 3 && (
            <div className="text-xs text-muted-foreground pl-3.5">
              +{section.topics.length - 3} more topics
            </div>
          )}
        </div>

        {/* CTA */}
        <div
          className="flex items-center gap-1 text-sm font-medium group-hover:gap-2 transition-all"
          style={{ color }}
        >
          {done === 0 ? "Start reading" : done === total ? "Review section" : "Continue reading"}
          <ChevronRight size={15} />
        </div>
      </div>
    </motion.div>
  );
}

export default function Home() {
  const { overallProgress, resetAll } = useProgress();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero ── */}
      <div className="relative h-[52vh] min-h-[340px] max-h-[520px] overflow-hidden">
        <img
          src={HERO_IMG}
          alt="Matariki III under sail"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-background" />
        <div className="absolute inset-0 flex flex-col justify-end pb-10 px-6 md:px-10 max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Anchor size={16} className="text-white/60" />
              <span className="text-xs font-mono text-white/60 uppercase tracking-widest">
                Oyster 68 · Auckland NZ · ZMG 3118
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-2">
              Matariki III
            </h1>
            <p className="text-lg md:text-xl text-white/80 font-medium">
              Crew Preparation Guide
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Overall progress bar ── */}
      <div className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-6 md:px-10 py-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-sm font-medium text-foreground">Overall progress</span>
              <span className="text-xs text-muted-foreground ml-2">
                {overallProgress.done} of {overallProgress.total} topics read
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-mono font-semibold text-primary">
                {overallProgress.pct}%
              </span>
              {overallProgress.done > 0 && (
                <button
                  onClick={resetAll}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <div className="h-2 rounded-full bg-white/8 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress.pct}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* ── Intro ── */}
      <div className="max-w-5xl mx-auto px-6 md:px-10 py-8">
        <div className="max-w-2xl mb-8">
          <h2 className="text-xl font-bold text-foreground mb-2">Welcome aboard</h2>
          <p className="text-muted-foreground leading-relaxed">
            This guide covers everything you need to know before joining Matariki III. Work through
            each section at your own pace and mark topics as read to track your progress. The Safety
            section is the most important — please read it first if you are short on time.
          </p>
        </div>

        {/* ── Section grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sections.map((section, i) => (
            <SectionCard key={section.id} section={section} index={i} />
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="mt-12 pt-8 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            Matariki III · MMSI 512004962 · Call sign ZMG 3118 · Auckland, New Zealand
          </p>
        </div>
      </div>
    </div>
  );
}

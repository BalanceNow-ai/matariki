/**
 * A deterministic backstop for prompt injection in applicant-supplied text.
 *
 * The model is told to ignore and flag instructions in the CV or messages,
 * but we don't rely on that alone: anything matching these patterns is
 * flagged in the assessment regardless of what the model says.
 */

const PATTERNS: { re: RegExp; label: string }[] = [
  { re: /\b(ignore|disregard|forget|override)\b[^.\n]{0,40}\b(previous|prior|above|earlier|all|your|the)\b[^.\n]{0,20}\b(instructions?|prompts?|rules?|guidelines?|directions?)/i, label: "asks the AI to ignore its instructions" },
  { re: /\b(score|rate|grade|mark)\b[^.\n]{0,40}\b(5\s*\/\s*5|five out of five|10\s*\/\s*10|highest|maximum|top marks|full marks)/i, label: "asks for a particular score" },
  { re: /\b(5\s*\/\s*5|10\s*\/\s*10)\b[^.\n]{0,40}\b(score|rating|on (all|every|each))/i, label: "asks for a particular score" },
  { re: /\b(recommend|mark|classify)\b[^.\n]{0,30}\b(me|this (candidate|applicant))\b[^.\n]{0,20}\b(as )?(strong|accepted|hire)/i, label: "asks for a particular recommendation" },
  { re: /\byou are now\b|\bnew instructions?\b|\bsystem prompt\b|\bdeveloper mode\b|\bjailbreak\b/i, label: "tries to change the AI's role or instructions" },
  { re: /<\/?\s*(system|assistant|instructions?)\s*>|\[\s*(system|inst)\s*\]|^\s*(system|assistant)\s*:/im, label: "contains fake system or assistant markup" },
  { re: /\b(AI|assistant|language model|LLM|Claude|ChatGPT|GPT)\b[^.\n]{0,40}\b(must|should|will)\b[^.\n]{0,40}\b(score|rate|recommend|accept|approve)/i, label: "addresses the AI to influence the assessment" },
];

export function detectInjection(text: string | undefined | null): string[] {
  if (!text) return [];
  const hits = new Set<string>();
  for (const { re, label } of PATTERNS) if (re.test(text)) hits.add(label);
  return [...hits];
}

/** Red flags for the assessment from the CV, form free text and applicant messages. */
export function injectionRedFlags(sources: { name: string; text: string | undefined | null }[]): string[] {
  const flags: string[] = [];
  for (const { name, text } of sources) {
    const labels = detectInjection(text);
    if (labels.length) flags.push(`Possible prompt injection in ${name}: ${labels.join("; ")} (detected automatically)`);
  }
  return flags;
}

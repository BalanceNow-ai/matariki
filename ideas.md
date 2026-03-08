# Matariki Crew Prep Site — Design Brainstorm

## Response 1
<response>
<text>
**Design Movement:** Nautical Modernism — inspired by Admiralty charts, naval architecture drawings, and the clean precision of offshore sailing instruments.

**Core Principles:**
- Deep navy and charcoal as the dominant palette, with brass/gold accents evoking deck hardware
- Monospaced type for data/specs, a strong serif for headings, clean sans-serif for body
- Grid-based layout with strong vertical rhythm, like a well-organised chart table
- Crisp, high-contrast UI with no decorative excess — every element earns its place

**Color Philosophy:** The sea at night — deep navy (#0a1628), charcoal (#1c2b3a), warm brass (#c9a84c), and clean white text. Danger/warning in amber. Safety in a muted teal.

**Layout Paradigm:** Left sidebar with section navigation (persistent on desktop, drawer on mobile). Main content area with generous margins. Section headers use a full-width band with the section title in large serif type.

**Signature Elements:**
- Thin horizontal rule lines between sections, like chart graticules
- Section icons drawn in a fine-line nautical style
- Progress tracker styled as a voyage log with tick marks

**Interaction Philosophy:** Deliberate and calm. No flashy animations. Smooth accordion reveals for content. Bookmarks feel like placing a physical marker.

**Animation:** Subtle fade-in on section entry. Accordion opens with a 200ms ease. Bookmark toggle with a small scale pulse.

**Typography System:** Headings in Playfair Display (serif, authoritative). Body in Source Sans 3 (clean, readable). Data/specs in JetBrains Mono (monospaced, precise).
</text>
<probability>0.08</probability>
</response>

## Response 2
<response>
<text>
**Design Movement:** Pacific Cruising Log — warm, tactile, like a well-worn sailing journal with handwritten notes and watercolour washes.

**Core Principles:**
- Warm off-white paper tones with ink-blue text
- Organic, slightly imperfect layout with generous whitespace
- Content feels like it was written for you personally, not printed from a manual
- Sections feel like chapters in a voyage log

**Color Philosophy:** Aged paper (#f5f0e8), ink blue (#1a3a5c), sea glass teal (#4a9b8e), and rust red for warnings. Warm and human.

**Layout Paradigm:** Single-column narrative layout with a sticky top nav. Wide margins with pull-quotes. No sidebar — content flows like a document.

**Signature Elements:**
- Watercolour-style section dividers
- Handwritten-style callout boxes for key rules
- Anchor icon as a bookmark marker

**Interaction Philosophy:** Reading-focused. Smooth scroll. Bookmarks feel like dog-earing a page.

**Animation:** Gentle page-turn feel on section transitions. Soft fade on content load.

**Typography System:** Headings in Lora (warm serif). Body in Nunito (friendly, rounded sans). Callouts in a display script.
</text>
<probability>0.06</probability>
</response>

## Response 3
<response>
<text>
**Design Movement:** Offshore Operations Dashboard — clean, functional, safety-critical UI inspired by marine electronics displays and professional vessel management systems.

**Core Principles:**
- Dark theme with high-contrast text — optimised for reading in any light condition
- Five sections presented as distinct "modules" with clear visual separation
- Progress and completion tracking front and centre — crew can see what they've read
- Mobile-first — this will be read on phones in a marina

**Color Philosophy:** Dark slate (#0f1923), section-coded accent colours (teal for welcome, blue for sailing, indigo for offshore, red/amber for safety, green for packing), white text. Each section has its own identity colour.

**Layout Paradigm:** Top navigation bar with section tabs (colour-coded). Content in a wide, readable column with a floating progress indicator. Sticky section header shows current section name and progress.

**Signature Elements:**
- Colour-coded section badges
- Checklist-style progress tracking with localStorage persistence
- "Mark as read" button on each topic card

**Interaction Philosophy:** Task-completion oriented. Crew work through the guide methodically. Progress is saved and visible.

**Animation:** Section tab transitions with a slide. Completion checkmarks animate in. Progress bar fills smoothly.

**Typography System:** Headings in Space Grotesk (geometric, modern, technical). Body in Inter (clean, functional). Monospaced for procedures and checklists.
</text>
<probability>0.09</probability>
</response>

---

## Selected Design: Response 3 — Offshore Operations Dashboard

**Rationale:** This is a safety-critical crew preparation document. The design should prioritise readability, clarity, and task completion over aesthetics. The dark theme works in all lighting conditions (marina, cockpit, below decks). The colour-coded sections make navigation instant. The progress tracking gives crew a clear sense of what they have and haven't read — which matters for safety. The mobile-first approach is essential as most crew will read this on their phones.

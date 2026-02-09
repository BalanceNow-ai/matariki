"use client";

export function ExpeditionSchedule() {
  const scheduleHtml = `
<style>
  .expedition-schedule {
    --deep-ocean: #0a1628;
    --midnight-blue: #162742;
    --slate-water: #1e3a5f;
    --storm-grey: #4a6274;
    --mist: #8fa3b3;
    --salt-white: #f7f9fb;
    --copper-accent: #c17f59;
    --copper-light: #d4a574;
    --sea-green: #3d7a6e;
    --kelp: #2E5A3A;
    --stewart: #6B4A8C;
    --rating-a: #3d7a6e;
    --rating-a-bg: rgba(61, 122, 110, 0.15);
    --rating-b: #5a8a5e;
    --rating-b-bg: rgba(90, 138, 94, 0.15);
    --rating-c: #8B7D3C;
    --rating-c-bg: rgba(139, 125, 60, 0.15);
    --rating-d: #8B5A5A;
    --rating-d-bg: rgba(139, 90, 90, 0.15);
    --accent-hunt: #a67c52;
    --accent-dive: #5a7a9a;
    --accent-fish: #5a8a6e;
  }

  .expedition-schedule * { margin: 0; padding: 0; box-sizing: border-box; }

  .expedition-schedule {
    font-family: 'DM Sans', system-ui, sans-serif;
    background: transparent;
    color: var(--mist);
    line-height: 1.6;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0;
  }

  .expedition-schedule .header {
    text-align: center;
    margin-bottom: 2.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid rgba(255,255,255,0.1);
  }

  .expedition-schedule .header-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--copper-accent);
    margin-bottom: 0.75rem;
  }

  .expedition-schedule .header h2 {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 2rem;
    font-weight: 400;
    color: var(--salt-white);
    line-height: 1.2;
    margin-bottom: 0.5rem;
  }

  .expedition-schedule .header h2 em {
    font-style: italic;
    color: var(--copper-accent);
  }

  .expedition-schedule .header .subtitle {
    font-size: 1rem;
    color: var(--mist);
    font-weight: 300;
  }

  .expedition-schedule .route-summary {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin: 1.5rem 0 0;
    flex-wrap: wrap;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 0.05em;
    color: var(--mist);
    opacity: 0.7;
  }

  .expedition-schedule .route-summary .arrow {
    color: var(--copper-accent);
    font-size: 0.65rem;
  }

  .expedition-schedule .route-summary .stewart-leg {
    color: var(--stewart);
    opacity: 1;
    font-weight: 500;
  }

  .expedition-schedule .intro {
    max-width: 780px;
    margin: 0 auto 2rem;
    font-size: 1rem;
    line-height: 1.75;
    color: var(--mist);
  }

  .expedition-schedule .intro p {
    margin-bottom: 1rem;
  }

  .expedition-schedule .legend {
    display: flex;
    justify-content: center;
    gap: 2rem;
    margin-bottom: 2rem;
    flex-wrap: wrap;
  }

  .expedition-schedule .legend-group {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--salt-white);
  }

  .expedition-schedule .legend-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    display: inline-block;
  }

  .expedition-schedule .legend-dot.hunt { background: var(--accent-hunt); }
  .expedition-schedule .legend-dot.dive { background: var(--accent-dive); }
  .expedition-schedule .legend-dot.fish { background: var(--accent-fish); }

  .expedition-schedule .section-divider {
    text-align: center;
    margin: 2rem 0 1.5rem;
    position: relative;
  }

  .expedition-schedule .section-divider::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 50%;
    height: 1px;
    background: rgba(255,255,255,0.1);
  }

  .expedition-schedule .section-divider span {
    position: relative;
    background: var(--deep-ocean);
    padding: 0 1.5rem;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--copper-accent);
  }

  .expedition-schedule .section-divider.stewart span {
    color: var(--stewart);
  }

  .expedition-schedule .schedule {
    display: flex;
    flex-direction: column;
    gap: 0;
    position: relative;
  }

  .expedition-schedule .schedule::before {
    content: '';
    position: absolute;
    left: 28px;
    top: 30px;
    bottom: 30px;
    width: 2px;
    background: linear-gradient(to bottom, var(--copper-accent), var(--sea-green), var(--stewart));
    opacity: 0.4;
  }

  .expedition-schedule .stop {
    display: grid;
    grid-template-columns: 56px 1fr;
    gap: 0;
    position: relative;
  }

  .expedition-schedule .timeline-node {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 1.8rem;
    position: relative;
    z-index: 2;
  }

  .expedition-schedule .node-dot {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: var(--slate-water);
    border: 3px solid var(--deep-ocean);
    box-shadow: 0 0 0 1px var(--copper-accent);
  }

  .expedition-schedule .stop.major .node-dot {
    width: 18px;
    height: 18px;
    background: var(--sea-green);
    box-shadow: 0 0 0 2px var(--sea-green), 0 0 0 5px rgba(61, 122, 110, 0.2);
  }

  .expedition-schedule .stop.stewart .node-dot {
    background: var(--stewart);
    box-shadow: 0 0 0 1px var(--stewart);
  }

  .expedition-schedule .stop.stewart.major .node-dot {
    width: 18px;
    height: 18px;
    background: var(--stewart);
    box-shadow: 0 0 0 2px var(--stewart), 0 0 0 5px rgba(107, 74, 140, 0.2);
  }

  .expedition-schedule .node-num {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    color: var(--storm-grey);
    margin-top: 0.3rem;
  }

  .expedition-schedule .stop.stewart .node-num {
    color: var(--stewart);
  }

  .expedition-schedule .exp-card {
    background: rgba(22, 39, 66, 0.5);
    border-radius: 12px;
    padding: 1.4rem 1.6rem;
    margin: 0.5rem 0;
    border: 1px solid rgba(255,255,255,0.08);
    transition: all 0.3s ease;
  }

  .expedition-schedule .exp-card:hover {
    border-color: var(--copper-accent);
    transform: translateY(-2px);
  }

  .expedition-schedule .stop.major .exp-card {
    border-left: 3px solid var(--sea-green);
    background: rgba(22, 39, 66, 0.7);
  }

  .expedition-schedule .stop.stewart .exp-card {
    border: 1px solid rgba(107, 74, 140, 0.2);
  }

  .expedition-schedule .stop.stewart.major .exp-card {
    border-left: 3px solid var(--stewart);
    background: rgba(30, 25, 45, 0.5);
  }

  .expedition-schedule .card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .expedition-schedule .card-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--salt-white);
    line-height: 1.3;
  }

  .expedition-schedule .card-title .maori-name {
    font-weight: 400;
    font-style: italic;
    color: var(--copper-accent);
    font-size: 1.1rem;
  }

  .expedition-schedule .stop.stewart .card-title .maori-name {
    color: var(--stewart);
  }

  .expedition-schedule .card-meta {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    flex-shrink: 0;
  }

  .expedition-schedule .meta-badge {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    padding: 0.25rem 0.65rem;
    border-radius: 20px;
    letter-spacing: 0.03em;
  }

  .expedition-schedule .badge-dates {
    background: rgba(255,255,255,0.08);
    color: var(--mist);
  }

  .expedition-schedule .badge-days {
    background: var(--copper-accent);
    color: var(--deep-ocean);
    font-weight: 600;
  }

  .expedition-schedule .stop.major .badge-days {
    background: var(--sea-green);
    color: white;
  }

  .expedition-schedule .stop.stewart .badge-days {
    background: var(--stewart);
    color: white;
  }

  .expedition-schedule .ratings {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .expedition-schedule .rating-group {
    padding: 0.7rem 0.9rem;
    border-radius: 8px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.05);
  }

  .expedition-schedule .rating-group-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .expedition-schedule .rating-group.hunt .rating-group-label { color: var(--accent-hunt); }
  .expedition-schedule .rating-group.dive .rating-group-label { color: var(--accent-dive); }
  .expedition-schedule .rating-group.fish .rating-group-label { color: var(--accent-fish); }

  .expedition-schedule .rating-items {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .expedition-schedule .rating-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.8rem;
  }

  .expedition-schedule .rating-item .label {
    color: var(--mist);
    font-size: 0.75rem;
  }

  .expedition-schedule .rating-pill {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.7rem;
    font-weight: 600;
    padding: 0.1rem 0.45rem;
    border-radius: 4px;
    letter-spacing: 0.02em;
  }

  .expedition-schedule .rating-pill.a  { background: var(--rating-a-bg); color: var(--rating-a); }
  .expedition-schedule .rating-pill.b  { background: var(--rating-b-bg); color: var(--rating-b); }
  .expedition-schedule .rating-pill.c  { background: var(--rating-c-bg); color: var(--rating-c); }
  .expedition-schedule .rating-pill.d  { background: var(--rating-d-bg); color: var(--rating-d); }

  .expedition-schedule .card-description {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--mist);
  }

  .expedition-schedule .highlight-tag {
    display: inline-block;
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    margin-right: 0.3rem;
    vertical-align: middle;
  }

  .expedition-schedule .highlight-tag.primary {
    background: var(--sea-green);
    color: white;
  }

  .expedition-schedule .highlight-tag.secondary {
    background: var(--copper-accent);
    color: var(--deep-ocean);
  }

  .expedition-schedule .highlight-tag.stewart {
    background: var(--stewart);
    color: white;
  }

  .expedition-schedule .passage-note {
    text-align: center;
    padding: 1.5rem 0;
    position: relative;
    grid-column: 1 / -1;
  }

  .expedition-schedule .passage-note-inner {
    font-family: 'JetBrains Mono', monospace;
    font-size: 0.72rem;
    letter-spacing: 0.05em;
    color: var(--copper-accent);
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .expedition-schedule .passage-note-inner .passage-line {
    width: 40px;
    height: 1px;
    background: var(--copper-accent);
    opacity: 0.4;
  }

  @media (max-width: 768px) {
    .expedition-schedule .header h2 { font-size: 1.5rem; }
    .expedition-schedule .ratings { grid-template-columns: 1fr; gap: 0.5rem; }
    .expedition-schedule .exp-card { padding: 1rem; }
    .expedition-schedule .card-title { font-size: 1.15rem; }
    .expedition-schedule .card-meta { width: 100%; justify-content: flex-start; }
    .expedition-schedule .schedule::before { left: 20px; }
    .expedition-schedule .stop { grid-template-columns: 40px 1fr; }
    .expedition-schedule .legend { gap: 1rem; }
  }
</style>

<div class="expedition-schedule">
  <header class="header">
    <div class="header-label">Expedition Plan — Season 2026</div>
    <h2>Hunting, Diving &amp; Fishing Aboard <em>Matariki III</em></h2>
    <div class="subtitle">9 weeks through New Zealand's wildest coastline — Milford Sound to Stewart Island</div>
    <div class="route-summary">
      <span>Milford</span><span class="arrow">→</span>
      <span>George</span><span class="arrow">→</span>
      <span>Charles</span><span class="arrow">→</span>
      <span>Doubtful</span><span class="arrow">→</span>
      <span>Breaksea</span><span class="arrow">→</span>
      <span>Dusky</span><span class="arrow">→</span>
      <span>Chalky</span><span class="arrow">→</span>
      <span>Preservation</span><span class="arrow">→</span>
      <span class="stewart-leg">Paterson Inlet</span><span class="arrow">→</span>
      <span class="stewart-leg">Port Pegasus</span>
    </div>
  </header>

  <div class="intro">
    <p>The plan is simple: arrive at Milford Sound in late February, then work south through every major fiord to Preservation Inlet, timing the journey so we hit the deepest, most remote country just as the red deer roar reaches full intensity in late March. Then cross Foveaux Strait to Stewart Island for two weeks of whitetail hunting, world-class paua and crayfish diving, and some of the best blue cod fishing in the country.</p>
    <p>Every stop is assessed for three things — deer hunting, paua and crayfish diving, and fishing — because this trip has to deliver on all three. The further south we push, the better it gets.</p>
  </div>

  <div class="legend">
    <div class="legend-group"><span class="legend-dot hunt"></span> Hunting</div>
    <div class="legend-group"><span class="legend-dot dive"></span> Diving</div>
    <div class="legend-group"><span class="legend-dot fish"></span> Fishing</div>
  </div>

  <div class="section-divider"><span>Fiordland — 7 Weeks</span></div>

  <div class="schedule">
    <div class="stop">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">01</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Milford Sound <span class="maori-name">Piopiotahi</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~20–21 Feb</span>
            <span class="meta-badge badge-days">1–2 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill d">D</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill b">B+</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill c">C+</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill b">B</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill c">C+</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          Resupply and staging point. Not a hunting stop — steep terrain and heavy tourist traffic. If the weather's calm on arrival, the Dale Point and St Anne Point reefs are worth a dive for crayfish before heading south. Don't linger.
        </div>
      </div>
    </div>

    <div class="stop">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">02</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">George Sound <span class="maori-name">Kaipo</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~22–24 Feb</span>
            <span class="meta-badge badge-days">2–3 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill b">B+</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill c">C+</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill c">C</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill b">B</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill c">C</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag secondary">HUNTING FOCUS</span> The George River flats are the best open hunting country between Milford and Doubtful — genuine glassing and stalking terrain. Pre-roar, so expect dawn and dusk feeding on the flats with stags still in velvet. Moderate hunting pressure from track access. Diving is outer coast only and weather-dependent. Sandflies are biblical.
        </div>
      </div>
    </div>

    <div class="stop">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">03</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Charles Sound <span class="maori-name">Te Rā</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~25–27 Feb</span>
            <span class="meta-badge badge-days">2–3 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill b">B+</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill c">C</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill c">C</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill b">B</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill c">C</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag secondary">HUNTING FOCUS</span> Less hunting pressure than George — boat access only means the deer are less educated. Emelius Arm has workable river flats and bush-edge hunting. The Nancy Sound passage makes a good combo hunt-and-fish day by tender. Multiple arms give options when weather shifts. Diving is weak — outer coast only with an exposed entrance.
        </div>
      </div>
    </div>

    <div class="stop">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">04</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Doubtful Sound <span class="maori-name">Patea</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~28 Feb – 3 Mar</span>
            <span class="meta-badge badge-days">3–4 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill c">C+</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill b">B+</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill b">B</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill b">B+</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill b">B</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag secondary">DIVING FOCUS</span> The diving highlight of the northern fiords. The massive freshwater discharge from the Manapouri tailrace creates a deep water emergence effect — black coral, brachiopods, and tube anemones at diveable depths. The Shelter Islands and Nee Islets partially break the swell, making this the most reliable crayfish diving north of Breaksea. Hunting is the weakest of the major fiords due to steep terrain, but Secretary Island's eastern side and Crooked Arm produce deer.
        </div>
      </div>
    </div>

    <div class="stop">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">05</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Breaksea Sound <span class="maori-name">Te Puaitaha</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~4–7 Mar</span>
            <span class="meta-badge badge-days">3–4 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill b">B+</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill a">A-</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill b">B+</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill a">A-</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill b">B+</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          The first genuine all-rounder on the route. Less freshwater input than most fiords means better salinity at the entrance — and better conditions for paua and crayfish. The entrance island reef systems are some of the most extensive and productive fishing structure in Fiordland. The roar is building now. Good deer numbers in the Wet Jacket Arm valleys with less hunting pressure than the northern fiords.
        </div>
      </div>
    </div>

    <div class="stop major">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">06</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Dusky Sound <span class="maori-name">Tamatea</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~8–20 Mar</span>
            <span class="meta-badge badge-days">10–12 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill a">A</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill a">A</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill a">A-</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill a">A</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill a">A-</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag primary">MAIN BASE</span> This is where everything comes together. Arriving as the roar kicks off, with multiple river flat systems — Supper Cove, Luncheon Cove, the Seaforth flats — all accessible by tender for classic stag hunting. Resolution Island and Five Fingers Peninsula create a layered dive system that works in any weather: outer coast for big crayfish and paua on calm days, Cascade Cove on moderate days, Acheron Passage when it's blown out. The fishing around Five Fingers and the entrance reefs is the best on the Fiordland coast. Enough anchorages to move with the weather. Plan to spend the most time here.
        </div>
      </div>
    </div>

    <div class="stop">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">07</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Chalky Inlet <span class="maori-name">Te Houhou</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~21–23 Mar</span>
            <span class="meta-badge badge-days">2–3 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill b">B+</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill b">B+</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill b">B</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill b">B+</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill b">B</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          The roar is in full swing. Good deer with light pressure around North Port and the inner bays — wapiti range is nearby, so wapiti-cross animals are possible. Entrance headland reefs hold reliable crayfish on calm days. A solid stepping stone between Dusky and Preservation.
        </div>
      </div>
    </div>

    <div class="stop major">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">08</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Preservation Inlet <span class="maori-name">Rakituma</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~24 Mar – 2 Apr</span>
            <span class="meta-badge badge-days">7–10 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Deer</span><span class="rating-pill a">A</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill a">A+</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill a">A+</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill a">A</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill a">A</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag primary">FIORDLAND FINALE</span> The best paua and crayfish diving on the Fiordland coast — the Puysegur Point reef systems are fully oceanic, remote, and virtually undived. Big crayfish and the best paua density on the coast. Peak roar with total isolation: virtually zero other hunters, and the open coastal bush gives the easiest stalking terrain of any fiord. Coal Island and the inlet entrance headlands provide layered dive options for rougher days. Kisbee Bay is a superb base anchorage. Extend here if weather delivers calm windows for the Puysegur reefs.
        </div>
      </div>
    </div>

    <div class="passage-note">
      <div class="passage-note-inner">
        <span class="passage-line"></span>
        Foveaux Strait crossing — ~60 NM to Stewart Island
        <span class="passage-line"></span>
      </div>
    </div>
  </div>

  <div class="section-divider stewart"><span>Stewart Island / Rakiura — 2 Weeks</span></div>

  <div class="schedule">
    <div class="stop stewart">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">09</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Paterson Inlet <span class="maori-name">Whaka ā Te Wera</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~4–8 Apr</span>
            <span class="meta-badge badge-days">4–5 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Whitetail</span><span class="rating-pill a">A</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill a">A</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill a">A</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill a">A+</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill a">A-</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag stewart">NEW SPECIES</span> A different world after Fiordland. Resupply at Halfmoon Bay, then base in the vast sheltered waters of Paterson Inlet. This is whitetail deer country — a completely different hunt to the red deer roar. Still-hunt the coastal bush edges and small clearings from the tender. The paua and crayfish diving steps up immediately — cleaner oceanic water, better reef habitat, and legal-sized paua are far more common than in the fiords. Blue cod fishing is outstanding throughout the inlet and on the outer reefs. Multiple sheltered anchorages in the inner arms — Prices Inlet, Kaipipi Bay, and Native Island area.
        </div>
      </div>
    </div>

    <div class="stop stewart major">
      <div class="timeline-node"><div class="node-dot"></div><div class="node-num">10</div></div>
      <div class="exp-card">
        <div class="card-top">
          <div class="card-title">Port Pegasus <span class="maori-name">Piki Hatiti</span></div>
          <div class="card-meta">
            <span class="meta-badge badge-dates">~9–18 Apr</span>
            <span class="meta-badge badge-days">8–10 days</span>
          </div>
        </div>
        <div class="ratings">
          <div class="rating-group hunt">
            <div class="rating-group-label">Hunting</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Whitetail</span><span class="rating-pill a">A+</span></div>
            </div>
          </div>
          <div class="rating-group dive">
            <div class="rating-group-label">Diving</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Crays</span><span class="rating-pill a">A+</span></div>
              <div class="rating-item"><span class="label">Paua</span><span class="rating-pill a">A+</span></div>
            </div>
          </div>
          <div class="rating-group fish">
            <div class="rating-group-label">Fishing</div>
            <div class="rating-items">
              <div class="rating-item"><span class="label">Cod</span><span class="rating-pill a">A+</span></div>
              <div class="rating-item"><span class="label">Groper</span><span class="rating-pill a">A</span></div>
            </div>
          </div>
        </div>
        <div class="card-description">
          <span class="highlight-tag stewart">EXPEDITION FINALE</span> The most remote anchorage in New Zealand. Port Pegasus is a vast natural harbour on Stewart Island's southern coast — almost nobody goes here by yacht. The whitetail hunting is the best in the country: virtually unhunted coastal bush with deer feeding on the shoreline at dawn and dusk. The diving is exceptional — fully oceanic reefs with big crayfish and dense paua populations on the outer coast and around the harbour entrance. Blue cod are enormous and abundant. The harbour itself is well-sheltered with multiple anchorage options in the inner arms — North Arm, South Arm, and behind the islands. This is where the entire expedition reaches its crescendo: the most remote, the most productive, and the most unforgettable.
        </div>
      </div>
    </div>
  </div>
</div>
`;

  return (
    <div dangerouslySetInnerHTML={{ __html: scheduleHtml }} />
  );
}

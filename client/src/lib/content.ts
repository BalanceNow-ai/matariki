/* ============================================================
   MATARIKI III — CREW PREPARATION GUIDE
   Content data — sourced from:
     - WelcomeAboard.docx
     - MatarikiOperatingManual.docx
     - MatarikiSafetyManual.docx
     - oyster_crew_resources.md (external resources)
   ============================================================ */

export type TopicItem = {
  id: string;
  title: string;
  content: string; // markdown-compatible rich text
  type?: "info" | "warning" | "procedure" | "checklist";
};

export type Section = {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  colorClass: string;
  accentVar: string;
  icon: string;
  heroImage?: string;
  topics: TopicItem[];
};

export const sections: Section[] = [
  // ─────────────────────────────────────────────────────────
  // 1. WELCOME TO MATARIKI
  // ─────────────────────────────────────────────────────────
  {
    id: "welcome",
    slug: "welcome",
    title: "Welcome to Matariki",
    subtitle: "The boat, the crew, and how we operate",
    colorClass: "section-welcome",
    accentVar: "var(--section-welcome)",
    icon: "⚓",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/98435114/83bumnWMKEggvxgpnFgoSR/matariki-cockpit-JvYeQYLAs9Um4BLBp7KAe7.webp",
    topics: [
      {
        id: "w1",
        title: "About Matariki III",
        type: "info",
        content: `Matariki III is an **Oyster 68** — a world-class bluewater cruising yacht built in the UK by Oyster Marine. She is 68 feet (approximately 20.7 m) on deck, displaces around 30 tonnes, and is designed for extended offshore passages in comfort and safety.

**Key particulars:**
- **Vessel name:** Matariki III
- **Port of registry:** Auckland, New Zealand
- **MMSI:** 512004962
- **Call sign:** ZMG 3118
- **Engine:** Perkins Sabre 1006 M225Ti diesel
- **Rig:** Sloop with furling mainsail and furling yankee headsail

The Oyster 68 is a proven bluewater passage-maker. She carries a full suite of offshore safety and navigation equipment, a watermaker, generator, satellite communications, SSB radio, and a dive compressor. She is a serious offshore yacht — not a day-sailor.`,
      },
      {
        id: "w2",
        title: "The Skipper and Crew Culture",
        type: "info",
        content: `**The skipper's word is final.** All standing procedures in this guide can be overridden by the skipper at any time. If you are ever unsure about anything — ask. There are no stupid questions on a boat.

**Key principles:**
- Safety is non-negotiable. We follow the PFD and harness policy without exception.
- We look after each other. If you are tired, say so. If something doesn't look right, say so.
- Tidiness is a safety issue, not just housekeeping. A loose rope or an unsecured item can injure someone.
- Galley duties, watch-keeping, and general boat work are shared equally.
- The skipper can be overruled only under unanimous consent of all crew if deemed unfit to make decisions.

**If in doubt — ask.** This is the most important rule on the boat.`,
      },
      {
        id: "w3",
        title: "Life Aboard — Day to Day",
        type: "info",
        content: `Living aboard a sailing yacht is different from any other accommodation. Space is limited, motion is constant at sea, and everything has a place.

**Bunks and storage:**
- All crew are allocated a bunk and a locker for their gear.
- When sailing offshore, share the best bunks (aft cabin) and use leeward-side bunks when heeled.
- Keep your bunk area tidy. Stow gear in your locker, not on the bunk.

**Galley and meals:**
- Galley duties are shared. Wash dishes immediately or put them in the washing bucket — never leave them loose in the cockpit.
- No one operates the stove without thorough instruction first.
- Gas is turned off at the panel by the stove whenever the stove is not in use.

**Water:**
- Fresh water is precious. Always check taps are fully off after use — showers and the vacuum head especially.
- The watermaker produces approximately 30 GPH (gallons per hour) when running.

**Wet gear:**
- All wet clothing goes in the workshop / port head shower. Not in the main cabin.

**Portholes and hatches:**
- All portholes must be locked shut at sea or in inclement weather.
- Hatches are closed before departure and whenever conditions deteriorate.`,
      },
      {
        id: "w4",
        title: "Training Requirements",
        type: "procedure",
        content: `Before you are considered competent to be left in charge of a watch, you must be able to demonstrate the following. Don't worry — the skipper will walk you through all of this before you are asked to do it alone.

**All crew must:**
- Read this guide
- Locate and describe usage of all firefighting equipment
- Locate PFDs and safety harnesses and describe the policy
- Locate all lifesaving equipment
- Describe the man overboard procedure

**Before taking charge of a watch:**
- Start and stop the main engine
- Start and stop the generator and bring it on/off load
- Monitor and manage the battery systems
- Use the chart plotter, radar, and autopilot
- Read the depth sounder and understand the keel offset
- Locate and describe each sea cock
- Furl and unfurl the sails
- Conduct a MOB (man overboard) exercise while in charge
- Locate abandon-ship equipment and describe the procedure`,
      },
      {
        id: "w5",
        title: "Key Contacts",
        type: "info",
        content: `**Emergency contacts:**
- **Rescue Coordination Centre NZ:** +64 4 577 8030 *(use this from satellite phone — you cannot call 111 from a sat phone)*
- **Russell Radio:** +64 9 403 7218 | VHF Ch 63 | 0800–2000 NZST
- **Maritime Radio (ZLM):** VHF Ch 16 / SSB 2182 kHz

**Shore contacts:**
- **Pauline Harris:** +64 21 476 230
- **Brent Harris:** +64 21 026 75193
- **Engineer (Jamie Campbell):** +64 21 138 1036
- **Electronics (Dave):** +64 21 635 038

**Satellite phone:**
- **Main sat phone number:** 008816 5141 6787
- **Grab bag sat phone:** 008816 3166 9177

**Weather:**
- Bob McDavitt: bob@metbob.com
- MetService Tasman: metservice.com/maps-radar/maps/tasman-sea-nz
- Windy: windyty.com`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 2. GENERAL SAILING
  // ─────────────────────────────────────────────────────────
  {
    id: "sailing",
    slug: "sailing",
    title: "General Sailing",
    subtitle: "How to sail Matariki — coastal and multi-day passages",
    colorClass: "section-sailing",
    accentVar: "var(--section-sailing)",
    icon: "⛵",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/98435114/83bumnWMKEggvxgpnFgoSR/matariki-hero-M9jbNUNLFopv65zkM23JkL.webp",
    topics: [
      {
        id: "s1",
        title: "Sail Handling Overview",
        type: "info",
        content: `Matariki III has electric winches and furling sails, which makes sail handling much easier than on a traditional yacht. However, the power involved means you must understand the systems before using them.

**Furling sails:**
- The mainsail and yankee headsail are both furling — they roll up rather than being dropped.
- Furling is controlled by buttons at the helm station and by the electric winches.
- **Never open a jammer (rope clutch) without at least two turns of rope on the winch drum.** Releasing a loaded rope without turns on the winch can cause a runaway sheet — a serious injury risk.

**Electric winches:**
- The electric winches are powerful. Keep fingers and clothing clear of the drum and rope at all times.
- Halyards (ropes that hoist sails) are led to the winches at the mast and at the helm.
- The winch controls are at the helm station.

**Preventor:**
- When sailing downwind, a preventor line is rigged from the boom to the bow to prevent an accidental gybe (the boom swinging violently across the boat).
- **Never run more than 150° to the wind in strong conditions or rough seas without a preventor rigged.**

**Reefing:**
- Reef the mainsail (reduce its size) when the wind increases. The rule is: reef down for night sailing unless the skipper agrees otherwise.
- The skipper must be called when a reef is needed.`,
      },
      {
        id: "s2",
        title: "Tacking and Gybing",
        type: "procedure",
        content: `**Tacking** (turning the bow through the wind):
1. Helmsperson calls "Ready to tack"
2. Crew confirm "Ready"
3. Helmsperson calls "Tacking" and turns the wheel
4. The headsail sheet on the old side is eased as the bow comes through the wind
5. The new sheet is taken up on the winch and trimmed in
6. Traveller is kept tight on both sides during the tack

**Gybing** (turning the stern through the wind — more powerful and potentially dangerous):
1. Rig the preventor before gybing if not already rigged
2. Helmsperson calls "Ready to gybe"
3. Crew confirm "Ready"
4. Helmsperson calls "Gybing" — the boom will swing across
5. Mainsheet is controlled through the gybe to prevent a crash gybe
6. **If there is any risk of a crash gybe, reduce or eliminate the mainsail first**
7. A person must be at the helm in rough weather during a gybe — do not rely solely on the autopilot

**Gennaker (asymmetric spinnaker):**
- The gennaker is a large downwind sail. Its procedure is more complex — the skipper will brief you before use.`,
      },
      {
        id: "s3",
        title: "Watchkeeping",
        type: "procedure",
        content: `On any passage of more than a few hours, Matariki operates a formal watch system. This ensures the boat is always monitored and that all crew get adequate rest.

**Watch handover checklist:**
Before handing over the watch, brief the incoming watch captain on:
- All vessels in visual sight, on AIS, and on radar
- Course to steer and autopilot settings
- Sail trim
- Wind speed and direction trends
- Wave size and direction trends
- Any anticipated weather changes during the watch
- Nearest hazards and expected closest approach time
- Expected time of landfall

**During a watch — every 15 minutes:**
- Scan the horizon with stabilised binoculars
- Check chart plotter and radar for contacts
- Use radar to check for approaching weather
- Confirm course made good aligns with course to steer
- Check sail trim

**Before sunset (within one hour):**
- Turn on navigation lights
- Complete visual inspection of rigging and sails
- Check the tender is secure

**After sunrise (within one hour):**
- Turn off navigation lights
- Complete the daily underway checklist

**Only the watch captain adjusts the chart plotter and autopilot settings.** Incorrect changes can put the boat at serious risk.`,
      },
      {
        id: "s4",
        title: "Navigation Basics",
        type: "info",
        content: `Matariki carries a full suite of navigation electronics. You don't need to be an expert, but you should understand the basics.

**Chart plotter:** The primary navigation instrument. Shows the boat's position on an electronic chart, along with AIS targets (other vessels broadcasting their position), waypoints, and routes. The chart plotter is at the helm station and at the nav station below.

**Radar:** Used to detect other vessels, land, and weather. Guard zones can be set to alert the watch if a target enters a defined area. Check the radar for approaching weather squalls regularly.

**Autopilot:** Matariki has an autopilot that steers the boat to a set compass course or to a wind angle. The autopilot does not avoid other vessels — the watch must still maintain a proper lookout at all times.

**AIS (Automatic Identification System):** Most commercial vessels broadcast their name, position, speed, and course via AIS. This appears on the chart plotter. However, not all vessels have AIS — fishing boats and small craft often do not.

**Depth sounder:** Shows the depth of water under the keel. Be aware of the keel offset — the sounder reads from the transducer, not from the bottom of the keel.

**Collision regulations (COLREGS):** You must understand the basic rules of the road at sea. Key points: a vessel under sail generally has right of way over a vessel under power; but a large ship in a narrow channel cannot manoeuvre — give it a wide berth regardless.`,
      },
      {
        id: "s5",
        title: "Engine and Motoring",
        type: "procedure",
        content: `The main engine is a **Perkins Sabre 1006 M225Ti** diesel. It is used for manoeuvring in harbour, in light winds, and as a backup.

**Before starting the engine:**
- Check engine coolant level
- Check engine oil level
- Visually inspect for oil leaks
- Check the Racor fuel filters (primary filters) for cleanliness and water
- Check fuel level

**Feathering the propeller when stopping the engine under sail:**
The propeller is a folding/feathering type. To feather it correctly:
1. Maintain boat speed of approximately 3 knots (not slower than 2, not faster than 4)
2. Kill the engine while still engaged in **forward** gear
3. If the shaft is still spinning after the engine stops, engage **reverse** briefly to stop it
4. Check by taking the engine out of gear — if the shaft freewheels, the prop has not feathered; repeat the process

**Important:** Do not kill the engine while in reverse — the blades will lock in the reverse position and will not feather.

**Standing procedure:** Use the engine when boat speed falls below 5.5 knots.`,
      },
      {
        id: "s6",
        title: "Anchoring",
        type: "procedure",
        content: `Matariki anchors using an electric windlass (anchor winch) at the bow.

**Dropping anchor:**
1. Remove the chain from the gypsy (the notched wheel that grips the chain) and pull out about a metre of chain before re-engaging
2. Use the **down** switch to lower the anchor
3. In deep water the chain may run fast — it will stop when you release the switch
4. Use the **up** switch momentarily to slow a fast-running chain
5. **Always use the snub** — a short length of rope or chain that takes the load off the windlass once anchored

**Weighing anchor (pulling up):**
- Use the windlass **up** switch
- Guide the chain into the chain locker as it comes aboard
- Wash the chain and anchor with the deck hose as it comes up

**Bow thruster:**
- Matariki has a bow thruster for manoeuvring in tight spaces
- It is controlled from the helm station
- Use it to assist with coming alongside and anchoring in a cross-wind`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 3. OFFSHORE / INTERNATIONAL PASSAGES
  // ─────────────────────────────────────────────────────────
  {
    id: "offshore",
    slug: "offshore",
    title: "Offshore Passages",
    subtitle: "Multi-day and international passage-making",
    colorClass: "section-offshore",
    accentVar: "var(--section-offshore)",
    icon: "🌐",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/98435114/83bumnWMKEggvxgpnFgoSR/matariki-hero-M9jbNUNLFopv65zkM23JkL.webp",
    topics: [
      {
        id: "o1",
        title: "What Makes Offshore Different",
        type: "info",
        content: `Offshore sailing — passages out of sight of land, lasting multiple days — is a fundamentally different experience from coastal sailing. Understanding the differences will help you prepare mentally and physically.

**Distance from help:** Once offshore, you are on your own. The nearest assistance may be hours or days away. This is why we prepare thoroughly, maintain equipment rigorously, and follow safety procedures without exception.

**Watch systems:** You will stand watches around the clock. A typical watch system on Matariki is 3 hours on, 6 hours off, or as agreed with the skipper. Getting adequate rest is a safety issue — a tired crew member makes poor decisions.

**Seasickness:** Many people experience seasickness on their first offshore passage, even experienced sailors in new conditions. It typically passes after 24–48 hours. See the "What to Bring" section for medication advice.

**Weather:** Offshore weather can change rapidly. The skipper monitors weather forecasts continuously. You will learn to read the sky and the barometer as part of your watch duties.

**Self-sufficiency:** Everything needed for the passage must be aboard before departure. There are no shops at sea. Fuel, water, food, spare parts, and medical supplies must all be planned for.`,
      },
      {
        id: "o2",
        title: "Trip Reports and Radio Schedules",
        type: "procedure",
        content: `**Filing a trip report (TR):**
Before any coastal or offshore passage, a trip report is filed with Coastguard or Maritime Radio. This ensures someone ashore knows where we are going and when to expect us.

**Opening a TR on VHF:**
1. Call: *"Coastguard Radio, Coastguard Radio, Coastguard Radio — this is Matariki 3, Zulu Mike Golf 3118, for a trip report — over"*
2. After acknowledgement: *"Coastguard Radio, this is Matariki 3 — departing [port], destination [port], ETA [date/time], [number] persons on board — over"*

**Closing a TR on arrival:**
1. Call: *"Coastguard Radio, Coastguard Radio, Coastguard Radio — this is Matariki 3, Zulu Mike Golf 3118, to close a trip report — over"*
2. After acknowledgement: *"Coastguard Radio, this is Matariki 3 — we have arrived at [port], we'd like to close our trip report — over"*

**SSB radio schedules:**
- Gulf Harbour Radio (GHR) provides weather analysis for South Pacific yachts: 8752 kHz and 8779 kHz, Monday–Friday 1915 UTC (0715 NZST), 1 May to 25 November
- Taupo Maritime Radio (ZLM) broadcasts coastal and oceanic weather on a regular schedule — see the SSB frequency table in the Safety section`,
      },
      {
        id: "o3",
        title: "Weather Routing and Forecasting",
        type: "info",
        content: `Weather is the most important factor in offshore passage planning. Matariki uses several sources:

**Primary sources:**
- **Bob McDavitt** (bob@metbob.com) — New Zealand's leading marine weather router. Provides personalised passage forecasts.
- **MetService NZ** — metservice.com/maps-radar/maps/tasman-sea-nz
- **Windy** — windyty.com (excellent visual wind forecasting)
- **BOM Australia** — bom.gov.au/australia/charts (for Tasman and Pacific passages)

**Getting weather at sea:**
Matariki uses **UUPlus** software with the SSB radio or Iridium satellite modem to receive GRIB weather files (gridded forecast data) at sea. The files are then displayed in **Expedition** navigation software.

**GRIB file process:**
1. In UUPlus: Utilities → Web Fetch → select or set up a grid → tick "Send request to SailDocs"
2. Send the request via Iridium satellite
3. Wait a few minutes, then send/receive again to collect the GRIB file
4. Save the file to Expedition for display

**Key weather concepts for crew:**
- **Barometer:** A falling barometer indicates deteriorating weather. A rapid fall (more than 3 hPa in 3 hours) means a front is approaching.
- **Wind shifts:** A backing wind (shifting anticlockwise) often precedes a front. A veering wind (shifting clockwise) follows a front in the Southern Hemisphere.
- **Squalls:** Dark, low cloud with a sharp line at the base. Reduce sail before they arrive.`,
      },
      {
        id: "o4",
        title: "Calling the Skipper",
        type: "warning",
        content: `The skipper needs adequate rest to make good decisions. However, there are specific situations where the skipper **must** be called immediately, regardless of the time:

- We appear to be on a **collision course** with another vessel
- We are within **5 nautical miles of landfall**
- We need to **reef the sails**
- The wind significantly **changes direction**, increases in strength, or the sea state increases
- Any **emergency**: MOB, flooding, fire, collision
- Any **failure of navigation or safety systems**
- Any **failure of major onboard systems** (e.g. generator not starting)

**When in doubt — call the skipper.** It is far better to wake the skipper unnecessarily than to handle a developing situation alone.`,
      },
      {
        id: "o5",
        title: "Satellite Communications",
        type: "info",
        content: `Matariki carries two Iridium satellite phones for communications when out of VHF range.

**Main sat phone:** 008816 5141 6787
**Grab bag sat phone:** 008816 3166 9177

**To call a NZ number from the sat phone:**
Dial 0064 + area code (without the leading zero) + number. Example: to call a Wellington 04 number, dial 0064 4 XXX XXXX.

**Emergency calls from sat phone:**
You cannot call 111 from a satellite phone. In an emergency, call the **Rescue Coordination Centre: 0064 4 577 8030**. This number is programmed into the phone.

**SMS to sat phone:**
Anyone can send a free SMS to the sat phone via email: 8816XXXXXXXX@msg.iridium.com (replace with the relevant number).

**Email at sea:**
Matariki uses UUPlus with the Iridium satellite connection to send and receive email at sea. The boat email address is matariki3@uuplus.net.`,
      },
      {
        id: "o6",
        title: "Standing Procedures for Offshore",
        type: "procedure",
        content: `These procedures apply on all offshore passages unless the skipper directs otherwise:

- All sea cocks noted in the sea cock plan to be **closed** when offshore
- All gas to be turned off at the panel by the stove
- No sleeping on watch — if tired, swap shifts in consultation with the skipper
- **Visual, radar, and AIS check every 10 minutes** (or every 15 minutes as per the watch checklist)
- Engine to be used when boat speed falls below **5.5 knots**
- Second sat phone (in waterproof container) to live in the **grab bag**
- Grab bag to live in the **cockpit** when sailing offshore
- Reef down for night sailing unless the skipper agrees otherwise
- **Skipper has final call** unless deemed unfit for making decisions under unanimous consent of crew`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 4. SAFETY SYSTEMS AND PROCEDURES
  // ─────────────────────────────────────────────────────────
  {
    id: "safety",
    slug: "safety",
    title: "Safety Systems",
    subtitle: "Equipment, procedures, and emergency response",
    colorClass: "section-safety",
    accentVar: "var(--section-safety)",
    icon: "🛡️",
    heroImage: "https://d2xsxph8kpxj0f.cloudfront.net/98435114/83bumnWMKEggvxgpnFgoSR/matariki-safety-UGt6DpG8ummvm7EJa7QHux.webp",
    topics: [
      {
        id: "sf1",
        title: "PFD and Safety Harness Policy",
        type: "warning",
        content: `This policy is **non-negotiable**. It applies to all crew at all times.

**PFDs (lifejackets) must be worn:**
- At all times when on watch at night (half an hour before sunset to sunrise)
- Any time when out of the cockpit when under sail
- At all times when on deck (including in the cockpit) when true wind is **20 knots or more**
- In any emergency

**Safety harnesses must be used:**
- Always when on deck and true wind is **20 knots or more**
- Half an hour before sunset until daybreak
- When in the cockpit **by yourself**
- When out of the cockpit — use **two tethers** (clip one before unclipping the other)

**Before departing dock:**
- Collect your numbered PFD and ensure it is correctly adjusted
- Keep your lifejacket within arm's reach when sleeping

**AIS personal locators:** Personal AIS beacons are worn by watch crew. These transmit your position if you go overboard.

**No one on the foredeck unless two people are on deck** (day and night).`,
      },
      {
        id: "sf2",
        title: "Man Overboard (MOB)",
        type: "procedure",
        content: `A man overboard is the most critical emergency on a sailing yacht. Every crew member must know this procedure.

**Immediate actions:**
1. **Shout "Man Overboard!"** loudly to get all crew on deck
2. **Press the MOB button on the GPS** — this marks the position immediately
3. **Establish a dedicated watch person** who does nothing but point at the person in the water — do not lose sight of them
4. **Do not throw anything that could injure the person** — throw the life ring and danbuoy

**Returning to the person:**
- The skipper will take the helm and execute the recovery manoeuvre
- In most conditions, Matariki will use the **Quick Stop** manoeuvre: immediately tack, then gybe back to the person
- Keep the watch person pointing at the MOB at all times

**Recovery:**
- Approach from downwind/downsea
- Stop the boat alongside the person
- Use the swim ladder, a line, or the boom to get them back aboard
- Be aware that a person in the water may be hypothermic and unable to help themselves

**After recovery:**
- Treat for hypothermia: get them below, remove wet clothing, warm slowly
- Assess for injuries
- Call the skipper if not already on deck`,
      },
      {
        id: "sf3",
        title: "Fire Procedures",
        type: "procedure",
        content: `**General fire procedure:**
1. Raise the alarm: shout **"Fire, Fire, Fire — fire in the [location]"**
2. Once at least one other crew member is alerted, collect the nearest appropriate extinguisher or fire blanket and attempt to extinguish
3. If extinguished: assess vessel status and take appropriate action
4. If unable to extinguish: at skipper's instruction, make a **Mayday call**, activate the **EPIRB**, and prepare to deploy the life raft

**Engine room fire:**
- There is a **manual fire suppression system** activated from the workshop compartment
- Shut off fuel supply to the main engine if possible
- Shut down engine room blowers
- **Do not open access panels fully** — open only enough to fight the fire
- Only activate the suppression system on the skipper's orders — it may cause permanent loss of propulsion

**Generator fire:**
- There is an **automatic fire suppression system** in the generator compartment
- Shut off fuel supply to the generator if possible
- Shut down engine room blowers

**Galley fire:**
- Use the **fire blanket** to smother a cooking oil fire
- Turn off the heat source if safe to do so — **never move a container with burning liquid**
- Place the blanket gently over the pan to smother — leave until completely cool

**Extinguisher locations:** The skipper will show you all extinguisher locations during your familiarisation. Know where they are before you need them.`,
      },
      {
        id: "sf4",
        title: "Flooding Procedures",
        type: "procedure",
        content: `**Automatic bilge pumps:**
- Two Rule 3700 GPH automatic bilge pumps are in the bilges
- The bilge pump circuit breaker must always be **ON** and switches set to **AUTO**
- Float switches activate the pumps automatically; a second set of float switches triggers an audible bilge alarm

**If the bilge alarm sounds:**
1. **Stay calm. Work through the checklist swiftly but systematically.**
2. Get crew on deck in life jackets with the grab bag; prepare to abandon ship
3. Assign crew to issue a Pan Pan by DSC
4. Shut down the main engine if possible
5. Turn large bilge pump and engine room pump to manual ON
6. Check pumps for clogging
7. Check for hull breach (collision or grounding?) — if found, deploy the spare mainsail around the outside of the hull to stem the breach
8. Check engine room: shaft seal, exhausts, raw water lines and strainers
9. Shut off engine room sea cocks except generator intake
10. Deploy crash pump if needed
11. Systematically work through all sea cocks, checking each one

**Sea bungs and wooden plugs** are carried for emergency hull sealing. Dive equipment and a torch are available for underwater inspection.`,
      },
      {
        id: "sf5",
        title: "Mayday and Distress Calls",
        type: "procedure",
        content: `**Mayday** is used only when a ship or person is in **grave and imminent danger** requiring immediate assistance.

**Mayday call format (VHF Ch 16 or SSB):**
1. *"Mayday, Mayday, Mayday"*
2. *"This is Matariki 3, Matariki 3, Matariki 3 — Zulu Mike Golf 3118"*
3. *"Mayday Matariki 3 — Zulu Mike Golf 3118"*
4. *"Our position is [lat/long or landmark]"*
5. *"Nature of distress: [describe]"*
6. *"Assistance required: [describe]"*
7. *"[Number] persons on board"*
8. *"Action being taken: [describe]"*
9. *"Vessel description: 68-foot Oyster yacht, white hull. EPIRB activated. AIS active."*
10. *"Over"*

Wait for a reply. If no reply, repeat. Offshore: work through distress frequencies from low to high.

**Pan Pan** (urgency, not immediate danger):
- Same format but begin with *"Pan Pan, Pan Pan, Pan Pan — All Stations"*

**SSB emergency channels:** Start with Channel 3 (6215 kHz), then Channel 2 (4125 kHz), then Channel 4 (8219 kHz).

**Mayday must be cancelled once the situation is resolved.**`,
      },
      {
        id: "sf6",
        title: "Abandon Ship",
        type: "procedure",
        content: `Abandoning ship is the last resort. The rule is: **never leave the boat until the boat leaves you.** A yacht is a better life raft than a life raft.

**Abandon ship sequence:**
1. Skipper gives the order to abandon ship
2. Make a Mayday call and activate the EPIRB
3. All crew put on lifejackets and immersion suits if available
4. Collect the grab bag (lives in the cockpit offshore)
5. Deploy the life raft — pull the painter (activation cord) firmly until the raft inflates
6. Board the life raft — try to step into it, not into the water
7. Cut the painter once all crew are aboard and the raft is clear of the vessel

**Grab bag contents:**
- Second satellite phone (in waterproof container)
- Flares
- EPIRB (if not already activated)
- Water and emergency rations
- First aid kit
- Handheld VHF radio

**Setting off flares:**
- Read and understand the instructions on each flare before you need to use them
- The skipper and crew will discuss before setting off flares
- Know where all flares are stored (grab bag)`,
      },
      {
        id: "sf7",
        title: "Pre-Sailing Checklist",
        type: "checklist",
        content: `Complete this checklist before every departure.

**On deck:**
- [ ] Tender secure
- [ ] All electronics operational
- [ ] Autopilot operational
- [ ] Windlass (anchor winch) operational
- [ ] Main furler operating
- [ ] Yankee furler operating
- [ ] Electric winches operating
- [ ] Visual inspection of all sheets (ropes)
- [ ] Steering wheel full range port and starboard
- [ ] Bow thruster operational
- [ ] Bimini clears open
- [ ] Communication headsets operational
- [ ] Wheel cover removed and stowed
- [ ] Electronics covers removed
- [ ] Hydraulic backstays pumped up
- [ ] Shore power disconnected
- [ ] Flag flying

**Below deck:**
- [ ] Bilge pump operations checked
- [ ] Electronics turned on
- [ ] Forepeak secured
- [ ] Port cabin secured
- [ ] Guest cabin secured
- [ ] Saloon secured
- [ ] Workshop secured
- [ ] Galley secured
- [ ] Aft cabin secured
- [ ] All hatches shut
- [ ] All portholes closed

**Mechanical:**
- [ ] Engine coolant level checked
- [ ] Engine oil level checked
- [ ] Engine visually inspected for oil leaks
- [ ] Racor fuel filters checked (cleanliness and water)
- [ ] Fuel level checked — main tank
- [ ] Water level checked — main tank
- [ ] Generator started and confirmed charging correctly`,
      },
      {
        id: "sf8",
        title: "SSB Radio Frequencies",
        type: "info",
        content: `**Pre-programmed SSB channels on Matariki:**

| Ch | Name | Frequency | Purpose |
|---|---|---|---|
| 1 | TMR-2182 | 2182 kHz | Emergency / Distress |
| 2 | TMR-4125 | 4125 kHz | Emergency / Distress |
| 3 | TMR-6215 | 6215 kHz | Emergency / Distress |
| 4 | TMR-8219 | 8219 kHz | Emergency / Distress |
| 5 | TMR-12290 | 12290 kHz | Emergency / Distress |
| 6 | TMR-16420 | 16420 kHz | Emergency / Distress |
| 7 | GHR-8752 | 8752 kHz | Gulf Harbour Radio — weather |
| 8 | GHR-8779 | 8779 kHz | Gulf Harbour Radio — weather |
| 10 | TMR-6224 | 6224 kHz | Oceanic weather / coastal |
| 11 | TMR-12356 | 12356 kHz | Oceanic weather |
| 14 | TMR-2207 | 2207 kHz | Coastal warnings and reports |

**To operate the SSB:**
1. Power ON
2. Select channel number
3. Press ENTER
4. Press TUNE
5. Press transmit button on microphone

**In an emergency:** Start with Channel 3 (6215 kHz), then Channel 2, then Channel 4.`,
      },
    ],
  },

  // ─────────────────────────────────────────────────────────
  // 5. WHAT TO BRING
  // ─────────────────────────────────────────────────────────
  {
    id: "packing",
    slug: "packing",
    title: "What to Bring",
    subtitle: "How to pack well for coastal and offshore sailing",
    colorClass: "section-packing",
    accentVar: "var(--section-packing)",
    icon: "🎒",
    topics: [
      {
        id: "p1",
        title: "The Golden Rule: Pack Light",
        type: "info",
        content: `Storage space on a yacht is limited. Every item you bring must earn its place. The most common mistake new crew make is over-packing.

**Soft bags only.** Hard suitcases cannot be stowed on a yacht. Use a soft duffel bag or a sailing kit bag. A 60–80 litre soft bag is ideal for a week-long passage.

**Think in layers.** The temperature and conditions can change dramatically at sea. A system of thin layers is far more versatile than a few thick garments.

**Damp is normal.** Even in fine weather, things get damp at sea. Pack clothes you don't mind getting salt on. Leave anything precious ashore.`,
      },
      {
        id: "p2",
        title: "Clothing — Coastal Sailing",
        type: "info",
        content: `For coastal passages (day sails and overnight coastal legs):

**Essential:**
- **Offshore jacket and trousers (foul weather gear):** This is the most important item. Breathable, waterproof sailing gear — Henri Lloyd, Musto, or similar. Borrow or hire if you don't own a set.
- **Warm mid-layer:** A fleece or merino wool top. Even in summer, nights at sea are cold.
- **Base layers:** Merino wool or synthetic — not cotton. Cotton stays wet and gets cold.
- **Soft-soled deck shoes or sea boots:** Non-marking soles. No hard-soled shoes on deck.
- **Hat and gloves:** Even in summer.
- **Sunglasses and sunscreen:** The glare off the water is intense.
- **Shorts and t-shirts:** For warm days in harbour.

**Footwear note:** Hard-soled shoes are not permitted on deck. Bring soft-soled sailing shoes (Dubarry, Gill, Musto) or rubber-soled sea boots.`,
      },
      {
        id: "p3",
        title: "Clothing — Offshore Passages",
        type: "info",
        content: `For offshore passages (multi-day, out of sight of land), add the following to your coastal kit:

**Additional essentials:**
- **Offshore-rated foul weather gear (Category 2 or higher):** Coastal gear is not sufficient for offshore conditions.
- **Thermal base layers:** Multiple sets — you will be wearing them for days.
- **Warm hat that covers the ears:** Nights offshore can be very cold even in the tropics.
- **Gloves:** Both light sailing gloves (for handling ropes) and warm gloves for night watches.
- **Sea boots:** Ankle-height at minimum; knee-high boots are better for heavy weather.
- **Harness and tether:** Matariki has harnesses aboard, but if you own your own, bring it.
- **Personal AIS beacon:** Matariki has these aboard, but if you own one, bring it.

**Offshore clothing philosophy:** You will be wearing the same clothes for multiple days. Merino wool is ideal — it doesn't smell after extended wear and keeps you warm even when damp. Pack enough for 3–4 days of watch-keeping, plus spares.`,
      },
      {
        id: "p4",
        title: "Personal Safety and Medical",
        type: "warning",
        content: `**Seasickness medication:**
Seasickness is common on the first 24–48 hours of a passage. Discuss medication with your doctor before the trip. Common options include:
- **Stugeron (cinnarizine):** Widely used by offshore sailors. Take the night before departure.
- **Scopoderm patch:** Prescription-only in NZ. Very effective but can cause drowsiness.
- **Kwells (hyoscine):** Available over the counter. Take before symptoms start.

**Start medication before you feel sick.** Once you are vomiting, oral medication is ineffective.

**Personal medications:**
- Bring all prescription medications in their original packaging with enough supply for the passage plus a buffer
- Store medications in a waterproof bag
- Inform the skipper of any medications you are taking, especially those that cause drowsiness

**First aid:**
Matariki carries a comprehensive first aid kit. If you have specific medical needs or allergies, discuss them with the skipper before departure.

**Dental:** Get any dental issues sorted before a long passage. Toothache at sea is miserable and there is no dentist.`,
      },
      {
        id: "p5",
        title: "Electronics and Personal Gear",
        type: "info",
        content: `**Electronics:**
- **Mobile phone:** Useful in harbour but useless offshore. Download offline charts (Navionics, Garmin ActiveCaptain) before departure.
- **Waterproof phone case:** Essential. Phones and salt water do not mix.
- **Headtorch:** A red-light headtorch is ideal for night watches — it preserves night vision.
- **Personal VHF radio:** Not essential but useful. Matariki has handheld VHFs aboard.
- **E-reader or tablet:** Loaded with books for downtime. Keep in a waterproof bag.
- **Power bank:** Charging opportunities may be limited. Bring a large power bank.

**Personal items:**
- **Sunscreen (SPF 50+):** Apply before going on deck, even on cloudy days.
- **Lip balm with SPF:** Wind and sun crack lips quickly at sea.
- **Insect repellent:** For anchorages in warm climates.
- **Earplugs:** The boat makes noise at sea. Earplugs help you sleep on your off-watch.
- **Seasickness bands:** Some people find acupressure wristbands helpful.
- **Small dry bag:** For keeping personal items dry in the cockpit.

**What to leave ashore:**
- Hard luggage
- Anything irreplaceable or valuable
- Excessive amounts of clothing
- Strong perfume or aftershave (makes seasickness worse)`,
      },
      {
        id: "p6",
        title: "Documents and Administration",
        type: "info",
        content: `**For any passage:**
- **Passport:** Required for international passages. Keep it in a waterproof bag.
- **Travel insurance:** Ensure your policy covers sailing and offshore activities. Many standard travel policies exclude sailing.
- **Any relevant certifications:** If you hold an RYA or equivalent certificate, bring it.

**For international passages:**
- Passport must be valid for at least 6 months beyond the planned return date
- Check visa requirements for all ports of call well in advance
- Matariki will handle customs and immigration clearance — the skipper will brief you on the process

**Health:**
- Ensure vaccinations are up to date for all countries being visited
- Carry a copy of any prescriptions for medications you are carrying
- Travel health insurance that covers medical evacuation is strongly recommended for offshore passages`,
      },
      {
        id: "p7",
        title: "Recommended Pre-Reading",
        type: "info",
        content: `The following resources are recommended for new crew. You don't need to read all of them — but the more you know before you arrive, the more you will enjoy the experience.

**Online courses:**
- **NauticEd Qualified Crew Member** (nauticed.org) — approximately 7 hours, covers everything from terminology to emergencies. ~USD 38.

**Free reading:**
- **CCA: Advice to a First Time Offshore Sailor** — written specifically for someone joining a large offshore yacht
- **59° North: What to Expect Offshore** — honest, practical crew briefing from professional offshore sailors
- **Morgan's Cloud: 36 Immutable Rules of Seamanship** — essential reading on the mindset of offshore sailing

**Terminology:**
- **Grenada Bluewater Sailing Glossary** — so you can understand instructions from day one

**Podcast:**
- **On the Wind Podcast** — the definitive offshore sailing podcast. Listen to a few episodes before joining.

**About the Oyster 68:**
- Visit oysteryachts.com and search for the Oyster 68 — there are videos and specifications that will help you understand the boat you'll be sailing.`,
      },
    ],
  },
  // ─────────────────────────────────────────────────────────
  // 6. RESOURCES
  // ─────────────────────────────────────────────────────────
  {
    id: "resources",
    slug: "resources",
    title: "Resources",
    subtitle: "Recommended reading, courses, and tools for new crew",
    colorClass: "section-resources",
    accentVar: "var(--section-resources)",
    icon: "📚",
    topics: [
      {
        id: "r1",
        title: "NauticEd — Qualified Crew Member Course",
        type: "info",
        content: `The single best structured preparation for someone joining an offshore yacht for the first time.

**What it covers:** Sailing terminology, sail trim, navigation basics, weather, safety, man overboard, anchoring, and emergency procedures. Approximately 7 hours of self-paced online learning.

**Cost:** Approximately USD 38

**Link:** [nauticed.org/sailing-courses/view/qualified-crew-member](https://www.nauticed.org/sailing-courses/view/qualified-crew-member)

**Why it matters for Matariki:** The course is written for exactly this scenario — someone joining a serious offshore yacht without prior sailing experience. It uses the same terminology you will hear on board and covers the same procedures we follow. If you only do one thing from this list, do this.`,
      },
      {
        id: "r2",
        title: "CCA — Advice to a First Time Offshore Sailor",
        type: "info",
        content: `A superb, concise article written by the Cruising Club of America specifically for someone joining a large offshore yacht for the first time.

**What it covers:** What to expect offshore, watch-keeping, seasickness, safety harness policy, the importance of rest, and the culture of offshore sailing.

**Cost:** Free

**Link:** [cruisingclub.org/article/advice-first-time-offshore-sailor](https://cruisingclub.org/article/advice-first-time-offshore-sailor)

**Why it matters for Matariki:** Written from the perspective of the skipper — it explains exactly what the skipper needs from you and why. Reading this before you arrive will make you a better crew member from day one.`,
      },
      {
        id: "r3",
        title: "59° North — What to Expect Offshore",
        type: "info",
        content: `59° North is a professional offshore sailing operation that takes paying crew on ocean passages. Their crew briefing is one of the most honest and practical documents available for new offshore crew.

**What it covers:** Watch systems, seasickness, sleep deprivation, heavy weather, the emotional arc of a long passage, and how to be a good crew member.

**Cost:** Free

**Link:** [59-north.com/what-to-expect](https://59-north.com/what-to-expect)

**Why it matters for Matariki:** 59° North sails the same kind of boat in the same kind of conditions. Their advice is direct and unvarnished — exactly what you need before your first offshore passage.`,
      },
      {
        id: "r4",
        title: "Morgan's Cloud — 36 Immutable Rules of Seamanship",
        type: "info",
        content: `John Harries and Phyllis Nickel have sailed their boat Morgan's Cloud to some of the most remote places on earth. Their "36 Immutable Rules" is essential reading on the mindset and culture of offshore sailing.

**What it covers:** The philosophy of seamanship — conservatism, preparation, respect for the sea, and the importance of never cutting corners.

**Cost:** Free

**Link:** [morganscloud.com/2014/02/04/john-phyllis-33-immutable-rules-of-seamanship](https://www.morganscloud.com/2014/02/04/john-phyllis-33-immutable-rules-of-seamanship/)

**Why it matters for Matariki:** The rules articulate the culture we try to maintain on board. Reading them will help you understand why we do things the way we do.`,
      },
      {
        id: "r5",
        title: "Yachting World — Offshore Skills: Get Ready for Bluewater",
        type: "info",
        content: `A practical guide from Yachting World magazine on the skills and knowledge required for bluewater offshore sailing.

**What it covers:** Navigation, weather, sail handling, safety equipment, provisioning, and the differences between coastal and offshore sailing.

**Cost:** Free

**Link:** [yachtingworld.com/cruising/get-set-for-bluewater-131405](https://www.yachtingworld.com/cruising/get-set-for-bluewater-131405)

**Why it matters for Matariki:** Helps you prioritise what to learn and why it matters. A good overview of the skills you will develop over time on board.`,
      },
      {
        id: "r6",
        title: "RYA — Getting Started in Sailing",
        type: "info",
        content: `The Royal Yachting Association (RYA) is the world's leading sailing training organisation. Their "Getting Started" pathway is the gold standard for new sailors.

**What it covers:** An overview of the RYA training pathway from complete beginner to offshore skipper, with links to courses worldwide.

**Cost:** Free (overview); courses vary in cost

**Link:** [rya.org.uk/get-started](https://www.rya.org.uk/get-started/)

**Why it matters for Matariki:** If you want to develop your sailing beyond this trip, the RYA pathway is the clearest route. The Day Skipper course is an excellent next step after your first offshore passage.`,
      },
      {
        id: "r7",
        title: "Sailing Terminology Glossary",
        type: "info",
        content: `Sailing has its own vocabulary. Understanding the terminology before you arrive means you can act on instructions immediately rather than asking for clarification at a critical moment.

**Key terms to know before joining:**
- **Bow / Stern** — front / back of the boat
- **Port / Starboard** — left / right when facing forward
- **Windward / Leeward** — toward / away from the wind
- **Tack** — turn the bow through the wind
- **Gybe** — turn the stern through the wind
- **Sheet** — rope that controls a sail
- **Halyard** — rope that hoists a sail
- **Cleat** — fitting used to secure a rope
- **Jammer / Clutch** — device that locks a rope under load
- **Furling** — rolling up a sail
- **Reef** — reducing the size of a sail
- **Helm** — the steering wheel
- **Cockpit** — the outdoor seating area at the stern
- **Companionway** — the main entrance hatch from cockpit to cabin
- **Foredeck** — the deck area forward of the mast
- **Bilge** — the lowest part of the boat's interior
- **Keel** — the heavy fin below the hull that provides stability

**Link:** [cruisingworld.com/story/how-to/sailing-terms-glossary](https://www.cruisingworld.com/story/how-to/sailing-terms-glossary/)

**Cost:** Free`,
      },
      {
        id: "r8",
        title: "Oyster Yachts — About the Oyster 68",
        type: "info",
        content: `Matariki III is an Oyster 68. Understanding the boat you will be sailing — its layout, systems, and design philosophy — will help you feel at home more quickly.

**What to look at:**
- The Oyster 68 specification and layout on the Oyster website
- The Oyster YouTube channel — there are videos of the 68 being sailed and fitted out
- The Oyster Bluewater Academy — Oyster's own crew training programme

**Links:**
- [oysteryachts.com/heritage-yachts/oyster-hp68](https://oysteryachts.com/heritage-yachts/oyster-hp68/) — the Oyster 68 heritage page
- [youtube.com/@OysterYachts](https://www.youtube.com/@OysterYachts) — Oyster YouTube channel
- [oysteryachts.com/bluewater-academy](https://oysteryachts.com/bluewater-academy/) — Bluewater Academy

**Cost:** Free`,
      },
      {
        id: "r9",
        title: "On the Wind Podcast",
        type: "info",
        content: `The definitive offshore sailing podcast. Hosted by Andy Schell (who also runs 59° North), it features interviews with some of the world's best offshore sailors, covering everything from passage planning to heavy weather tactics to the culture of bluewater cruising.

**What to listen to first:**
- Any episode featuring a first-time offshore crew member
- Episodes on seasickness, watch systems, and heavy weather
- Episodes featuring Oyster or similar bluewater cruising yachts

**Link:** [onthewind.com](https://www.onthewind.com/) or search "On the Wind" in any podcast app

**Cost:** Free

**Why it matters for Matariki:** Listening to experienced offshore sailors talk about their passages is one of the best ways to absorb the culture and mindset of offshore sailing before you experience it yourself.`,
      },
      {
        id: "r10",
        title: "Windy — Weather Forecasting Tool",
        type: "info",
        content: `Windy is the best free weather visualisation tool available. It displays wind, waves, rain, and pressure on an animated map and is used by sailors worldwide for passage planning.

**How to use it:**
- Go to windy.com or download the Windy app
- Set the location to your departure port
- Switch between wind, waves, and pressure overlays
- Use the forecast timeline to see how conditions will develop

**Link:** [windy.com](https://www.windy.com/)

**Cost:** Free (premium version available)

**Why it matters for Matariki:** We use Windy for passage planning and you will hear it mentioned during weather briefings. Familiarising yourself with it before joining means you can follow the skipper's weather analysis and contribute to passage planning discussions.`,
      },
    ],
  },
];
export const totalTopics = sections.reduce((sum, s) => sum + s.topics.length, 0);

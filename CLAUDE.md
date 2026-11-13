# Naija Campus Life: Into the Wolves

Browser-based minimalist 3D life simulation and thriller set at Lion's Den University, a fictional Lagos campus. Learn. Hustle. Survive. One decision in Year One can still save or ruin the player in Year Four.

- Repo: https://github.com/kaliRoland/naijacampuslife
- Live site: https://naijacampuslife.com (Cloudflare Pages, auto-deploys from `main`)
- Owner: Roland (Evaluate Media). You are the main developer. Roland owns story decisions, testing, accounts and money.

## Source of truth

1. **This file** decides the architecture, tech stack, scope and build order. It does not change unless Roland says so.
2. **`docs/GDD_v2.pdf`** (Master Game Design Document, v2.0, 7 Nov 2026) is the expanded storyboard. It decides story, characters, missions, choices, systems and tone. Read the relevant section before building anything from it.
3. Where they conflict, this file wins. In particular the GDD recommends Unity or Godot and calls web "demo only". **Roland has decided to stay browser-based.** Do not move engines, and do not suggest it again unless asked.

GDD map: 3 world and districts; 4 characters; 5 Chairman and the String system; 6 Lady Cat; 7 the Slide (descent system); 8 Money Fork and wealth tiers; 9 campus conflict; 10-11 missions (first arc M-01 to M-08); 12 core systems; 13 decision variables and save state; 14 endings; 17 content rules.

## Tech stack (fixed)

| Layer | Choice |
|---|---|
| 3D engine | Three.js (JavaScript), bundled with Vite |
| Hosting | Cloudflare Pages |
| Database and logins | Supabase (from Week 4; the game must also work offline and local-first) |
| Code storage | GitHub |
| Art | Block-style / voxel-inspired low-poly, flat shaded, small texture atlases |

Plain JavaScript modules. No heavy frameworks. Keep dependencies small.

## Hard constraints

- **Phone first, browser first.** Must run on mid-range Android phones over mobile data. First load under 20-30MB. Touch and keyboard controls both required (left virtual stick to move, action button, contextual tap targets, phone menu; WASD, E to interact, Tab for phone). Installable as a PWA. Target 30 fps on a 3 GB RAM phone.
- **Art direction (from the GDD):** minimalist stylised 3D, block-based / voxel-inspired, non-graphic. Not photorealistic and not GTA-style. Do not use Minecraft assets, branding or distinctive designs. The realistic logo is for marketing only; in-game art stays blocky. If using free packs (Kenney, Quaternius, others with CC0 or CC-BY licences), choose ones that fit the blocky style and record every source and licence in `ASSETS.md`.
- **UI colours:** deep green (`#1B4332` / `#042F1B`; site theme `#0b3d2e`) and gold (`#C8993A`). Tagline in use: "Learn. Hustle. Survive." (the logo says "Learn, Grow. Survive."; this is a pending founder decision, do not change copy to match either until Roland decides).
- **Fictional everything.** People, brands, gangs and institutions are invented. No real names, logos or staff.
- **18+ content rules.** Mature themes (cult recruitment, extortion, exam malpractice, abuse of power, arrest) are delivered through dialogue, suspense, aftermath and systems, not gore. Cultism and crime are never glamorous and never instructional: no real-world how-to detail for violence, crime, evading police or hiding evidence. Evidence, heat, strings and arrests are abstract game states. Every character in romantic or mature content is 18 or older; romance is implied and off-screen. Lecturer-student interest is always shown as abuse of authority, never a romance route.
- **No secrets in the repo.** Keys and tokens go in `.env` (git-ignored).
- **Never** sell grades or guaranteed success. No loot boxes or paid random rewards.

## Architecture rules (from GDD section 15, adapted to the browser)

- **Event-driven modules.** A player action raises an event (for example `ItemPurchased`). Economy, inventory and relationship modules update state, the Slide module may queue an Invitation, the mission module checks triggers, the UI refreshes. **No module changes another module's data directly.**
- **Modules:** world and map; time and calendar; character AI (schedules, pathing, crowds); dialogue; mission and quest; decision state (PlayerState, choice log, delayed-effect scheduler); Slide and strings; conflict; academic; economy and business; inventory and evidence; relationship and reputation; police and legal; save/load; UI and input. Build only the modules the current stage needs, but keep these boundaries.
- **Data-driven content.** Missions, dialogue, choices, prices, character cards and thresholds live in JSON files under `src/data/` so Roland and writers can edit them without touching code. Dialogue supports English and Pidgin; Pidgin flavour lines are data, not code.
- **Every choice has three effects:** immediate, delayed and hidden (hidden = state variables such as `killer_respect`, `snitch`, `okoro_hostility`, `scam_risk`). Delayed effects go through the scheduler. Nothing resets; debts, records, grudges and evidence persist.
- **Fail-forward.** A failed check costs health or cash but never blocks the story.
- **Saves:** versioned save format with a checksum and autosave history. Local-first (device storage); Supabase cloud sync is added in Week 4 and must not be required to play.
- **Time:** 1 real minute = 20 in-game minutes (about 72 real minutes per game day); four phases: morning, afternoon, evening, night. Power cuts, fares and opening hours affect daily choices.
- **Tests:** automated tests for state transitions, save migration and (when built) Slide thresholds. Keep a short manual regression list per build.

## Characters and tone (summary; full cards in GDD section 4)

Protagonist: player-chosen name, suggested default **Tobi Adeyemi**, age 18, starts with **₦8,500**, plain outfit, neutral trust with everyone. Chairman (Obinna Adeleke) is the permanent villain. Lady Cat (Catherine Eze) is the greatest temptation; Nneka is the early money temptation. Others: Amara, Dr. Okoro, Mr. Salami, Killer, Razor, Inspector Danjuma, Comrade Femi. All adults. Pidgin and English code-switching is central; Nigerian writers will review dialogue.

## Build scope

**MVP = "The First Week at Lion's Den"** (45-60 minutes), built from the GDD first arc:
- Registration cutscene stub, then **M-01 The Bed** (hostel, Day 1, six choices, the `killer_respect` / `snitch` / `pride_contact` variables, "Welcome to Lion's Den. Trust nobody yet." cliffhanger).
- **M-02 New Faces** (cafeteria: Amara, Nneka, association, loneliness meter).
- **M-03 The Lecturer's Warning** (Dr. Okoro, GST101; attendance, assignments and GPA unlock).
- A stub of **M-04 Gone** (theft, clue system) and one small business if time allows; confirm with Roland before going further.
- Locations: Main Gate, Hostel Zone (corridor, room, warden's office), Cafeteria, one lecture hall, a slice of the Campus Market.
- Systems: phone UI (wallet, ledger, messages, timetable), time, wallet, inventory, relationship basics, branching dialogue, saves.

**Not yet (ask Roland before starting):** the full Slide system, Lady Cat arc, Chairman Move calendar, riots and gang war, vehicles, prison, multiplayer, Years 2-4, all 12+ endings. Rule: any new feature must name which stage it belongs to and which feature it delays.

**Never cut** (the product's identity): persistence, the dropout path, the Slide (when built), non-violent options, fail-forward.

## Timeline (browser build)

- **Week 1:** Vite and Three.js setup, auto-deploy, block-style gate and hostel corridor grey-box, walking and camera for touch and keyboard, phone UI with the wallet at ₦8,500 and the first message.
- **Week 2:** M-01 playable with all six choices, hidden variables and the day clock.
- **Week 3:** M-02, cafeteria, relationship basics, local saves. Roland has 3-5 people playtest.
- **Week 4:** M-03, academics, login and cloud saves (Supabase), first power cut, phone performance tuning.
- Later: M-04 and the market, launch polish, closed test with 20-50 students.

## How to work

- Plan first for anything bigger than a small fix, then build in small steps and run the game locally after each one.
- Commit small and often. Push to `main` only when the game runs; Cloudflare deploys from `main`.
- Roland tests on a real phone. His feedback is the priority.
- Roland is not a developer: explain plainly and say exactly what he needs to click or run.
- Ask before spending money, adding paid services, changing scope, or when the GDD and this file disagree in a way not covered above.

## Roland's tasks (not yours)

- Domain and DNS are done. Cloudflare Pages is connected to the repo.
- Put `GDD_v2.pdf` in the `docs/` folder.
- Create the Supabase project before Week 4.
- Final dialogue voice, phone testing, playtesters, Nigerian writers and sensitivity review.
- Founder decisions listed in GDD section 16 (tagline, protagonist gender, default name, pricing model, prison scope, and so on).

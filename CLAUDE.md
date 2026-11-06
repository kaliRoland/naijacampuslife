# Naija Campus Life: Into the Wolves

Browser-based 3D campus life simulator and thriller set at Lion's Den University, a fictional Lagos campus. Players balance money, grades, friendships and survival over four years (100 to 400 Level).

- Repo: https://github.com/kaliRoland/naijacampuslife
- Domain: naijacampuslife.com (registered via Truehost/NameSilo; DNS on Cloudflare, Free plan, active)
- Owner: Roland (Evaluate Media). You are the main developer. Roland owns the story, testing, accounts and decisions.

## Goal

Playable MVP, "The First Week at Lion's Den", about 45-60 minutes of play, by week 10. Public launch by week 14. Cash budget under $2,000.

## Tech stack

| Layer | Choice |
|---|---|
| 3D engine | Three.js (JavaScript), bundled with Vite |
| Hosting | Cloudflare Pages (auto-deploy from GitHub `main`) |
| Database and logins | Supabase (not needed until Week 4) |
| Art and sound | Free open-licence packs (Kenney, Quaternius, Poly Pizza); low-poly only |

## Hard constraints

- **Phone first.** Must run on mid-range Android phones over mobile data. First load under 20-30MB. Touch and keyboard controls both required. Installable to the home screen (PWA).
- **Low-poly art, compressed textures.** Test frame rate with throttling before calling a feature done.
- **Fictional brands, institutions and people only.** Parody brands to avoid legal issues.
- **Audience 18+.** Sensitive themes (scams, intimidation, misconduct) are allowed, but dangerous paths must never be required to succeed.
- **No secrets in the repo.** Supabase keys and any tokens go in environment variables (`.env`, git-ignored). Never commit them.
- **No loot boxes or paid random rewards. Never sell grades or guaranteed success.**
- Keep the codebase simple: plain JavaScript modules, no heavy frameworks, small dependencies.

## Art standards

- **Sources:** free, commercially usable packs only. Kenney.nl and Quaternius (both CC0). Poly Pizza only for models marked CC0 or CC-BY. No other sources without asking Roland.
- **Record everything:** every asset's source, author and licence goes in `ASSETS.md`, with attribution where the licence requires it. Read the licence on the pack's own page or `License.txt`; do not assume.
- **Format:** GLB (glTF), loaded with Three.js `GLTFLoader` through `src/game/assets.js`. Compress with meshopt (via `gltf-transform`). Textures 1024px or smaller.
- **Budget:** characters a few thousand triangles at most; props much less. Total first load stays under 20-30MB. Reuse and instance repeated models (trees, fences, kiosks): use `instanceModel()` for repeats.
- **Raw packs** live in `art-source/` (git-ignored). Only optimised files go in `public/models/`.
- **Never break the game:** if a model fails to load, keep the simple built-in version. Show loading progress on the landing page.
- **Performance:** must run smoothly on a mid-range Android phone. Check the build size, draw calls and frame rate (`?debug` in the URL) before calling art work done, and report the numbers.
- **Fiction only:** no real brand names, logos or signage on any model or texture. Signs are our own text banners.
- **Don't replace what has no good model:** if no pack has a fitting model (kiosk, fountain, bench), keep our own simple model rather than forcing a bad one.

## Core systems

1. **Wallet:** live balance on the in-game phone. Allowances, business profits and tips come in; fees, food, parties, scams and theft go out. Every transaction is logged with time, amount, reason and balance.
2. **Academics:** attendance, assignments, tests and exams combine into course grades and a cumulative record.
3. **Branching story:** choices shape relationships, reputation and which mystery clues the player uncovers. Dialogue is in English and Nigerian Pidgin.

Lagos feel (danfo buses, keke, okadas, POS stands, kiosks, NEPA power cuts, go-slow traffic) is gameplay, not just scenery.

## MVP scope (build only this)

- Story: simplified opening cinematic; Chapter 1 (registration and the accommodation scam); Chapter 2 (first lecture and surprise test); Chapter 3 (first business); ends on the unauthorised-withdrawal cliffhanger.
- Locations: main gate, hostel block and room, registration office, lecture hall, Lagos street (danfo stop, kiosks, POS stand).
- Phone UI: bank alerts, wallet, transaction history, messages, timetable.
- Systems: wallet, one course's academics, branching dialogue, day/night clock, transport choices, power cuts, logins and cloud saves.
- One business: business centre and printing shop.

Out of scope until after launch: cars, parties, fellowships, investment scheme, theft, years 2-4, full mystery, all seven endings, multiplayer. Do not build these unless Roland asks.

## Timeline

**Week 1: Setup and first playable (current)**
- Project setup with Vite and Three.js; automatic deployment via Cloudflare Pages.
- Grey-box main gate and bus arrival.
- Walking and camera controls for touch and keyboard.
- In-game phone interface with the first bank alert.
- Result: walk through the gate on naijacampuslife.com, receive the allowance, make the first choice.

**Week 2: Registration and spending.** Registration office and supplies kiosk; full wallet transaction history; branching dialogue in Pidgin and English.

**Week 3: Chapter One complete.** Hostel block, room and roommate; accommodation-scam storyline; "don't open the door" cliffhanger; day/night clock; saves on the device. Roland has 3-5 people playtest.

**Week 4: Accounts and the Lagos street.** Player login and cloud saves (Supabase); Lagos street with danfo stop, keke, kiosks and POS stand; transport costs; first NEPA power cut; speed tuning for low-end phones.

Weeks 5-6 academics; weeks 7-10 full MVP; weeks 11-14 sound, better models, closed test with 20-50 students, launch.

## Placeholders (Roland can change these)

- Starting allowance: ₦50,000.
- First choice at the gate: a simple two-option choice about the first spend or first move. Keep it in a data file so the text is easy to edit.
- Put all story text, prices and balances in separate data files (for example `src/data/`), not hard-coded in game logic, so Roland can edit dialogue and numbers without touching code.

## How to work

- Plan first for anything larger than a small fix, then build in small steps and run the game locally after each step.
- Commit small and often with clear messages. Push to `main` only when the game runs. Cloudflare Pages deploys from `main`.
- Roland tests on a real phone and reports back. Treat his feedback as the priority.
- Explain things plainly. Roland is not a developer; avoid jargon, and say exactly what he needs to click or run when something needs his hands (accounts, domain, deployments).
- Ask before spending money, adding paid services, or changing the scope above.

## Roland's tasks (not yours)

- Domain: done. DNS: done. Cloudflare account: done (email verification pending).
- Connect the GitHub repo to Cloudflare Pages, and add `naijacampuslife.com` as the custom domain, once the first build exists.
- Create the Supabase project before Week 4.
- Write and edit final dialogue, test on phones, recruit playtesters.

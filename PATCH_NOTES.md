# Space Loop Protocol - Patch Notes

## v0.3.3

### New Features
- **Dark Theme** — Added a dark theme option in settings. Choose between Default (space theme) and Dark themes.

### Improvements
- **Number Formatting** — Experience values now display in incremental game style: 1K, 1M, 1B, 1T instead of long numbers (1000+ becomes 1K).
- **Stat Display Redesign** — Stats now show in a more compact format with XP multiplier in the header and levels displayed inline with XP values.
- **Oxygen Precision** — When an activity completes mid-tick, the unused portion of that tick is now refunded back to oxygen (adjusted by efficiency bonuses). Previously, up to 0.1s of oxygen could be silently lost on each activity completion.

### Mobile UI Improvements
- **Settings Tab** — Added a dedicated 4th mobile tab (⚙️) for settings, replacing the fixed button approach. Settings are now accessible alongside Stats, Activities, and Automation tabs.
- **Automation Icon Update** — Changed automation emoji from ⚙️ to 🤖 to avoid confusion with settings.

### Inventory Improvements
- **Compact Grid Layout** — Inventory now uses a grid layout with scrolling instead of wrapping endlessly:
  - **Desktop**: 32x32px items, ~5 items per row, max height 130px
  - **Mobile**: 28x28px items, compact spacing, max height 70px
- **Prevents UI Overlap** — Items no longer overflow and cover other interface elements when you collect many permanent items.

### Bug Fixes
- **Automation Queue** — Fixed a bug where completing an activity could incorrectly advance a different queue slot if the same activity appeared multiple times.
- **Automation Queue Stop** — Queue now stops automatically after the last item completes (unless Auto-Repeat is enabled). Previously it would loop indefinitely regardless of the repeat setting.
- **Mobile Settings Panel** — Fixed empty settings panel on mobile devices.
- **Mobile Settings Sync** — Language, theme, and font size controls now work correctly on mobile. Previously only desktop selects were being read.

---

## v0.3.2

### Navigation
- **Chapter 2 ↔ Chapter 3 return paths** — After unlocking passage to Chapter 3 (via door or ventilation), repeatable return activities are now available in both directions matching the method used.

### Bug Fixes
- **Loop restart on load** — Fixed a bug where loading a save with 0 oxygen and inactive loop would leave the player stuck. The game now automatically starts a new loop.
- **No more Russian flash on load** — UI is now hidden until translations are applied, with a smooth fade-in.
- Tau Ceti distance corrected to 12 light years.

### Improvements
- **Infinity symbol** — Activities with unlimited repeats now display `∞` instead of `999`.

---

## v0.3.1

### New Systems
- **Nitrogen & NITRO Mode** — A new resource earned during offline time (1 unit per 10 seconds away). Activate "NITRO x10" to speed up all activities tenfold while consuming nitrogen. Also accumulates when the browser tab is hidden.
- **Oxygen Efficiency** — Activities now reduce oxygen consumption based on permanent bonuses and equipped items. The Emergency Respirator grants -5% O₂ usage, shown via badge on the oxygen bar with a hover tooltip listing all contributors.

### New Features
- **Stat EXP Multiplier Display** — Each stat now shows a combined EXP multiplier (e.g. `x1.35`) next to Loop XP, reflecting both permanent level bonuses and item bonuses. Hover over it to see a detailed breakdown by source.
- **Save Export / Import** — Full save export and import functionality added in Settings. Saves are base64-encoded for easy sharing.
- **Infinite Event Log** — The event log no longer truncates at 15 entries. Scroll through your full loop history.

### Balance Changes
- Chapter 4 activity base power increased from 16 to 64.
- Chapter 4 activity durations rebalanced for better progression.
- Demo boundary set to Chapter 3.

### Bug Fixes
- Translation keys fixed — the auto-repeat button tooltip now displays correct translated text instead of a raw key.
- Save import no longer triggers a redundant save during load.
- Item bonuses are now properly updated from definitions when loading older saves.

### Improvements
- Full localization — all UI tooltips are now properly translated across Russian, English, and German.

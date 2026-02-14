# Space Loop Protocol - Patch Notes

## v0.2.0 — UI Overhaul & Quality of Life

### New Features
- **Stat EXP Multiplier Display** — Each stat now shows a combined EXP multiplier (e.g. `x24.31`) next to Loop XP, reflecting both permanent level bonuses and item bonuses. Hover over it to see a detailed breakdown by source.
- **Oxygen Save Badge** — The oxygen bar now displays a `(-5%)` badge when you have oxygen consumption reduction. Hover to see which items and abilities contribute to the discount.
- **Offline Nitrogen Gains** — When returning after being away, you now earn nitrogen based on offline time (1 per 10 seconds away).

### Bug Fixes
- **Nitrogen no longer drains when idle** — Nitro mode now only consumes nitrogen while an activity is actively running.
- **Save import fixed** — Importing a save file now works reliably. Fixed an issue where the browser would overwrite imported data during page reload.
- **Old saves updated automatically** — Items obtained before a patch now correctly receive new bonuses (e.g. Emergency Respirator's -5% O2) when loading an old save.
- **Translation keys fixed** — The auto-repeat button tooltip now displays the correct translated text instead of a raw key.

### Improvements
- **Infinite event log** — The event log no longer truncates at 15 entries. Scroll through your full loop history.
- **Cache busting** — Script versions are now tracked to prevent stale browser caches after updates.
- **Localization** — All UI tooltips are now properly translated across Russian, English, and German.

### Balance
- **Demo limited to 3 chapters** — The playable demo now covers Chapters 1-3.

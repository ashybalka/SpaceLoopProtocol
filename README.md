# Space Loop Protocol

A browser-based incremental game set aboard the research vessel "Aurora", trapped in a temporal anomaly.

## How to Play

Open `[Space Loop Protocol](https://ashybalka.github.io/SpaceLoopProtocol/)` in any modern browser.

## Game Mechanics

- **Loop system**: Each cycle you have limited oxygen. Complete activities to gain stats and unlock new ones.
- **5 stats**: Strength, Intelligence, Agility, Endurance, Perception — each activity trains specific stats with weighted percentages.
- **Permanent progression**: Loop exp converts to permanent levels that persist across loops, providing time acceleration (+1% per perm level).
- **Chapters**: Progress through the ship by completing chapter-ending activities. Demo includes chapters 1-3.
- **Items**: Discover items during activities — they provide bonuses and persist across loops.
- **Automation**: After enough completions, activities can be added to an automation queue.
- **Two exit paths**: Most chapters offer alternative routes (e.g. force the door vs hack the lock).

## Languages

Russian, English, German (switch in settings).

## Project Structure

```
Space Loop.html          — main HTML
style.css                — styles
scripts/
  game.js                — core game loop, stats, exp formulas
  ui.js                  — UI rendering, log system
  activities.js          — activity loading, rendering, completion logic
  automation.js          — automation queue system
  save.js                — save/load (localStorage)
  i18n.js                — internationalization
activities/
  chapter1-10.json       — per-chapter activity definitions
translations.json        — UI translations (ru/en/de)
activities-translations.json — activity text translations (ru/en/de)
translations/
  inventory.json         — item translations and descriptions
```

## Key Formulas

| Formula | Expression |
|---------|-----------|
| Duration | `duration × 0.97^weightedLevel` |
| Loop exp threshold | `10 × 1.25^level` |
| Perm exp threshold | `100 × 1.5^permLevel` |
| Time speed | `dt × (1 + permLevelsSum × 0.01)` |
| Base power | Ch1: 2, Ch2: 4, Ch3: 8, Ch4: 16, Ch5: 32 |

# Cultural Islands — UI / Visual Rebuild Notes

## Product intent

The interface is designed as a management game first: the player should always understand the current island condition, the immediate threat, what can be built, what can be traded, and what ends the turn.

## Visual direction

- Dark oceanic base with teal, sea-glass and sand accents.
- Calm surfaces for normal state; red/gold/green are reserved for event state and outcomes.
- Rounded containers and restrained borders establish hierarchy without making the screen feel like a dashboard full of boxes.
- Tile art is procedural/vector-style so it stays sharp at different resolutions and does not depend on a pile of placeholder images.
- The board has depth through offset tile shadows, water rings and distinct building silhouettes rather than flat colored polygons.

## Interaction hierarchy

1. Resource bar — always visible.
2. Active event — interrupts the normal flow until resolved.
3. Island board — the central decision surface.
4. Build / Trade / Tasks — one explicit action context at a time.
5. End Turn — only available when the player has completed the required event response.

## Game-specific UX decisions

- Build cards are disabled when the player cannot afford them, when it is not the player's turn, or while an active event is unresolved.
- The board only highlights legal adjacent placement cells after a build choice is selected.
- Event targets pulse on the board and are repeated in the event card so the player does not need to hunt for the threatened tile.
- Trade cards show both sides of the exchange before the player commits.
- Task cards show cost and points together so players can compare readiness to reward.
- Island selection explicitly surfaces the documented advantage/risk model from the rulebook.

## Intentionally not changed

The Rust server remains the source of truth for turn order, placement validation, resource spending, event resolution, trade limits, task scoring and final scoring. The Godot client does not duplicate those rules as an authority.

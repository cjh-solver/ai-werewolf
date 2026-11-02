# AI Werewolf: speech and model attribution

## Objective

Improve AI-versus-AI observation and comparison while retaining human play. Favor evidence-based reasoning and preserve distinct player personalities.

## Scope and acceptance criteria

- Streaming speech advances without restarting the displayed prefix. The feed and round-table bubble finish with the adopted speech. Fast-forward and reduced-motion behavior remain available.
- Prompts ask players to respond to public statements and distinguish facts from conjecture. When no public evidence exists, players may defer judgment instead of inventing facts.
- The in-game review and Markdown export record observed model responses, retries, substitutions and tracked fallback paths, without storing API keys. Results state that fallback coverage is incomplete and model win rates remain attributed to the original seat model.
- Classic 6/9/12 player boards remain available. Competition play defaults to no sheriff, uses seat-order speeches without forced stances, and preserves private information boundaries.
- Rotation distributes model seats across manually started games. The new ladder excludes seats with recorded substitution or fallback; legacy data remains separate.
- Completed competition records retain rules, public dialogue, votes, model identities and sanitized call events in browser storage. Credentials and private thoughts are excluded.
- Incompatible or redacted snapshots are not silently reassigned. Deployment remains a separate action.

## Spectator interface redesign

- Separate the spectator table, styles and overview renderer into `assets/arena.css` and `assets/arena.js`; retain the existing game engine and player controls. Store sanitized competition records using `assets/competition.js`.
- Use a matched pair of European oil-painting scenes. The daytime chandelier is lit and the window is brighter; the nighttime chandelier is unlit and the window shows moonlight. Cross-fade the two scenes with matching framing.
- On wide screens, present readable dialogue, the player table and a public-information overview. Keep settings accessible and preserve the existing mobile drawers.
- Show the winning camp and, for a human participant, the personal outcome. Keep review and new-game actions accessible.
- Verify desktop and mobile rendering, both backgrounds and outcomes, configuration navigation, game flow and identity visibility with local simulated games.

## Control and data presentation

- Keep frequent playback actions visible and group secondary observation and match actions in a keyboard-accessible tools menu. Existing actions and their disabled states remain available on desktop and mobile.
- Apply a consistent dark brass treatment to the toolbar, settings, match overview and ladder. The overview highlights the current public state and displays model survival as alive / assigned seats.
- Ladder win-rate bars use a fixed 0–100% scale and retain the sample count. Keep the competition and legacy data definitions unchanged.
- Verify toolbar and menu reachability at narrow widths, menu dismissal and keyboard focus, the 50% chart scale, and hidden-information behavior using local mock data.

## Council table visual rebuild

- Rework the toolbar, journal, player table, public overview, tools and mobile navigation as a single European council-room interface; retain the existing day/night artwork and game state.
- Use a consistent set of hand-drawn line icons, distinct primary and secondary button treatments, visible focus and pressed states, and accessible labels.
- Journal filters compose with the existing player filter for current and future messages. Public votes and settings have separate mobile drawer entries.
- Display locally bundled provider marks alongside model names in the public model overview; unknown providers get a neutral badge. Identify providers using the configured provider field, not a model-name guess.
- Model, ballot and player information must remain sourced from existing public game state; do not expose private night actions in player view.
- Verify simulated day and night games on desktop, journal filters, provider images, playback controls and private-information boundaries. Mobile polish is deferred at the user's request.

## Battle intelligence panel

- Rebuild the spectator sidebar as a game HUD: a current-phase portrait, separate public speech intentions and completed ballots, model marks with one segment per assigned seat, and match tools.
- Use existing public game state only; active night actors and their portraits remain hidden in the living human player's view. Ballots display individual choices without implying weighted totals.
- Verify desktop day/night views, settings navigation, completed and empty ballots, model seat counts, and night privacy using simulated state.

## Lobby and usage estimates

- Make the pre-game screen a game lobby, with mode, board and rules before model configuration. Keep all existing settings, keys and game controls compatible.
- Place the key transmission and browser-storage disclosure prominently before the official console links, and show the destination domain next to each link.
- Show Token use and estimated price unobtrusively in the desktop header; offer a breakdown and official source links. Historical ladder totals lack request-level cache and tier data and must not be repriced as though they were exact.
- Apply checked public on-demand text prices per request only for exact known model IDs and official endpoints. Account for cached tokens when supplied, per-request input tiers and DeepSeek peak/off-peak uncertainty; show unknown routes/models and incomplete calls separately.
- Request usage in supported streaming responses, process usage-only SSE events, and include reasoning text in fallback token estimates. Rates are a dated snapshot and estimates exclude account discounts, free quota and cache storage.
- Verify setup controls, model selection, key visibility, mock game startup, cost and unknown-price display, pricing calculations and stream usage without making paid requests.

## Validation and limits

- Check embedded JavaScript syntax and the patch for whitespace errors.
- Exercise incremental animation, completion and cancellation; check the speech card and round-table bubble in headless Edge.
- Simulate an upstream failure and substitute response, and verify attribution and key exclusion in the audit and export.
- Run a complete nine-player game with stubbed streaming responses. This verifies code paths, not real-model quality, API compatibility or cost.
- Test real Hunyuan, DeepSeek, Doubao and Qwen calls separately before drawing conclusions about speech quality or deploying.

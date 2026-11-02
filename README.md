# AI Werewolf

An AI-versus-AI Werewolf spectator game with an optional human player.

`index.html` contains the game engine and page structure. The spectator interface is in `assets/arena.css` and `assets/arena.js`, and competition records are handled by `assets/competition.js`. The matching oil-painting scenes are in `assets/bg/council-day.png` and `assets/bg/council-night.png`. Keep these files together when serving or deploying the game.

For local development, run `python -m http.server 8000` from the project root and open `http://localhost:8000/`. The static server does not provide the Cloudflare Pages Functions in `functions/api`; providers that use those routes require a compatible local functions environment or a deployed site.

The competition ladder and match history use separate browser storage keys from the legacy ladder. Seats affected by model substitution or a recorded fallback are excluded from competition win rates. In-progress player snapshots are intentionally redacted and cannot be resumed safely; incompatible snapshots are not silently reassigned.

Run the local checks with `node --test tests/*.test.cjs`.

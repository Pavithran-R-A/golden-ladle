# golden-ladle

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/Pavithran-R-A/golden-ladle/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/Pavithran-R-A/golden-ladle/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Chef Juno's street-food rush: a complete, original cooking game for the make.fun "Make the best cooking game" bounty. Built in one session, all art, sounds, names and code are original — no copied assets, no libraries, no network requests. Everything runs from static files in `game/`.

## Run it

```sh
node serve.ts
# open http://localhost:8080
```

---

Entered on [make.fun](https://make.fun/?ref=s4padhjw&utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards

## How to play

Serve it locally and open it in a desktop browser:

```
node serve.ts
# open http://localhost:8080
```

Move with **WASD / arrow keys** or **click** anywhere on the floor (clicking a station walks Juno there and uses it on arrival). **Space / E** uses the nearest station. **P / Esc** pauses, **M** mutes.

## The loop

Tickets appear on the order board — each names a dish and a patience bar. Fetch ingredients from the pantry, chop them on the board, grill them on the grill (two slots, and they burn if you forget them), stack them on a plate, and ring the bell at the serve window before the customer walks away. Serving fast earns a tip; serving in a row builds a combo multiplier. Three hearts: an expired ticket or a wrong dish costs one.

## The menu

- **Sunny Garden Salad** — chopped tomato + chopped lettuce — $8
- **Ember Corn Cup** — grilled corn + cheese — $10
- **Golden Smash Burger** — grilled patty + chopped tomato + cheese — $14
- **Golden Tofu Bowl** — grilled tofu + chopped lettuce + cheese — $12

Three days of 100 seconds each, with faster orders and shorter patience every day. Stars are earned per day at $55 / $85 / $110.

## Files

- `game/index.html` + `game/src/*.js` — the game (config, kitchen rules, chef, renderer, input, audio, particles, screenshot staging)
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny static server for local play-testing
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged
- `screenshots/` — 4 real renders of the game (start, play, serve, day end)
- `LICENSE` — MIT

Screenshots are staged deterministically with `?shot=start|play|serve|end` plus `&seed=N`: each plays the real rules forward with an autopilot, so every frame is genuine gameplay.

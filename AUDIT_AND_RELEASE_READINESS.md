# Golden Ladle — independent stability and commercial readiness audit

Baseline: 63d2ff36adcdd0df1d246aa45da004a096de86ea (v6). Development branch only; preserve competition main and submission.
## Verified repair increment
Seven regression assertions failed on baseline and passed after kitchen/input repairs: completed plate rejects extra ingredient, exact recipe identity, closing spawn preparation feasibility estimate, reset pings, movement aliases, clear pending input on blur, no post-terminal cooking. Three additional frame-loop assertions failed before screen-flow repair and passed afterward: paused sizzle zero, final-day summary reachable, final-day retry restores day and total. Final branch readback: 10/10 assertions. Tests executed by evaluating the actual source with minimal DOM/audio stubs, not by running the standalone Node command or native Windows app.
Run from checkout:
```
node --experimental-default-type=module tests/stability.mjs
node --experimental-default-type=module tests/screen-flow.mjs
```
30 seeds × three days × baseline and patched versions: 180 comparative day simulations using repository autopilot and actual chef movement. All 180 three stars; baseline mean earnings 183.3/178.3/187.1; patched 169.1/189.8/189.6. Final readback another 90/90 three-star days. Autopilot has no human reaction delays; no human difficulty claim.
## Remaining issues / next gates
- Wrong dish retained: repeated serve attempts can lose multiple hearts for same dish; separate rejected interaction from a customer loss. Wrong dishes currently increment missed/walkout count.
- Fixed total-cook estimate used for doomed cue ignores actual work completed, distance, and remaining shift time. Replace with actionable estimate, not a claim of certainty. Closing spawn patch is a heuristic, not proof every ticket is completable.
- Plate validation should test prep states, recipe unlocks, duplicates and recovery from invalid ingredient combinations; allow removing ingredients and explicit station slot choice.
- Unserved tickets at closing and out-of-hearts settlement require explicit policy; record reason and counters. No misleading completion on zero stars.
- Reset all visual particles, pending movements and flash on every shift transition; separate session-scoped state.
- Fixed-step catch-up caps long stalls; auto-pause on blur as well as visibility changes and verify time fairness; no stale interactions.
- Canvas menus accept clicks outside buttons; implement explicit hit targets and accessible DOM focus. Provide remapping, gamepad, scalable text, reduced motion, independent music/SFX volume and settings persistence.
- Local storage stores only high scores; validate values, introduce versioned atomic saves, unlocks, migration/recovery, clear errors and safe single-instance Windows shell.
- Production builds must exclude screenshot staging/debug controls; keep QA build available.
- No Windows packaging pipeline in inspected repository. Retain engine; use standalone Electron or suitable desktop host with offline bundled assets, secure local loading, executable metadata and application icon. Validate native Windows installation, upgrade, offline gameplay, clean exit. Steam depot/launch configuration and Microsoft GDK self-service PC game MSIXVC path must be qualified using real partner metadata; evaluate supported alternatives. Do not publish or pay without approval.
- Originality: active cooking and kitchen layout optimization, not a cat/penguin diner reskin. First qualify a polished street-food kitchen, then consider 30–45 authored shifts, 20–30 recipes, 5–6 distinct kitchens, equipment unlocks, optional time trials and seed challenges, later co-op only if proven.
- Motivation: competence (clear mastery), autonomy (menu and layouts), relatedness (Juno and regulars), meaningful unlocks, transparent near-miss feedback, no coercive streaks/paid advantages. Test actual fun with human playtests.
- Commercial hypothesis: free demo, premium full game $4.99–7.99, later substantial expansion and soundtrack, bundle after other titles qualify; no revenue guarantee. No payment activation, purchases, submission or release without owner authorization.
## External references
Steam Direct: https://partner.steamgames.com/doc/gettingstarted/appfee
Steam onboarding: https://partner.steamgames.com/doc/gettingstarted/onboarding
Steam AI content survey: https://partner.steamgames.com/doc/gettingstarted/contentsurvey
Microsoft PC game publishing: https://learn.microsoft.com/en-us/windows/apps/publish/whats-new-game-publishing
Microsoft Store fees: https://learn.microsoft.com/en-us/windows/apps/publish/faq/get-started-with-the-microsoft-store
Player motivation research: https://selfdeterminationtheory.org/SDT/documents/2006_RyanRigbyPrzybylski_MandE.pdf
## Verdict
Stability increment verified in isolated logic and simulated frame loop. Not a full line-by-line certification, rendered playtest, dependency audit, native Windows verification, or store approval. Existing source structure and three-day game preserved. Continue reproduce → regression test → fix → retest → rendered playtest → record evidence; no claim of perfection.

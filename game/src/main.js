// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, day summary and game over.
//
// ?seed=N fixes the order of tickets. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, DAYS, GAME_TITLE, GRILL_SECONDS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createChef } from './chef.js';
import { createParticles } from './particles.js';
import {
  EVENT_BELL,
  EVENT_BURNT,
  EVENT_CHOP_DONE,
  EVENT_DAY_END,
  EVENT_ERROR,
  EVENT_GAME_OVER,
  EVENT_GRILL_DONE,
  EVENT_MISS,
  EVENT_PICKUP,
  EVENT_PLACE,
  EVENT_PLATE_READY,
  EVENT_SERVE,
  EVENT_TRASH,
  EVENT_WRONG,
  createKitchen,
  nearestStation,
} from './kitchen.js';
import { ACTION_CLICK, ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, ACTION_RETRY, createInput } from './input.js';
import { DAY_BUTTONS, SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createRenderer } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const chef = createChef();
const renderer = createRenderer(canvas);
const particles = createParticles();
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

/** Best score on one day (v6, P2-9), kept per day in localStorage. */
function readBestDay(day) {
  try {
    return Number.parseInt(window.localStorage.getItem(`${BEST_KEY}.day${day}`) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBestDay(day, value) {
  try {
    window.localStorage.setItem(`${BEST_KEY}.day${day}`, String(value));
  } catch {
    // As above: best lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, kitchen, chef);
  let painted = 0;
  function paint() {
    renderer.draw({ state: kitchen.state, chef, screen: scene.screen, best: readBest(), particles, flash: 0 });
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let flash = 0;
  let pendingStation = null;
  let steamTimer = 0;
  // v6: a read-only handle for live verification (screenshots, play-tests).
  window.__game = { kitchen, chef, audio, getScreen: () => screen };

  function announce(message) {
    status.textContent = message;
  }

  function resetRun() {
    kitchen.startDay(1);
    const state = kitchen.state;
    state.total = 0;
    state.served = 0;
    state.missed = 0;
    state.bestCombo = 0;
    state.dayStars = {};
    state.gameOver = false;
    chef.reset();
    pendingStation = null;
  }

  /** Run the title backdrop kitchen forward so the title sits over a
   * live-looking kitchen (v6 P2-4: also re-seeds it after a full run, when
   * the game-over screen would otherwise leave a dead Day 3 behind). */
  function seedBackdrop() {
    for (let i = 0; i < 240; i += 1) kitchen.step(STEP);
  }

  function startGame() {
    resetRun();
    screen = SCREEN_PLAY;
    audio.startMusic();
    announce(`${GAME_TITLE}. Day 1. Take the tickets, chop, grill, plate, serve.`);
  }

  function endDayScreen() {
    screen = SCREEN_DAY;
    audio.stopMusic();
    const state = kitchen.state;
    if (state.score > readBestDay(state.day)) saveBestDay(state.day, state.score);
    announce(`Day ${kitchen.state.day} complete. Earned $${kitchen.state.score}.`);
  }

  // D9: retry the day just played — the failed day's score must come back
  // out of the running total first, or retrying would double-count it.
  // v6: the day's walk-outs and best combo roll back too (kitchen tracks
  // them per day now), and the RNG snapshot in startDay replays the same
  // tickets, so a retry is the same day, not a harder one.
  function retryDay() {
    const state = kitchen.state;
    state.total -= state.score;
    state.served -= state.dayServed;
    state.missed -= state.dayMissed;
    state.bestCombo = state.bestComboAtDayStart;
    kitchen.startDay(state.day);
    chef.reset();
    pendingStation = null;
    screen = SCREEN_PLAY;
    audio.startMusic();
    announce(`Day ${kitchen.state.day}, retry.`);
  }

  function backToTitle() {
    resetRun();
    seedBackdrop();
    screen = SCREEN_TITLE;
    audio.stopMusic();
    announce(`${GAME_TITLE}. Press Enter or click to start.`);
  }

  function endGameScreen() {
    screen = SCREEN_OVER;
    audio.stopMusic();
    if (kitchen.state.total > best) {
      best = kitchen.state.total;
      saveBest(best);
    }
    announce(`Service complete. Total $${kitchen.state.total}. Best $${best}.`);
  }

  /** Sounds and particles for what the kitchen just did. */
  function react(events) {
    const state = kitchen.state;
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_CHOP_DONE) {
      audio.chop();
      particles.burst(180, 620, '#e8b04b', 10, 120);
    }
    if (events & EVENT_GRILL_DONE) {
      audio.ready();
      particles.steam(620, 600);
    }
    if (events & EVENT_BURNT) audio.buzz();
    if (events & EVENT_PLATE_READY) {
      audio.ready();
      particles.burst(1000, 620, '#ffd66b', 12, 140);
    }
    if (events & EVENT_SERVE) {
      audio.coin();
      audio.bell();
      particles.coins(1120, 150);
    }
    if (events & EVENT_BELL) audio.bell();
    if (events & EVENT_MISS) {
      audio.buzz();
      flash = 1;
    }
    if (events & EVENT_WRONG) {
      audio.buzz();
      flash = 1;
    }
    if (events & EVENT_ERROR) audio.buzz();
    if (events & EVENT_TRASH) audio.pop();
    if (events & EVENT_DAY_END) {
      audio.jingle();
      endDayScreen();
    } else if (events & EVENT_GAME_OVER) endGameScreen();
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (screen === SCREEN_TITLE) {
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) {
        audio.unlock();
        startGame();
      }
      return;
    }
    if (screen === SCREEN_DAY) {
      // D9: R or the RETRY button replays the day; Esc or the TITLE button
      // goes back to the title; Enter / a click elsewhere advances.
      if (actions & ACTION_RETRY) {
        audio.unlock();
        retryDay();
        return;
      }
      if (actions & ACTION_PAUSE) {
        audio.unlock();
        backToTitle();
        return;
      }
      if (click) {
        const inRect = (r) => click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h;
        if (inRect(DAY_BUTTONS.retry)) {
          audio.unlock();
          retryDay();
          return;
        }
        if (inRect(DAY_BUTTONS.title)) {
          audio.unlock();
          backToTitle();
          return;
        }
      }
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) {
        audio.unlock();
        if (kitchen.state.day < DAYS) {
          kitchen.startDay(kitchen.state.day + 1);
          chef.reset();
          pendingStation = null;
          screen = SCREEN_PLAY;
          audio.startMusic();
          announce(`Day ${kitchen.state.day}.`);
        } else {
          endGameScreen();
        }
      }
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & ACTION_RETRY) {
        audio.unlock();
        startGame();
        return;
      }
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) {
        audio.unlock();
        backToTitle();
      }
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
      announce('Paused.');
      return;
    }
    // v6 (P2-3): a click resumes from pause too, not just P / Esc / Enter.
    if (screen === SCREEN_PAUSED && (actions & (ACTION_PAUSE | ACTION_CONFIRM) || click)) {
      screen = SCREEN_PLAY;
      audio.startMusic();
      announce('Playing.');
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    // Clicking a station walks Juno there and uses it on arrival.
    if (click) {
      const station = nearestStation(click.x, click.y);
      if (station) {
        pendingStation = station;
        chef.walkTo(click.x, click.y);
      } else {
        pendingStation = null;
        chef.walkTo(click.x, click.y);
      }
    }
    if (actions & ACTION_INTERACT) {
      pendingStation = null;
      react(kitchen.interact(chef));
    }
  }

  function step() {
    const dir = input.direction();
    if (dir.x !== 0 || dir.y !== 0) pendingStation = null;
    chef.update(STEP, dir.x, dir.y);
    if (pendingStation) {
      // Use the station when Juno arrives where she was sent, not merely
      // within reach of the counter: the pantry is a long counter and
      // "within reach" would fire while she is still under the wrong bin.
      if (chef.targetX === null && chef.targetY === null) {
        pendingStation = null;
        react(kitchen.interact(chef));
      }
    }
    const events = kitchen.step(STEP);
    react(events);
    // Grill steam while something cooks.
    steamTimer -= STEP;
    if (steamTimer <= 0) {
      steamTimer = 0.18;
      kitchen.state.grill.forEach((slot, i) => {
        if (slot && slot.progress < GRILL_SECONDS) particles.steam(560 + i * 160, 590);
      });
    }
    particles.step(STEP);
    if (flash > 0) flash = Math.max(0, flash - STEP * 1.5);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP) {
        step();
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) {
          accumulator = 0;
          break;
        }
      }
    } else {
      accumulator = 0;
    }
    // Grill sizzle follows how full the grill is.
    const cooking = kitchen.state.grill.filter((slot) => slot && slot.progress < GRILL_SECONDS).length;
    audio.setSizzle(screen === SCREEN_PLAY ? cooking / 2 : 0);
    renderer.draw({ state: kitchen.state, chef, screen, best, dayBest: readBestDay(kitchen.state.day), muted: audio.isMuted(), particles, flash });
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      audio.stopMusic();
      announce('Paused.');
    }
  });

  // Seed the title screen's backdrop kitchen once: a couple of tickets on the
  // board, then frozen, so the title sits over a live-looking kitchen.
  for (let i = 0; i < 240; i += 1) kitchen.step(STEP);

  announce(`${GAME_TITLE}. Press Enter or click to start.`);
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();

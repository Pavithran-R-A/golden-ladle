// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between five screens: title, play,
// paused, day summary and game over.
//
// ?seed=N fixes the order of tickets. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, GAME_TITLE, GRILL_SECONDS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createAudio } from './audio.js';
import { createChef } from './chef.js';
import { createParticles } from './particles.js';
import {
  EVENT_BURNT,
  EVENT_CHOP_DONE,
  EVENT_DAY_END,
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
import { ACTION_CLICK, ACTION_CONFIRM, ACTION_INTERACT, ACTION_MUTE, ACTION_PAUSE, createInput } from './input.js';
import { SCREEN_DAY, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, createRenderer } from './render.js';
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
    state.gameOver = false;
    chef.reset();
    pendingStation = null;
  }

  function startGame() {
    resetRun();
    screen = SCREEN_PLAY;
    announce(`${GAME_TITLE}. Day 1. Take the tickets, chop, grill, plate, serve.`);
  }

  function endDayScreen() {
    screen = SCREEN_DAY;
    announce(`Day ${kitchen.state.day} complete. Earned $${kitchen.state.score}.`);
  }

  function endGameScreen() {
    screen = SCREEN_OVER;
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
    if (events & EVENT_MISS) {
      audio.buzz();
      flash = 1;
    }
    if (events & EVENT_WRONG) {
      audio.buzz();
      flash = 1;
    }
    if (events & EVENT_TRASH) audio.pop();
    if (events & EVENT_DAY_END) {
      audio.jingle();
      if (state.gameOver) endGameScreen();
      else endDayScreen();
    }
    if (events & EVENT_GAME_OVER) endGameScreen();
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
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) {
        audio.unlock();
        if (kitchen.state.day < 3) {
          kitchen.startDay(kitchen.state.day + 1);
          chef.reset();
          screen = SCREEN_PLAY;
          announce(`Day ${kitchen.state.day}.`);
        } else {
          endGameScreen();
        }
      }
      return;
    }
    if (screen === SCREEN_OVER) {
      if (actions & (ACTION_CONFIRM | ACTION_CLICK)) {
        audio.unlock();
        screen = SCREEN_TITLE;
        announce(`${GAME_TITLE}. Press Enter or click to start.`);
      }
      return;
    }
    if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
      return;
    }
    if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
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
    audio.setSizzle(cooking / 2);
    renderer.draw({ state: kitchen.state, chef, screen, best, particles, flash });
  }

  // Leaving the tab pauses a running game rather than letting tickets expire unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
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

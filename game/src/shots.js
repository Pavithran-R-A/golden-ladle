// The screenshot scenes behind ?shot=start|play|serve|end. Each one plays the
// real rules forward from a fresh kitchen for a fixed time, steered by a simple
// autopilot (fetch what the oldest ticket still needs, use the board and grill
// while the other works, plate it, serve it), so the frame is what a real game
// looks like and the same seed always gives the same frame.

import { CHOP_SECONDS, DISHES, FLOOR, INGREDIENTS, PANTRY_BINS, STATIONS, STEP } from './config.js';
import { SCREEN_DAY, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

function centre(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function clampToFloor(x, y) {
  return {
    x: Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, x)),
    y: Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, y)),
  };
}

/** Where the chef should stand to use a station (or a pantry bin). */
function standPoint(station, binId) {
  if (station === 'pantry' && binId) {
    const bin = PANTRY_BINS.find((b) => b.id === binId);
    const c = centre(bin);
    return clampToFloor(c.x, c.y);
  }
  const c = centre(STATIONS[station]);
  return clampToFloor(c.x, c.y);
}

/** The autopilot's next job, from the kitchen state and the chef's hands. */
function plan(kitchen, chef) {
  const s = kitchen.state;
  // A plate that can never become a dish gets cleared first: one holding
  // something no ticket wants, a repeated ingredient (no dish needs one
  // twice), or a full plate that still matches nothing. The trash takes the
  // carried item first, then the plate, so the same job clears both. This
  // runs before the carrying checks, or a full bad plate would strand the
  // chef holding an ingredient it can never plate.
  if (s.plate.length > 0) {
    const order = s.orders[0];
    const counts = {};
    const duplicate = s.plate.some((item) => {
      counts[item.ingredient] = (counts[item.ingredient] || 0) + 1;
      return counts[item.ingredient] > 1;
    });
    const wrong = order && s.plate.some((item) => !order.dish.needs.includes(item.ingredient));
    const fullNoDish = s.plate.length >= 3 && !s.plateDish;
    if (duplicate || wrong || fullNoDish) return { station: 'trash' };
  }
  if (chef.carrying && chef.carrying.type === 'dish') return { station: 'serve' };
  if (chef.carrying && chef.carrying.type === 'ingredient' && chef.carrying.state === 'burnt') {
    return { station: 'trash' };
  }
  if (!chef.carrying && s.plateDish) return { station: 'plating' };
  if (!chef.carrying && s.board && s.board.progress >= CHOP_SECONDS) return { station: 'board' };
  if (!chef.carrying) {
    for (const slot of s.grill) {
      if (slot && (slot.item.state === 'grilled' || slot.item.state === 'burnt')) return { station: 'grill' };
    }
  }
  if (chef.carrying && chef.carrying.type === 'ingredient') {
    const ingredient = INGREDIENTS[chef.carrying.ingredient];
    if (chef.carrying.state === 'raw' && ingredient.prep === 'chop') return { station: 'board' };
    if (chef.carrying.state === 'raw' && ingredient.prep === 'grill') return { station: 'grill' };
    if (chef.carrying.state !== 'raw') return { station: 'plating' };
    return { wait: true };
  }
  // Hands empty, nothing ready: work on the oldest ticket.
  const order = s.orders[0];
  if (!order) return { wait: true };
  const onPlate = s.plate.map((item) => item.ingredient);
  const inProgress = [];
  if (s.board) inProgress.push(s.board.item.ingredient);
  for (const slot of s.grill) if (slot) inProgress.push(slot.item.ingredient);
  const missing = order.dish.needs.find((id) => !onPlate.includes(id) && !inProgress.includes(id));
  if (!missing) return { wait: true };
  const ingredient = INGREDIENTS[missing];
  if (ingredient.prep === 'chop' && s.board) return { wait: true };
  if (ingredient.prep === 'grill' && s.grill[0] && s.grill[1]) return { wait: true };
  return { station: 'pantry', bin: missing };
}

/** One autopilot step: walk to the job, use the station on arrival. */
function autopilotStep(kitchen, chef) {
  const job = plan(kitchen, chef);
  if (!job || job.wait) return;
  const point = standPoint(job.station, job.bin);
  // Close enough is measured against the exact spot the chef walks to, not
  // the counter's edge: the pantry is a long counter and "within reach of
  // the pantry" would fire while the chef is still under the wrong bin.
  const near = Math.hypot(chef.x - point.x, chef.y - point.y) < 25;
  if (near) {
    kitchen.interact(chef);
  } else {
    chef.walkTo(point.x, point.y);
  }
}

// Exported for a headless autopilot check (node can import this module: it
// touches no DOM at import time).
export { plan, autopilotStep };

function simulate(kitchen, chef, seconds, until) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    autopilotStep(kitchen, chef);
    chef.update(STEP, 0, 0);
    kitchen.step(STEP);
    if (until && until(kitchen, chef)) break;
  }
}

/**
 * Set the kitchen and chef to the named scene (start, play, serve or end) and
 * return the screen to draw over it.
 */
export function stageShot(name, kitchen, chef) {
  kitchen.startDay(1);
  chef.reset();
  if (name === 'play') {
    // Freeze the first moment that shows the whole loop at once: a dish
    // mid-assembly on the plate, something on the grill, and tickets up —
    // after 55 s, so it lands ~2 s before the serve shot (same run, later),
    // with timer and score reading as consistent between the two shots.
    simulate(kitchen, chef, 90, (k) => (k.state.plate.length >= 1
      && k.state.grill.some((slot) => slot)
      && k.state.orders.length >= 2 && k.state.elapsed >= 55) || k.state.elapsed >= 62);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'serve') {
    // Freeze the moment Juno carries a plated dish once the score has
    // already passed the play shot's $57: the serve shot is the same run
    // later, so its score and timer must read as consistent with it rather
    // than as a fresh run at $0.
    simulate(kitchen, chef, 120, (k, c) => k.state.score >= 57 && c.carrying && c.carrying.type === 'dish');
    if (chef.carrying && chef.carrying.type === 'dish') {
      // Stage her in front of the pass, dish held high and clear of the
      // serve window, so the plated dish and "Ring the bell!" are both fully
      // visible. (Standing on the window's centre hid both in the old shot.)
      chef.x = 1050;
      chef.y = 310;
      chef.targetX = null;
      chef.targetY = null;
      chef.moving = false;
      chef.bob = 0;
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'end') {
    simulate(kitchen, chef, 110, (k) => k.state.dayOver);
    // Vary the tickets behind the summary: the seed leaves three identical
    // Garden Salads on the board, which reads as repetitive. Stage a real
    // mixed board (salad, corncup, salad) with varied patience bars.
    const s = kitchen.state;
    const mix = ['salad', 'corncup', 'salad'];
    const patience = [18, 26, 30];
    s.orders = mix.map((id, i) => {
      const dish = DISHES.find((d) => d.id === id);
      return { id: s.nextOrderId + i, dish, patience: patience[i], maxPatience: 30 };
    });
    s.nextOrderId += mix.length;
    return { screen: SCREEN_DAY };
  }
  simulate(kitchen, chef, 3);
  return { screen: SCREEN_TITLE };
}

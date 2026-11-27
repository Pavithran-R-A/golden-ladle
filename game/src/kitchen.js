// The game's rules and state, with no drawing and no browser in it: orders and
// their patience, the chopping board and grill, the plate, the chef's hands,
// scoring, combos, hearts and days. step() advances one fixed step and returns
// what happened as bit flags, so the caller can react with sound and particles
// without the world knowing about screens or sound.

import {
  BURN_SECONDS,
  CHOP_SECONDS,
  COMBO_MAX,
  COMBO_STEP,
  COOK_ESTIMATE,
  DAYS,
  DAY_SECONDS,
  DISHES,
  GRILL_SECONDS,
  HEARTS,
  HEARTS_BY_DAY,
  INGREDIENTS,
  MAX_ORDERS,
  ORDER_GAP,
  PANTRY_BINS,
  PATIENCE,
  REACH,
  STAR_TARGETS,
  STATIONS,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_CHOP_DONE = 4;
export const EVENT_GRILL_DONE = 8;
export const EVENT_BURNT = 16;
export const EVENT_PLATE_READY = 32;
export const EVENT_SERVE = 64;
export const EVENT_MISS = 128;
export const EVENT_DAY_END = 256;
export const EVENT_GAME_OVER = 512;
export const EVENT_TRASH = 1024;
export const EVENT_WRONG = 2048;
export const EVENT_BELL = 4096;
/** A rejected interaction: buzz, no red flash (main.js plays the sound). */
export const EVENT_ERROR = 8192;

/** Seconds a dish still needs, roughly, for the doomed-ticket cue. */
export function cookTime(dishId) {
  return COOK_ESTIMATE[dishId] || 20;
}

/** True when a ticket can no longer be finished before it walks out. */
export function isDoomed(order) {
  return order.patience < cookTime(order.dish.id);
}

function centre(rect) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** The dish whose ingredient list matches the plate exactly, or null. */
export function dishForPlate(plate) {
  const have = plate.map((item) => item.ingredient).sort();
  for (const dish of DISHES) {
    const needs = dish.needs.slice().sort();
    if (have.length === needs.length && have.every((id, i) => id === needs[i])) return dish;
  }
  return null;
}

/** Distance from (x, y) to the closest point of a rectangle (0 when inside). */
function distanceToRect(x, y, rect) {
  const cx = Math.min(rect.x + rect.width, Math.max(rect.x, x));
  const cy = Math.min(rect.y + rect.height, Math.max(rect.y, y));
  return Math.hypot(x - cx, y - cy);
}

/** Distance from (x, y) to one station's counter. */
export function stationDistance(id, x, y) {
  return distanceToRect(x, y, STATIONS[id]);
}

/**
 * The nearest station to (x, y) within reach, or null. Distance is measured
 * to the counter's edge, not its centre: the pantry is a long counter and a
 * chef standing under the tomato bin is using the pantry, 270 px from its
 * middle.
 */
export function nearestStation(x, y) {
  let best = null;
  let bestDistance = REACH;
  for (const [id, rect] of Object.entries(STATIONS)) {
    const d = distanceToRect(x, y, rect);
    if (d < bestDistance) {
      bestDistance = d;
      best = id;
    }
  }
  return best;
}

/** The pantry bin nearest to (x, y), or null when the chef is not at the pantry. */
export function nearestBin(x, y) {
  let best = null;
  let bestDistance = REACH;
  for (const bin of PANTRY_BINS) {
    const c = centre(bin);
    const d = distance(x, y, c.x, c.y);
    if (d < bestDistance) {
      bestDistance = d;
      best = bin;
    }
  }
  return best;
}

export function createKitchen(random) {
  const state = {
    day: 1,
    timeLeft: DAY_SECONDS,
    score: 0,
    total: 0,
    combo: 0,
    bestCombo: 0,
    hearts: HEARTS,
    maxHearts: HEARTS,
    served: 0,
    missed: 0,
    /** Per-day counters (v6): the day summary shows the day's own walk-outs
     * and best combo, not the run's cumulative totals. */
    dayMissed: 0,
    dayBestCombo: 0,
    /** Cumulative best combo as it stood when this day started, so a retry
     * can roll the day's combo back (main.js retryDay). */
    bestComboAtDayStart: 0,
    /** Stars earned per day, for the game-over total. */
    dayStars: {},
    /** Clean serves since the last heart was lost: the earn-back below. */
    servesSinceLoss: 0,
    dayServed: 0,
    orders: [],
    orderTimer: 5,
    nextOrderId: 1,
    ordersSpawned: 0,
    /** Tickets that walked out recently: [{dishId, at}] in game seconds, so
     * a serve arriving just too late is a "Too late!" (no heart) rather
     * than a second "Wrong dish!" heart for the same ticket. A list, not
     * one slot: two expiries no longer forget the first. */
    recentExpired: [],
    /** Back-compat alias for the single last expiry (readers, if any). */
    lastExpired: null,
    /** Two chopping boards (v6): the single slot was a serial bottleneck. */
    board: null,
    board2: null,
    /** When the trash-plate clear was armed by a first press (game seconds). */
    trashArmedAt: -99,
    grill: [null, null],
    plate: [],
    plateDish: null,
    carrying: null,
    dayOver: false,
    gameOver: false,
    stars: 0,
    elapsed: 0,
    /** Transient popups the renderer shows and clears: {x, y, text, kind}. */
    pings: [],
  };

  function ping(x, y, text, kind) {
    state.pings.push({ x, y, text, kind: kind || 'info', life: 1.4 });
  }

  function availableDishes() {
    return DISHES.filter((dish) => dish.fromDay <= state.day);
  }

  function spawnOrder() {
    const dishes = availableDishes();
    // D4: on Day 3 the Tofu Bowl is the 3rd ticket, so it always appears
    // while the player still has hearts to cook it — never a 58 s lottery.
    let dish = dishes[Math.floor(random() * dishes.length)];
    if (state.day === 3 && state.ordersSpawned === 2) {
      dish = DISHES.find((d) => d.id === 'tofubowl') || dish;
    }
    // v6 dinner rush: tickets arriving in the last 30 s get longer patience,
    // so the rush is more orders, not more impossible ones.
    let patience = PATIENCE[state.day - 1] + (random() * 4 - 2);
    if (state.timeLeft < 30) patience *= 1.25;
    state.orders.push({
      id: state.nextOrderId,
      dish,
      patience,
      maxPatience: patience,
    });
    state.nextOrderId += 1;
    state.ordersSpawned += 1;
  }

  /** RNG stream position at the start of each day, so a retry replays that
   * day's tickets exactly. Only the first visit to a day snapshots; a retry
   * restores the snapshot instead of taking a new one. */
  const daySnapshots = {};

  function startDay(day) {
    if (daySnapshots[day] !== undefined && typeof random.setState === 'function') {
      random.setState(daySnapshots[day]);
    } else if (typeof random.getState === 'function') {
      daySnapshots[day] = random.getState();
    }
    state.day = day;
    state.timeLeft = DAY_SECONDS;
    state.score = 0;
    state.combo = 0;
    state.maxHearts = HEARTS_BY_DAY[day - 1] || HEARTS;
    state.hearts = state.maxHearts;
    state.dayServed = 0;
    state.dayMissed = 0;
    state.dayBestCombo = 0;
    state.bestComboAtDayStart = state.bestCombo;
    state.servesSinceLoss = 0;
    state.orders = [];
    state.orderTimer = 5;
    state.ordersSpawned = 0;
    state.recentExpired = [];
    state.lastExpired = null;
    state.board = null;
    state.board2 = null;
    state.trashArmedAt = -99;
    state.grill = [null, null];
    state.plate = [];
    state.plateDish = null;
    state.carrying = null;
    state.dayOver = false;
    state.stars = 0;
    state.elapsed = 0;
  }

  function endDay() {
    if (state.dayOver) return;
    state.dayOver = true;
    state.stars = state.score >= STAR_TARGETS[2] ? 3 : state.score >= STAR_TARGETS[1] ? 2 : state.score >= STAR_TARGETS[0] ? 1 : 0;
    state.dayStars[state.day] = state.stars;
    state.total += state.score;
    if (state.day >= DAYS) state.gameOver = true;
  }

  function loseHeart(reason) {
    if (state.dayOver) return reason;
    state.hearts -= 1;
    state.combo = 0;
    state.missed += 1;
    state.dayMissed += 1;
    state.servesSinceLoss = 0;
    if (state.hearts <= 0) endDay();
    return reason;
  }

  /** One fixed step: timers, patience, cooking, spawning. Returns event flags. */
  function step(dt) {
    let events = 0;
    if (state.dayOver) return events;
    const wasOver = state.dayOver;
    state.elapsed += dt;
    state.timeLeft -= dt;

    // New orders arrive faster in the last 30 seconds: the dinner rush.
    // v6: no new tickets in the final 10 s (nothing spawned then can be
    // finished), and no spawn while every live ticket is already doomed —
    // piling a fresh ticket onto a board of lost causes only manufactures
    // another walk-out. A delayed spawn retries 2 s later.
    const gap = ORDER_GAP[state.day - 1] * (state.timeLeft < 30 ? 0.75 : 1);
    state.orderTimer -= dt;
    if (state.orderTimer <= 0 && state.orders.length < MAX_ORDERS && state.timeLeft > 10) {
      const allDoomed = state.orders.length > 0 && state.orders.every(isDoomed);
      if (allDoomed) {
        state.orderTimer = 2;
      } else {
        spawnOrder();
        state.orderTimer = gap;
      }
    }

    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        const expired = { dishId: order.dish.id, at: state.elapsed };
        state.lastExpired = expired;
        state.recentExpired.push(expired);
        // Forget expiries older than 20 s: a dish served after that is a
        // genuinely wrong dish, not a late one.
        state.recentExpired = state.recentExpired.filter((e) => state.elapsed - e.at < 20);
        ping(1120, 120, 'Walked out!', 'bad');
        events |= EVENT_MISS;
        loseHeart('expired');
      }
    }

    // D1: a hearts-0 end must raise EVENT_DAY_END exactly like the timer
    // path does, or main.js never shows the day summary and the game
    // soft-locks on the frozen play screen.
    if (state.dayOver && !wasOver) {
      events |= EVENT_DAY_END;
      if (state.gameOver) events |= EVENT_GAME_OVER;
    }

    // Both chopping boards work in parallel (v6: two slots).
    for (const key of ['board', 'board2']) {
      const slot = state[key];
      if (slot && slot.progress < CHOP_SECONDS) {
        slot.progress += dt;
        if (slot.progress >= CHOP_SECONDS) {
          slot.item.state = 'chopped';
          events |= EVENT_CHOP_DONE;
          ping(centre(STATIONS.board).x, STATIONS.board.y - 14, 'Chopped!', 'good');
        }
      }
    }

    for (let slot = 0; slot < state.grill.length; slot += 1) {
      const cooking = state.grill[slot];
      if (!cooking) continue;
      if (cooking.progress < GRILL_SECONDS) {
        cooking.progress += dt;
        if (cooking.progress >= GRILL_SECONDS) {
          cooking.item.state = 'grilled';
          cooking.burnTimer = 0;
          events |= EVENT_GRILL_DONE;
          ping(centre(STATIONS.grill).x, STATIONS.grill.y - 14, 'Grilled!', 'good');
        }
      } else if (cooking.item.state === 'grilled') {
        cooking.burnTimer += dt;
        if (cooking.burnTimer >= BURN_SECONDS) {
          cooking.item.state = 'burnt';
          events |= EVENT_BURNT;
          ping(centre(STATIONS.grill).x, STATIONS.grill.y - 14, 'Burnt!', 'bad');
        }
      }
    }

    for (let i = state.pings.length - 1; i >= 0; i -= 1) {
      state.pings[i].life -= dt;
      if (state.pings[i].life <= 0) state.pings.splice(i, 1);
    }

    if (state.timeLeft <= 0) {
      state.timeLeft = 0;
      endDay();
      events |= EVENT_DAY_END;
      if (state.gameOver) events |= EVENT_GAME_OVER;
    }
    return events;
  }

  /**
   * Use the nearest station to the chef. `chef` carries {x, y, carrying} and is
   * updated in place. Returns event flags.
   */
  function interact(chef) {
    // D1: once the day is over the dead game takes no input — no serving
    // frozen tickets for score after the summary should have appeared.
    if (state.dayOver) return 0;
    const station = nearestStation(chef.x, chef.y);
    if (!station) return 0;
    const c = centre(STATIONS[station]);
    let events = 0;

    if (station === 'pantry') {
      const bin = nearestBin(chef.x, chef.y);
      if (!bin) {
        ping(chef.x, chef.y - 50, 'Step to a bin!', 'bad');
        return EVENT_ERROR;
      }
      if (chef.carrying) {
        // v6 (P2-7): a raw ingredient can go back on the shelf.
        if (chef.carrying.type === 'ingredient' && chef.carrying.state === 'raw') {
          chef.carrying = null;
          state.carrying = null;
          ping(c.x, STATIONS.pantry.y - 14, 'Put back.', 'info');
          return EVENT_PLACE;
        }
        ping(chef.x, chef.y - 50, 'Hands full!', 'bad');
        return EVENT_ERROR;
      }
      const ingredient = INGREDIENTS[bin.id];
      chef.carrying = {
        type: 'ingredient',
        ingredient: bin.id,
        state: ingredient.prep === 'none' ? 'ready' : 'raw',
      };
      state.carrying = chef.carrying;
      return EVENT_PICKUP;
    }

    if (station === 'board') {
      // Two boards (v6): place on the first free slot, pick up the first
      // finished chop. Every rejection says why instead of silently nothing.
      if (chef.carrying && chef.carrying.type === 'ingredient') {
        const ingredient = INGREDIENTS[chef.carrying.ingredient];
        if (ingredient.prep === 'chop' && chef.carrying.state === 'raw') {
          const free = state.board === null ? 'board' : state.board2 === null ? 'board2' : null;
          if (free) {
            state[free] = { item: chef.carrying, progress: 0 };
            chef.carrying = null;
            state.carrying = null;
            return EVENT_PLACE;
          }
          ping(chef.x, chef.y - 50, 'Board busy!', 'bad');
          return EVENT_ERROR;
        }
        ping(chef.x, chef.y - 50, ingredient.prep === 'grill' ? 'Needs grilling!' : 'Already chopped!', 'bad');
        return EVENT_ERROR;
      }
      if (!chef.carrying) {
        for (const key of ['board', 'board2']) {
          const slot = state[key];
          if (slot && slot.progress >= CHOP_SECONDS) {
            chef.carrying = slot.item;
            state.carrying = chef.carrying;
            state[key] = null;
            return EVENT_PICKUP;
          }
        }
        if (state.board || state.board2) {
          ping(chef.x, chef.y - 50, 'Still chopping…', 'bad');
          return EVENT_ERROR;
        }
      }
      return 0;
    }

    if (station === 'grill') {
      if (chef.carrying && chef.carrying.type === 'ingredient') {
        const ingredient = INGREDIENTS[chef.carrying.ingredient];
        if (ingredient.prep === 'grill' && chef.carrying.state === 'raw') {
          const slot = state.grill[0] === null ? 0 : state.grill[1] === null ? 1 : -1;
          if (slot >= 0) {
            state.grill[slot] = { item: chef.carrying, progress: 0, burnTimer: 0 };
            chef.carrying = null;
            state.carrying = null;
            return EVENT_PLACE;
          }
          ping(chef.x, chef.y - 50, 'Grill full!', 'bad');
          return EVENT_ERROR;
        }
        ping(chef.x, chef.y - 50, ingredient.prep === 'chop' ? 'Needs chopping!' : 'Already grilled!', 'bad');
        return EVENT_ERROR;
      }
      if (chef.carrying) {
        ping(chef.x, chef.y - 50, 'Carrying a dish!', 'bad');
        return EVENT_ERROR;
      }
      for (let slot = 0; slot < state.grill.length; slot += 1) {
        const cooking = state.grill[slot];
        if (cooking && (cooking.item.state === 'grilled' || cooking.item.state === 'burnt')) {
          chef.carrying = cooking.item;
          state.carrying = chef.carrying;
          state.grill[slot] = null;
          return EVENT_PICKUP;
        }
      }
      if (state.grill.some(Boolean)) {
        ping(chef.x, chef.y - 50, 'Still grilling…', 'bad');
        return EVENT_ERROR;
      }
      return 0;
    }

    if (station === 'plating') {
      if (!chef.carrying && state.plateDish) {
        chef.carrying = { type: 'dish', dish: state.plateDish.id };
        state.carrying = chef.carrying;
        state.plate = [];
        state.plateDish = null;
        return EVENT_PICKUP;
      }
      if (chef.carrying && chef.carrying.type === 'ingredient') {
        if (chef.carrying.state === 'burnt') {
          ping(chef.x, chef.y - 50, 'Burnt — trash it!', 'bad');
          return EVENT_ERROR;
        }
        if (chef.carrying.state === 'raw') {
          ping(chef.x, chef.y - 50, 'Not ready yet!', 'bad');
          return EVENT_ERROR;
        }
        if (state.plate.length >= 3) {
          ping(chef.x, chef.y - 50, 'Plate full!', 'bad');
          return EVENT_WRONG;
        }
        const ingredient = INGREDIENTS[chef.carrying.ingredient];
        // v6 (P1-5): warn when no live ticket wants this ingredient.
        const wanted = state.orders.some((o) => o.dish.needs.includes(chef.carrying.ingredient));
        state.plate.push(chef.carrying);
        chef.carrying = null;
        state.carrying = null;
        const dish = dishForPlate(state.plate);
        if (dish) {
          state.plateDish = dish;
          ping(c.x, STATIONS.plating.y - 14, `${dish.short} ready!`, 'good');
          return EVENT_PLACE | EVENT_PLATE_READY;
        }
        if (!wanted) ping(c.x, STATIONS.plating.y - 14, `No ticket wants ${ingredient.name}!`, 'bad');
        return EVENT_PLACE;
      }
      return 0;
    }

    if (station === 'serve') {
      if (chef.carrying && chef.carrying.type === 'dish') {
        const dishId = chef.carrying.dish;
        const index = state.orders.findIndex((order) => order.dish.id === dishId);
        if (index >= 0) {
          const order = state.orders[index];
          const dish = order.dish;
          const patienceShare = Math.max(0, order.patience / order.maxPatience);
          const tip = Math.round(dish.price * 0.5 * patienceShare);
          const multiplier = 1 + COMBO_STEP * Math.min(state.combo, 4);
          const earned = Math.round((dish.price + tip) * multiplier);
          state.score += earned;
          state.combo += 1;
          // v6 earn-back: the 2nd clean serve AFTER a heart is lost earns it
          // back (streak-independent). The old even-combo rule almost never
          // fired after a loss, because the loss itself resets the combo.
          if (state.hearts < state.maxHearts) {
            state.servesSinceLoss += 1;
            if (state.servesSinceLoss >= 2) {
              state.hearts += 1;
              state.servesSinceLoss = 0;
              ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 78, '♥ +1!', 'good');
            }
          }
          state.bestCombo = Math.max(state.bestCombo, state.combo);
          state.dayBestCombo = Math.max(state.dayBestCombo, state.combo);
          state.served += 1;
          state.dayServed += 1;
          state.orders.splice(index, 1);
          chef.carrying = null;
          state.carrying = null;
          ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 26, `+$${earned}`, 'coin');
          if (state.combo >= 2) ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 52, `Combo x${multiplier.toFixed(2).replace(/\.?0+$/, '')}!`, 'good');
          return EVENT_SERVE | EVENT_BELL;
        }
        // D3/v6: the dish matches no live ticket. If its ticket walked out
        // recently, the serve is simply too late — ring the bell, keep the
        // dish, lose no heart. One ticket, one heart.
        const late = state.recentExpired.find((e) => e.dishId === dishId
          && state.elapsed - e.at < 20);
        if (late) {
          ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 26, 'Too late!', 'bad');
          return EVENT_BELL;
        }
        // Wrong dish: a heart is lost, but the dish is KEPT (v6) — serve it
        // to a matching ticket when one arrives, or trash it deliberately.
        ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 26, 'Wrong dish! Dish kept.', 'bad');
        events |= EVENT_WRONG;
        loseHeart('wrong');
        // D1: a hearts-0 end from a wrong dish must also raise the day-end
        // event, or the summary screen never appears.
        if (state.dayOver) {
          events |= EVENT_DAY_END;
          if (state.gameOver) events |= EVENT_GAME_OVER;
        }
        return events;
      }
      if (!chef.carrying) {
        ping(chef.x, chef.y - 50, 'Nothing to serve!', 'bad');
        return EVENT_ERROR;
      }
      ping(chef.x, chef.y - 50, 'Plate it first!', 'bad');
      return EVENT_ERROR;
    }

    if (station === 'trash') {
      if (chef.carrying) {
        chef.carrying = null;
        state.carrying = null;
        state.trashArmedAt = -99;
        return EVENT_TRASH;
      }
      if (state.plate.length > 0) {
        // v6: clearing the whole plate needs a second press within 3 s —
        // the old silent clear ate a nearly-finished dish by accident.
        if (state.elapsed - state.trashArmedAt < 3) {
          state.plate = [];
          state.plateDish = null;
          state.trashArmedAt = -99;
          return EVENT_TRASH;
        }
        state.trashArmedAt = state.elapsed;
        ping(chef.x, chef.y - 50, 'Press again to clear the plate!', 'bad');
        return EVENT_ERROR;
      }
      ping(chef.x, chef.y - 50, 'Nothing to trash!', 'bad');
      return EVENT_ERROR;
    }

    return events;
  }

  startDay(1);
  return { state, startDay, step, interact, nearestStation, stationDistance, dishForPlate };
}

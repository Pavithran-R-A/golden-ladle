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
  DAYS,
  DAY_SECONDS,
  DISHES,
  GRILL_SECONDS,
  HEARTS,
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
    served: 0,
    missed: 0,
    dayServed: 0,
    orders: [],
    orderTimer: 5,
    nextOrderId: 1,
    ordersSpawned: 0,
    /** Last ticket that walked out: {dishId, at} in game seconds, so a serve
     * arriving just too late is a "Too late!" (no heart) rather than a
     * second "Wrong dish!" heart for the same ticket (D3). */
    lastExpired: null,
    board: null,
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
    const patience = PATIENCE[state.day - 1] + (random() * 4 - 2);
    state.orders.push({
      id: state.nextOrderId,
      dish,
      patience,
      maxPatience: patience,
    });
    state.nextOrderId += 1;
    state.ordersSpawned += 1;
  }

  function startDay(day) {
    state.day = day;
    state.timeLeft = DAY_SECONDS;
    state.score = 0;
    state.combo = 0;
    state.hearts = HEARTS;
    state.dayServed = 0;
    state.orders = [];
    state.orderTimer = 5;
    state.ordersSpawned = 0;
    state.lastExpired = null;
    state.board = null;
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
    state.total += state.score;
    if (state.day >= DAYS) state.gameOver = true;
  }

  function loseHeart(reason) {
    if (state.dayOver) return reason;
    state.hearts -= 1;
    state.combo = 0;
    state.missed += 1;
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
    const gap = ORDER_GAP[state.day - 1] * (state.timeLeft < 30 ? 0.75 : 1);
    state.orderTimer -= dt;
    if (state.orderTimer <= 0 && state.orders.length < MAX_ORDERS) {
      spawnOrder();
      state.orderTimer = gap;
    }

    for (let i = state.orders.length - 1; i >= 0; i -= 1) {
      const order = state.orders[i];
      order.patience -= dt;
      if (order.patience <= 0) {
        state.orders.splice(i, 1);
        state.lastExpired = { dishId: order.dish.id, at: state.elapsed };
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

    if (state.board && state.board.progress < CHOP_SECONDS) {
      state.board.progress += dt;
      if (state.board.progress >= CHOP_SECONDS) {
        state.board.item.state = 'chopped';
        events |= EVENT_CHOP_DONE;
        ping(centre(STATIONS.board).x, STATIONS.board.y - 14, 'Chopped!', 'good');
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
      if (!bin || chef.carrying) return 0;
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
      if (!state.board && chef.carrying && chef.carrying.type === 'ingredient') {
        const ingredient = INGREDIENTS[chef.carrying.ingredient];
        if (ingredient.prep === 'chop' && chef.carrying.state === 'raw') {
          state.board = { item: chef.carrying, progress: 0 };
          chef.carrying = null;
          state.carrying = null;
          return EVENT_PLACE;
        }
      }
      if (state.board && state.board.progress >= CHOP_SECONDS && !chef.carrying) {
        chef.carrying = state.board.item;
        state.carrying = chef.carrying;
        state.board = null;
        return EVENT_PICKUP;
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
        }
      }
      if (!chef.carrying) {
        for (let slot = 0; slot < state.grill.length; slot += 1) {
          const cooking = state.grill[slot];
          if (cooking && (cooking.item.state === 'grilled' || cooking.item.state === 'burnt')) {
            chef.carrying = cooking.item;
            state.carrying = chef.carrying;
            state.grill[slot] = null;
            return EVENT_PICKUP;
          }
        }
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
      if (chef.carrying && chef.carrying.type === 'ingredient' && chef.carrying.state !== 'raw' && chef.carrying.state !== 'burnt') {
        if (state.plate.length >= 3) return EVENT_WRONG;
        state.plate.push(chef.carrying);
        chef.carrying = null;
        state.carrying = null;
        const dish = dishForPlate(state.plate);
        if (dish) {
          state.plateDish = dish;
          ping(c.x, STATIONS.plating.y - 14, `${dish.short} ready!`, 'good');
          return EVENT_PLACE | EVENT_PLATE_READY;
        }
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
          // D2 (v5): every 2nd consecutive clean serve earns a heart back
          // (up to the max). At every 3rd it never fired in live play —
          // by the time a heart was lost, three clean serves in a row
          // almost never happened before the next walk-out — so the
          // rescue the rebalance promised did not exist for a real player.
          if (state.combo % 2 === 0 && state.hearts < HEARTS) {
            state.hearts += 1;
            ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 78, '♥ +1!', 'good');
          }
          state.bestCombo = Math.max(state.bestCombo, state.combo);
          state.served += 1;
          state.dayServed += 1;
          state.orders.splice(index, 1);
          chef.carrying = null;
          state.carrying = null;
          ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 26, `+$${earned}`, 'coin');
          if (state.combo >= 2) ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 52, `Combo x${multiplier.toFixed(2).replace(/\.?0+$/, '')}!`, 'good');
          return EVENT_SERVE | EVENT_BELL;
        }
        // D3: the dish matches no live ticket. If it is the dish whose
        // ticket just walked out, the serve is simply too late — ring the
        // bell, keep the dish, lose no heart. One ticket, one heart.
        if (state.lastExpired && state.lastExpired.dishId === dishId
          && state.elapsed - state.lastExpired.at < 15) {
          ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 26, 'Too late!', 'bad');
          return EVENT_BELL;
        }
        chef.carrying = null;
        state.carrying = null;
        ping(c.x, STATIONS.serve.y + STATIONS.serve.height + 26, 'Wrong dish!', 'bad');
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
      return 0;
    }

    if (station === 'trash') {
      if (chef.carrying) {
        chef.carrying = null;
        state.carrying = null;
        return EVENT_TRASH;
      }
      if (state.plate.length > 0) {
        state.plate = [];
        state.plateDish = null;
        return EVENT_TRASH;
      }
      return 0;
    }

    return events;
  }

  startDay(1);
  return { state, startDay, step, interact, nearestStation, stationDistance, dishForPlate };
}

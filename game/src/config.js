// Every tuning number, colour and recipe for Golden Ladle in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** How long one shift (one day) lasts, in seconds. */
export const DAY_SECONDS = 100;
/** Days in a full run of the game. */
export const DAYS = 3;
/** Hearts lost when an order expires or a wrong dish is served. */
export const HEARTS = 3;
/** Hearts at the start of each day: Day 3 gets a 4th heart (v6). */
export const HEARTS_BY_DAY = [3, 3, 4];

/** Earnings that earn 1, 2 and 3 stars at the end of each day. */
export const STAR_TARGETS = [55, 85, 110];

export const CHEF = {
  radius: 26,
  speed: 420,
  startX: 640,
  startY: 520,
};

/** Seconds an order waits before its customer walks away, per day. */
export const PATIENCE = [38, 44, 42];
/** Seconds between new orders arriving, per day. */
export const ORDER_GAP = [11, 12, 10];
/** Most tickets on the board at once. */
export const MAX_ORDERS = 3;

/** Chopping takes this long; grilling takes this long, then burns after this long again. */
export const CHOP_SECONDS = 0.8;
export const GRILL_SECONDS = 2.5;
export const BURN_SECONDS = 7;

/** Rough seconds a competent sequential player needs to cook + serve each
 * dish, at v6 pace (calibrated from the human-pace sim, not guessed): a
 * ticket whose remaining patience is below this can no longer be finished,
 * and the ticket flashes red to say so. */
export const COOK_ESTIMATE = { salad: 18, corncup: 13, burger: 21, tofubowl: 21 };

/** Combo: each clean serve in a row adds this much to the multiplier, up to this cap. */
export const COMBO_STEP = 0.25;
export const COMBO_MAX = 2;

/** The kitchen's stations, as rectangles the chef walks up to and uses. Pantry and
 * serve window run along the top edge; board, grill, plating and trash along the
 * bottom; the middle of the floor stays open so the chef walks freely. */
export const STATIONS = {
  pantry: { x: 40, y: 132, width: 660, height: 74 },
  board: { x: 60, y: 570, width: 240, height: 100 },
  grill: { x: 460, y: 560, width: 320, height: 110 },
  plating: { x: 880, y: 570, width: 240, height: 100 },
  serve: { x: 1000, y: 132, width: 240, height: 74 },
  trash: { x: 1160, y: 600, width: 90, height: 70 },
};

/** How close the chef must be to a station's centre to use it, in pixels. */
export const REACH = 115;

/** The open floor the chef walks on. */
export const FLOOR = { x: 30, y: 215, width: 1220, height: 340 };

/** Order tickets hang in a row under the HUD, left to right. */
export const TICKETS = { x: 40, y: 58, width: 220, height: 66, gap: 20 };

/** Pantry bins, left to right across the pantry counter. */
export const PANTRY_BINS = [
  { id: 'tomato', name: 'Tomato', x: 50, y: 140, width: 100, height: 58 },
  { id: 'lettuce', name: 'Lettuce', x: 160, y: 140, width: 100, height: 58 },
  { id: 'cheese', name: 'Cheese', x: 270, y: 140, width: 100, height: 58 },
  { id: 'patty', name: 'Patty', x: 380, y: 140, width: 100, height: 58 },
  { id: 'corn', name: 'Corn', x: 490, y: 140, width: 100, height: 58 },
  { id: 'tofu', name: 'Tofu', x: 600, y: 140, width: 100, height: 58 },
];

/**
 * Ingredients. `prep` is what the raw ingredient must go through before it can
 * be plated: chop on the board, grill on the grill, or none (straight from the pantry).
 */
export const INGREDIENTS = {
  tomato: { id: 'tomato', name: 'Tomato', prep: 'chop', color: '#e4574b', light: '#f28b7f' },
  lettuce: { id: 'lettuce', name: 'Lettuce', prep: 'chop', color: '#5da24a', light: '#8cc47a' },
  cheese: { id: 'cheese', name: 'Cheese', prep: 'none', color: '#f2b234', light: '#ffd66b' },
  patty: { id: 'patty', name: 'Patty', prep: 'grill', color: '#8a5a3b', light: '#b07a52' },
  corn: { id: 'corn', name: 'Corn', prep: 'grill', color: '#f2c230', light: '#ffe066' },
  tofu: { id: 'tofu', name: 'Tofu', prep: 'grill', color: '#f5efe0', light: '#fffaf0' },
};

/**
 * The menu. A dish is its name, the prepped ingredients it needs, its price, and
 * the earliest day it appears on the board.
 */
export const DISHES = [
  {
    id: 'salad',
    name: 'Sunny Garden Salad',
    short: 'Garden Salad',
    needs: ['tomato', 'lettuce'],
    price: 8,
    fromDay: 1,
  },
  {
    id: 'corncup',
    name: 'Ember Corn Cup',
    short: 'Corn Cup',
    needs: ['corn', 'cheese'],
    price: 10,
    fromDay: 1,
  },
  {
    id: 'burger',
    name: 'Golden Smash Burger',
    short: 'Smash Burger',
    needs: ['patty', 'tomato', 'cheese'],
    price: 14,
    fromDay: 2,
  },
  {
    id: 'tofubowl',
    name: 'Golden Tofu Bowl',
    short: 'Tofu Bowl',
    needs: ['tofu', 'lettuce', 'cheese'],
    price: 12,
    fromDay: 3,
  },
];

/** An item in the chef's hands or on a station: ingredient id + prep state. */
export function makeItem(ingredientId, state) {
  return { ingredient: ingredientId, state: state || 'raw' };
}

export const PALETTE = {
  wall: '#f7e8c9',
  wallTrim: '#e8cfa0',
  floor: '#c98d5f',
  floorDark: '#c68a58',
  floorLight: '#d69a68',
  floorGrout: '#9c6a3d',
  counterWood: '#a9713f',
  counterTop: '#c98f56',
  counterEdge: '#8a5a2e',
  steel: '#b9c2cc',
  steelDark: '#8d99a6',
  board: '#e8b04b',
  grill: '#3a3f47',
  grillHot: '#e05d3d',
  serve: '#fff3d6',
  ticket: '#fffaf0',
  ticketEdge: '#d8c49a',
  text: '#3a2a1a',
  muted: '#8a6f4d',
  cream: '#fff8e7',
  red: '#e4574b',
  green: '#5da24a',
  gold: '#f2b234',
  panel: '#5a3d24',
  panelLight: '#7a5636',
  hud: '#4a3220',
  danger: '#d64541',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

/** Where the best total is kept between visits (this browser only). */
export const BEST_KEY = 'golden-ladle.best';

/** The game's name, shown on the title screen, in the README and in the dossier. */
export const GAME_TITLE = 'The Golden Ladle';

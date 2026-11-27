// Keyboard and pointer input. Held keys give a steering direction; one-shot
// presses (start, use, pause, mute) are queued as bit flags and taken once by
// the loop, so a press between two frames is never lost and never counted
// twice. A click is a point in the 1280x720 logical field, plus a flag that a
// click happened.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_INTERACT = 4;
export const ACTION_MUTE = 8;
export const ACTION_CLICK = 16;
export const ACTION_RETRY = 32;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const INTERACT = new Set(['KeyE']);
const PAUSE = new Set(['KeyP', 'Escape']);
const MUTE = new Set(['KeyM']);
const RETRY = new Set(['KeyR']);

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false };
  let actions = 0;
  let click = null;

  window.addEventListener('keydown', (event) => {
    // v6: Space is BOTH confirm and interact — on menus it starts/advances
    // (CONFIRM), in play it uses the nearest station (INTERACT). The loop
    // only reads INTERACT during play and only CONFIRM on menus, so the two
    // flags never fight. Enter stays confirm-only.
    if (event.code === 'Space') {
      if (!event.repeat) actions |= ACTION_CONFIRM | ACTION_INTERACT;
    } else if (UP.has(event.code)) keys.up = true;
    else if (DOWN.has(event.code)) keys.down = true;
    else if (LEFT.has(event.code)) keys.left = true;
    else if (RIGHT.has(event.code)) keys.right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (INTERACT.has(event.code)) {
      if (!event.repeat) actions |= ACTION_INTERACT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (RETRY.has(event.code)) {
      if (!event.repeat) actions |= ACTION_RETRY;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (UP.has(event.code)) keys.up = false;
    else if (DOWN.has(event.code)) keys.down = false;
    else if (LEFT.has(event.code)) keys.left = false;
    else if (RIGHT.has(event.code)) keys.right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    keys.up = false;
    keys.down = false;
    keys.left = false;
    keys.right = false;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    click = {
      x: ((event.clientX - rect.left) / rect.width) * FIELD.width,
      y: ((event.clientY - rect.top) / rect.height) * FIELD.height,
    };
    actions |= ACTION_CLICK;
  });

  return {
    /** The held steering direction, each component -1, 0 or 1. */
    direction() {
      return {
        x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
        y: (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
      };
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The last click point, or null when there was none since the last call. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
  };
}

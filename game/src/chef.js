// Chef Juno: the cook the player steers. She walks the open floor with the
// keyboard, or to a clicked spot; she never leaves the floor rectangle. One
// object holds her position, what she carries, and her movement methods.

import { CHEF, FLOOR } from './config.js';

export function createChef() {
  const chef = {
    x: CHEF.startX,
    y: CHEF.startY,
    targetX: null,
    targetY: null,
    moving: false,
    facing: 1,
    carrying: null,
    bob: 0,

    reset() {
      chef.x = CHEF.startX;
      chef.y = CHEF.startY;
      chef.targetX = null;
      chef.targetY = null;
      chef.moving = false;
      chef.facing = 1;
      chef.carrying = null;
      chef.bob = 0;
    },

    /**
     * One step. `dirX`/`dirY` are the held keys (-1, 0 or 1 each); a keyboard
     * direction always beats a click target.
     */
    update(dt, dirX, dirY) {
      let vx = 0;
      let vy = 0;
      if (dirX !== 0 || dirY !== 0) {
        const length = Math.hypot(dirX, dirY) || 1;
        vx = (dirX / length) * CHEF.speed;
        vy = (dirY / length) * CHEF.speed;
        chef.targetX = null;
        chef.targetY = null;
      } else if (chef.targetX !== null && chef.targetY !== null) {
        const dx = chef.targetX - chef.x;
        const dy = chef.targetY - chef.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 6) {
          chef.targetX = null;
          chef.targetY = null;
        } else {
          vx = (dx / distance) * CHEF.speed;
          vy = (dy / distance) * CHEF.speed;
        }
      }
      chef.x += vx * dt;
      chef.y += vy * dt;
      chef.x = Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, chef.x));
      chef.y = Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, chef.y));
      chef.moving = vx !== 0 || vy !== 0;
      if (vx !== 0) chef.facing = vx > 0 ? 1 : -1;
      if (chef.moving) chef.bob += dt * 12;
    },

    /** Walk to a clicked point on the floor (clamped inside it). */
    walkTo(x, y) {
      chef.targetX = Math.min(FLOOR.x + FLOOR.width, Math.max(FLOOR.x, x));
      chef.targetY = Math.min(FLOOR.y + FLOOR.height, Math.max(FLOOR.y, y));
    },
  };

  return chef;
}

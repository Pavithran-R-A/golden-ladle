// Everything the eye sees, drawn on one canvas: the kitchen, Chef Juno, the
// order tickets, the HUD and the title, day-summary, pause and game-over
// screens. All art is vector shapes drawn here — no image files, no fonts
// loaded over the network. The playfield is a fixed 1280x720 logical area,
// scaled to fit the window.

import {
  CHOP_SECONDS,
  DAY_SECONDS,
  DAYS,
  DISHES,
  FIELD,
  FONT,
  GAME_TITLE,
  GRILL_SECONDS,
  INGREDIENTS,
  PALETTE,
  PANTRY_BINS,
  STAR_TARGETS,
  STATIONS,
  TICKETS,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_DAY = 'day';
export const SCREEN_OVER = 'over';

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 'bold'} ${size}px ${FONT}`;
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

/** One ingredient as a little drawn icon. `state` changes how it looks. */
export function drawIngredient(ctx, id, x, y, size, state) {
  const ingredient = INGREDIENTS[id];
  const r = size / 2;
  ctx.save();
  ctx.translate(x, y);
  if (state === 'burnt') {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#555';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.3, r * 0.25, 0, Math.PI * 2);
    ctx.arc(r * 0.3, r * 0.2, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    return;
  }
  if (id === 'tomato') {
    ctx.fillStyle = state === 'chopped' ? '#e4574b' : '#e4574b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c23a30';
    ctx.beginPath();
    ctx.arc(-r * 0.3, r * 0.25, r * 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5da24a';
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(-r * 0.5, -r * 0.4);
    ctx.lineTo(r * 0.5, -r * 0.4);
    ctx.closePath();
    ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = '#f7b0a8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, 0);
      ctx.lineTo(r * 0.6, 0);
      ctx.moveTo(0, -r * 0.6);
      ctx.lineTo(0, r * 0.6);
      ctx.stroke();
    }
  } else if (id === 'lettuce') {
    ctx.fillStyle = '#5da24a';
    for (let i = 0; i < 5; i += 1) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#8cc47a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'chopped') {
      ctx.strokeStyle = '#3d7a33';
      ctx.lineWidth = 2;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.4, -r * 0.5);
        ctx.lineTo(i * r * 0.4, r * 0.5);
        ctx.stroke();
      }
    }
  } else if (id === 'cheese') {
    ctx.fillStyle = '#f2b234';
    ctx.beginPath();
    ctx.moveTo(-r, r * 0.6);
    ctx.lineTo(r, r * 0.6);
    ctx.lineTo(r, -r * 0.2);
    ctx.lineTo(-r, -r * 0.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#d18f1d';
    ctx.beginPath();
    ctx.arc(-r * 0.3, r * 0.2, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.35, -r * 0.1, r * 0.14, 0, Math.PI * 2);
    ctx.arc(r * 0.1, r * 0.4, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (id === 'patty') {
    ctx.fillStyle = state === 'grilled' ? '#6b4226' : '#8a5a3b';
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state === 'grilled' ? '#4a2c17' : '#a5714a';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    if (state === 'grilled') {
      ctx.strokeStyle = '#2e1a0c';
      ctx.lineWidth = 2.5;
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(i * r * 0.45 - r * 0.3, -r * 0.6);
        ctx.lineTo(i * r * 0.45 + r * 0.3, r * 0.6);
        ctx.stroke();
      }
    }
  } else if (id === 'corn') {
    ctx.fillStyle = state === 'grilled' ? '#d9a41f' : '#f2c230';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.62, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = state === 'grilled' ? '#8a6d1a' : '#fff0a8';
    for (let row = -2; row <= 2; row += 1) {
      for (let col = -1; col <= 1; col += 1) {
        ctx.beginPath();
        ctx.arc(col * r * 0.32, row * r * 0.34, r * 0.09, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (state === 'grilled') {
      ctx.strokeStyle = '#5c4510';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.5, -r * 0.5);
      ctx.lineTo(r * 0.5, r * 0.5);
      ctx.stroke();
    }
  } else if (id === 'tofu') {
    ctx.fillStyle = '#f5efe0';
    ctx.strokeStyle = '#d8c9a8';
    ctx.lineWidth = 2;
    rr(ctx, -r * 0.85, -r * 0.85, r * 1.7, r * 1.7, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = state === 'grilled' ? '#c98d4b' : '#e8dcc0';
    rr(ctx, -r * 0.5, -r * 0.5, r, r, 3);
    ctx.fill();
    if (state === 'grilled') {
      ctx.strokeStyle = '#8a5a2e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-r * 0.6, -r * 0.2);
      ctx.lineTo(r * 0.6, -r * 0.2);
      ctx.moveTo(-r * 0.6, r * 0.2);
      ctx.lineTo(r * 0.6, r * 0.2);
      ctx.stroke();
    }
  }
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const scale = Math.min(window.innerWidth / FIELD.width, window.innerHeight / FIELD.height);
    canvas.width = Math.round(FIELD.width * scale * dpr);
    canvas.height = Math.round(FIELD.height * scale * dpr);
    canvas.style.width = `${Math.round(FIELD.width * scale)}px`;
    canvas.style.height = `${Math.round(FIELD.height * scale)}px`;
    ctx.setTransform((canvas.width / FIELD.width), 0, 0, (canvas.height / FIELD.height), 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function drawFloor() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, 52);
    ctx.fillStyle = PALETTE.wallTrim;
    ctx.fillRect(0, 52, FIELD.width, 6);
    // Chequered terracotta floor.
    const tile = 64;
    for (let y = 58; y < FIELD.height; y += tile) {
      for (let x = 0; x < FIELD.width; x += tile) {
        const even = ((x / tile) | 0) % 2 === ((y / tile) | 0) % 2;
        ctx.fillStyle = even ? PALETTE.floorLight : PALETTE.floorDark;
        ctx.fillRect(x, y, tile, tile);
      }
    }
    // A round rug in the middle of the floor.
    ctx.fillStyle = '#a34d3a';
    ctx.beginPath();
    ctx.ellipse(640, 385, 190, 110, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#c96a4f';
    ctx.beginPath();
    ctx.ellipse(640, 385, 150, 84, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8a37c';
    ctx.beginPath();
    ctx.ellipse(640, 385, 104, 56, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawMenuBoard() {
    const x = 740;
    const y = 132;
    ctx.fillStyle = '#3a2a1a';
    rr(ctx, x, y, 220, 74, 10);
    ctx.fill();
    ctx.strokeStyle = '#c98f56';
    ctx.lineWidth = 3;
    rr(ctx, x + 4, y + 4, 212, 66, 7);
    ctx.stroke();
    text(ctx, "TODAY'S MENU", x + 110, y + 14, 12, '#ffd66b', 'center', 'bold');
    const lines = DISHES.slice(0, 3).map((d) => `${d.short}  $${d.price}`);
    lines.forEach((line, i) => text(ctx, line, x + 110, y + 32 + i * 14, 12, '#fff8e7', 'center', 'normal'));
  }

  function drawPantry(state, chef) {
    const s = STATIONS.pantry;
    ctx.fillStyle = PALETTE.counterWood;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.counterTop;
    rr(ctx, s.x, s.y, s.width, 16, 8);
    ctx.fill();
    for (const bin of PANTRY_BINS) {
      const near = state.nearestBin && chef && Math.hypot(chef.x - (bin.x + bin.width / 2), chef.y - (bin.y + bin.height / 2)) < 115;
      ctx.fillStyle = near ? '#fff3d6' : '#f7e8c9';
      rr(ctx, bin.x, bin.y, bin.width, bin.height, 6);
      ctx.fill();
      ctx.strokeStyle = PALETTE.counterEdge;
      ctx.lineWidth = 2;
      rr(ctx, bin.x, bin.y, bin.width, bin.height, 6);
      ctx.stroke();
      drawIngredient(ctx, bin.id, bin.x + 26, bin.y + 29, 34, 'raw');
      text(ctx, bin.name, bin.x + 62, bin.y + 29, 12, PALETTE.text, 'center', 'bold');
    }
    text(ctx, 'PANTRY', s.x + s.width / 2, s.y + s.height - 4, 10, '#e8d9b8', 'center', 'bold');
  }

  function drawServeWindow(state, chef) {
    const s = STATIONS.serve;
    const carryingDish = chef && chef.carrying && chef.carrying.type === 'dish';
    ctx.fillStyle = carryingDish ? '#ffe9a8' : PALETTE.serve;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.fill();
    ctx.strokeStyle = '#8a5a2e';
    ctx.lineWidth = 3;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.stroke();
    // Striped awning.
    for (let i = 0; i < 6; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? '#e4574b' : '#fff8e7';
      ctx.fillRect(s.x + 8 + i * 38, s.y + 6, 38, 14);
    }
    text(ctx, 'SERVE', s.x + 80, s.y + 36, 16, PALETTE.text, 'center', 'bold');
    // The service bell.
    ctx.fillStyle = '#f2b234';
    ctx.beginPath();
    ctx.arc(s.x + 196, s.y + 38, 14, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(s.x + 180, s.y + 38, 32, 5);
    ctx.fillStyle = '#8a5a2e';
    ctx.beginPath();
    ctx.arc(s.x + 196, s.y + 46, 3, 0, Math.PI * 2);
    ctx.fill();
    if (carryingDish) {
      ctx.fillStyle = '#e4574b';
      ctx.beginPath();
      ctx.arc(s.x + 196, s.y + 22, 5, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, 'Ring the bell!', s.x + 120, s.y + 62, 12, '#a33c2e', 'center', 'bold');
    }
  }

  function drawBoard(state) {
    const s = STATIONS.board;
    ctx.fillStyle = PALETTE.counterWood;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.board;
    rr(ctx, s.x + 14, s.y + 14, s.width - 28, s.height - 28, 6);
    ctx.fill();
    text(ctx, 'CHOP', s.x + s.width / 2, s.y + 14, 11, '#8a5a2e', 'center', 'bold');
    if (state.board) {
      const item = state.board.item;
      const progress = Math.min(1, state.board.progress / CHOP_SECONDS);
      drawIngredient(ctx, item.ingredient, s.x + s.width / 2, s.y + 52, 44, progress >= 1 ? 'chopped' : 'raw');
      ctx.fillStyle = '#3a2a1a';
      rr(ctx, s.x + 30, s.y + s.height - 18, s.width - 60, 8, 4);
      ctx.fill();
      ctx.fillStyle = progress >= 1 ? PALETTE.green : PALETTE.gold;
      rr(ctx, s.x + 30, s.y + s.height - 18, (s.width - 60) * progress, 8, 4);
      ctx.fill();
    } else {
      // The knife, resting.
      ctx.strokeStyle = '#c8d2dc';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(s.x + 40, s.y + 66);
      ctx.lineTo(s.x + 110, s.y + 40);
      ctx.stroke();
      ctx.strokeStyle = '#5a3d24';
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.moveTo(s.x + 110, s.y + 40);
      ctx.lineTo(s.x + 140, s.y + 30);
      ctx.stroke();
    }
  }

  function drawGrill(state) {
    const s = STATIONS.grill;
    ctx.fillStyle = PALETTE.counterWood;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.grill;
    rr(ctx, s.x + 12, s.y + 12, s.width - 24, s.height - 24, 6);
    ctx.fill();
    // Flame glow under the grates.
    const anyCooking = state.grill.some((slot) => slot && slot.progress < GRILL_SECONDS);
    ctx.fillStyle = anyCooking ? 'rgba(224,93,61,0.55)' : 'rgba(224,93,61,0.18)';
    rr(ctx, s.x + 20, s.y + s.height - 30, s.width - 40, 14, 6);
    ctx.fill();
    text(ctx, 'GRILL', s.x + s.width / 2, s.y + 22, 11, '#c8d2dc', 'center', 'bold');
    for (let slot = 0; slot < 2; slot += 1) {
      const cx = s.x + 80 + slot * 160;
      const cy = s.y + 58;
      const cooking = state.grill[slot];
      ctx.strokeStyle = '#6b7683';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, 34, 0, Math.PI * 2);
      ctx.stroke();
      if (cooking) {
        const progress = Math.min(1, cooking.progress / GRILL_SECONDS);
        drawIngredient(ctx, cooking.item.ingredient, cx, cy, 46, cooking.item.state);
        ctx.fillStyle = '#3a2a1a';
        rr(ctx, cx - 30, cy + 40, 60, 7, 3);
        ctx.fill();
        ctx.fillStyle = cooking.item.state === 'burnt' ? '#2b2b2b' : cooking.item.state === 'grilled' ? PALETTE.green : PALETTE.gold;
        rr(ctx, cx - 30, cy + 40, 60 * progress, 7, 3);
        ctx.fill();
        if (cooking.item.state === 'grilled') text(ctx, 'READY', cx, cy - 44, 11, '#8fe08a', 'center', 'bold');
        if (cooking.item.state === 'burnt') text(ctx, 'BURNT!', cx, cy - 44, 11, '#ff8a7a', 'center', 'bold');
      }
    }
  }

  function drawPlating(state) {
    const s = STATIONS.plating;
    ctx.fillStyle = PALETTE.counterWood;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.fill();
    ctx.fillStyle = '#fdf6e3';
    rr(ctx, s.x + 12, s.y + 12, s.width - 24, s.height - 24, 6);
    ctx.fill();
    text(ctx, 'PLATE', s.x + s.width / 2, s.y + 22, 11, '#8a6f4d', 'center', 'bold');
    const plateXs = [s.x + 60, s.x + 120, s.x + 180];
    state.plate.forEach((item, i) => {
      const px = plateXs[i];
      const py = s.y + 58;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8c49a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(px, py, 24, 0, Math.PI * 2);
      ctx.stroke();
      drawIngredient(ctx, item.ingredient, px, py, 30, item.state);
    });
    if (state.plateDish) {
      ctx.fillStyle = '#ffe9a8';
      rr(ctx, s.x + 12, s.y + s.height - 26, s.width - 24, 20, 6);
      ctx.fill();
      text(ctx, `${state.plateDish.short} ready — pick it up!`, s.x + s.width / 2, s.y + s.height - 15, 12, '#7a4d12', 'center', 'bold');
    } else if (state.plate.length === 0) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(s.x + 120, s.y + 58, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8c49a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.x + 120, s.y + 58, 24, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawTrash() {
    const s = STATIONS.trash;
    ctx.fillStyle = PALETTE.steel;
    rr(ctx, s.x, s.y, s.width, s.height, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.steelDark;
    rr(ctx, s.x + 6, s.y + 6, s.width - 12, 12, 4);
    ctx.fill();
    text(ctx, 'TRASH', s.x + s.width / 2, s.y + s.height - 12, 10, '#5a6a78', 'center', 'bold');
  }

  function drawChef(chef) {
    const bob = chef.moving ? Math.sin(chef.bob) * 3 : 0;
    const x = chef.x;
    const y = chef.y + bob * 0.3;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 24, 24, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body and apron.
    ctx.fillStyle = '#e4574b';
    rr(ctx, x - 20, y - 6, 40, 30, 12);
    ctx.fill();
    ctx.fillStyle = '#fff8e7';
    rr(ctx, x - 14, y + 2, 28, 20, 8);
    ctx.fill();
    // Head.
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(x, y - 20, 16, 0, Math.PI * 2);
    ctx.fill();
    // Toque.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x - 9, y - 34, 8, 0, Math.PI * 2);
    ctx.arc(x, y - 38, 9, 0, Math.PI * 2);
    ctx.arc(x + 9, y - 34, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x - 15, y - 34, 30, 7);
    // Face.
    ctx.fillStyle = '#3a2a1a';
    ctx.beginPath();
    ctx.arc(x - 6, y - 21, 2, 0, Math.PI * 2);
    ctx.arc(x + 6, y - 21, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3a2a1a';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(x, y - 17, 5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    // Arms.
    ctx.strokeStyle = '#e4574b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x - 18, y + 4);
    ctx.lineTo(x - 28, y + 14 + bob);
    ctx.moveTo(x + 18, y + 4);
    ctx.lineTo(x + 28, y + 14 - bob);
    ctx.stroke();
    // What she carries, held high.
    if (chef.carrying) {
      const cy = y - 58;
      ctx.fillStyle = 'rgba(255,248,231,0.95)';
      ctx.beginPath();
      ctx.arc(x, cy, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#d8c49a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, cy, 22, 0, Math.PI * 2);
      ctx.stroke();
      if (chef.carrying.type === 'dish') {
        const dish = DISHES.find((d) => d.id === chef.carrying.dish);
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, cy, 15, 0, Math.PI * 2);
        ctx.fill();
        dish.needs.forEach((id, i) => {
          const angle = (i / dish.needs.length) * Math.PI * 2 - Math.PI / 2;
          drawIngredient(ctx, id, x + Math.cos(angle) * 8, cy + Math.sin(angle) * 8, 13, 'ready');
        });
      } else {
        drawIngredient(ctx, chef.carrying.ingredient, x, cy, 30, chef.carrying.state);
      }
    }
  }

  function drawTicket(order, index) {
    const x = TICKETS.x + index * (TICKETS.width + TICKETS.gap);
    const y = TICKETS.y;
    const w = TICKETS.width;
    const h = TICKETS.height;
    const share = Math.max(0, order.patience / order.maxPatience);
    ctx.fillStyle = PALETTE.ticket;
    rr(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.strokeStyle = PALETTE.ticketEdge;
    ctx.lineWidth = 2;
    rr(ctx, x, y, w, h, 8);
    ctx.stroke();
    // Hanging pin.
    ctx.fillStyle = '#e4574b';
    ctx.beginPath();
    ctx.arc(x + w / 2, y + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    text(ctx, order.dish.short, x + 12, y + 20, 14, PALETTE.text, 'left', 'bold');
    text(ctx, `$${order.dish.price}`, x + w - 12, y + 20, 14, '#7a4d12', 'right', 'bold');
    order.dish.needs.forEach((id, i) => {
      drawIngredient(ctx, id, x + 24 + i * 30, y + 44, 24, 'ready');
    });
    // Patience bar.
    ctx.fillStyle = '#e8dcc0';
    rr(ctx, x + 100, y + 38, 104, 10, 5);
    ctx.fill();
    ctx.fillStyle = share > 0.5 ? PALETTE.green : share > 0.25 ? PALETTE.gold : PALETTE.danger;
    rr(ctx, x + 100, y + 38, 104 * share, 10, 5);
    ctx.fill();
    if (share <= 0.25) text(ctx, 'HURRY!', x + 152, y + 58, 10, PALETTE.danger, 'center', 'bold');
  }

  function drawHud(state) {
    ctx.fillStyle = PALETTE.hud;
    ctx.fillRect(0, 0, FIELD.width, 52);
    text(ctx, `DAY ${state.day}/${DAYS}`, 70, 26, 16, '#ffd66b', 'center', 'bold');
    // Shift timer.
    const seconds = Math.max(0, Math.ceil(state.timeLeft));
    const minutes = Math.floor(seconds / 60);
    const secs = String(seconds % 60).padStart(2, '0');
    text(ctx, `${minutes}:${secs}`, 170, 26, 18, '#fff8e7', 'center', 'bold');
    ctx.fillStyle = '#3a2a1a';
    rr(ctx, 220, 16, 220, 20, 10);
    ctx.fill();
    const share = state.timeLeft / DAY_SECONDS;
    ctx.fillStyle = share > 0.5 ? PALETTE.green : share > 0.25 ? PALETTE.gold : PALETTE.danger;
    rr(ctx, 220, 16, 220 * share, 20, 10);
    ctx.fill();
    if (state.timeLeft < 30) text(ctx, 'DINNER RUSH!', 560, 26, 15, '#ff9a7a', 'center', 'bold');
    text(ctx, `SCORE $${state.score}`, 700, 26, 18, '#fff8e7', 'center', 'bold');
    if (state.combo >= 2) {
      const mult = 1 + 0.25 * Math.min(state.combo, 4);
      ctx.fillStyle = '#e4574b';
      rr(ctx, 800, 12, 120, 28, 14);
      ctx.fill();
      text(ctx, `COMBO x${mult.toFixed(2).replace(/\.?0+$/, '')}`, 860, 27, 15, '#fff8e7', 'center', 'bold');
    }
    // Hearts.
    for (let i = 0; i < 3; i += 1) {
      text(ctx, '♥', 1000 + i * 30, 27, 22, i < state.hearts ? '#ff6b6b' : '#5a4632', 'center', 'bold');
    }
    text(ctx, `TOTAL $${state.total}`, 1150, 26, 15, '#ffd66b', 'center', 'bold');
  }

  function drawPings(state) {
    for (const ping of state.pings) {
      ctx.globalAlpha = Math.min(1, ping.life);
      const color = ping.kind === 'coin' ? '#ffd66b' : ping.kind === 'good' ? '#8fe08a' : ping.kind === 'bad' ? '#ff8a7a' : '#fff8e7';
      text(ctx, ping.text, ping.x, ping.y - (1.4 - ping.life) * 30, ping.kind === 'coin' ? 22 : 16, color, 'center', 'bold');
    }
    ctx.globalAlpha = 1;
  }

  function drawKitchen(state, chef) {
    drawFloor();
    drawMenuBoard();
    drawPantry(state, chef);
    drawServeWindow(state, chef);
    drawBoard(state);
    drawGrill(state);
    drawPlating(state);
    drawTrash();
    // Ticket row.
    state.orders.forEach((order, i) => drawTicket(order, i));
    drawChef(chef);
    drawPings(state);
  }

  function drawStars(cx, y, count, size) {
    for (let i = 0; i < 3; i += 1) {
      text(ctx, '★', cx + (i - 1) * (size + 14), y, size, i < count ? '#f2b234' : '#5a4632', 'center', 'bold');
    }
  }

  function drawPanel(x, y, w, h) {
    ctx.fillStyle = 'rgba(40,24,12,0.55)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#fff8e7';
    rr(ctx, x, y, w, h, 18);
    ctx.fill();
    ctx.strokeStyle = '#c98f56';
    ctx.lineWidth = 4;
    rr(ctx, x, y, w, h, 18);
    ctx.stroke();
  }

  function drawTitle(state, best) {
    drawKitchen(state, { x: 640, y: 420, moving: false, bob: 0, facing: 1, carrying: null });
    ctx.fillStyle = 'rgba(40,24,12,0.45)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, GAME_TITLE, 640, 180, 72, '#ffd66b', 'center', 'bold');
    ctx.strokeStyle = '#7a4d12';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(340, 215);
    ctx.lineTo(940, 215);
    ctx.stroke();
    text(ctx, "Chef Juno's street-food rush", 640, 245, 26, '#fff8e7', 'center', 'normal');
    text(ctx, 'Take orders. Chop, grill, plate, serve. Beat the clock.', 640, 290, 20, '#ffe9c4', 'center', 'normal');
    text(ctx, 'WASD / arrows or click to move  •  Space / E or click a station to use it', 640, 340, 17, '#fff8e7', 'center', 'normal');
    text(ctx, '4 dishes  •  3 days  •  feed the rush, keep your combo alive', 640, 372, 17, '#fff8e7', 'center', 'normal');
    if (best > 0) text(ctx, `Best total: $${best}`, 640, 412, 18, '#ffd66b', 'center', 'bold');
    ctx.fillStyle = '#e4574b';
    rr(ctx, 500, 450, 280, 56, 28);
    ctx.fill();
    text(ctx, '▶  START COOKING', 640, 479, 22, '#fff8e7', 'center', 'bold');
    text(ctx, 'Press Enter or click anywhere', 640, 530, 15, '#ffe9c4', 'center', 'normal');
  }

  function drawDaySummary(state) {
    drawKitchen(state, { x: 640, y: 420, moving: false, bob: 0, facing: 1, carrying: null });
    drawPanel(390, 150, 500, 400);
    text(ctx, `Day ${state.day} complete!`, 640, 200, 34, PALETTE.text, 'center', 'bold');
    drawStars(640, 260, state.stars, 44);
    text(ctx, `Earned today: $${state.score}`, 640, 320, 22, PALETTE.text, 'center', 'bold');
    text(ctx, `Served ${state.dayServed}  •  Walked out ${state.missed}`, 640, 352, 18, PALETTE.muted, 'center', 'normal');
    text(ctx, `Best combo x${(1 + 0.25 * Math.min(state.bestCombo, 4)).toFixed(2).replace(/\.?0+$/, '')}`, 640, 380, 18, PALETTE.muted, 'center', 'normal');
    text(ctx, `Star targets: $${STAR_TARGETS[0]} / $${STAR_TARGETS[1]} / $${STAR_TARGETS[2]}`, 640, 412, 15, PALETTE.muted, 'center', 'normal');
    text(ctx, state.day < DAYS ? 'Press Enter for the next day' : 'Press Enter for your total', 640, 490, 20, '#a33c2e', 'center', 'bold');
  }

  function drawGameOver(state, best) {
    drawKitchen(state, { x: 640, y: 420, moving: false, bob: 0, facing: 1, carrying: null });
    drawPanel(390, 140, 500, 430);
    text(ctx, 'Service complete!', 640, 195, 34, PALETTE.text, 'center', 'bold');
    text(ctx, 'Three days, one golden ladle.', 640, 232, 18, PALETTE.muted, 'center', 'normal');
    drawStars(640, 285, state.stars, 40);
    text(ctx, `Total earned: $${state.total}`, 640, 340, 26, PALETTE.text, 'center', 'bold');
    text(ctx, `Best total: $${Math.max(best, state.total)}`, 640, 375, 20, '#7a4d12', 'center', 'bold');
    text(ctx, `Dishes served: ${state.served}  •  Best combo x${(1 + 0.25 * Math.min(state.bestCombo, 4)).toFixed(2).replace(/\.?0+$/, '')}`, 640, 410, 18, PALETTE.muted, 'center', 'normal');
    text(ctx, 'Press Enter to cook again', 640, 490, 20, '#a33c2e', 'center', 'bold');
  }

  function drawPaused() {
    ctx.fillStyle = 'rgba(40,24,12,0.6)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    text(ctx, 'Paused', 640, 330, 48, '#fff8e7', 'center', 'bold');
    text(ctx, 'P or Esc to keep cooking', 640, 380, 20, '#ffe9c4', 'center', 'normal');
  }

  return {
    draw(view) {
      ctx.clearRect(0, 0, FIELD.width, FIELD.height);
      const { state, chef, screen, best, particles } = view;
      if (screen === SCREEN_TITLE) {
        drawTitle(state, best);
        return;
      }
      if (screen === SCREEN_DAY) {
        drawDaySummary(state);
        return;
      }
      if (screen === SCREEN_OVER) {
        drawGameOver(state, best);
        return;
      }
      // The floor paints the top strip, so the HUD goes on after the kitchen.
      drawKitchen(state, chef);
      drawHud(state);
      if (particles) particles.draw(ctx);
      if (screen === SCREEN_PAUSED) drawPaused();
      if (view.flash > 0) {
        ctx.fillStyle = `rgba(214,69,65,${(view.flash * 0.3).toFixed(3)})`;
        ctx.fillRect(0, 0, FIELD.width, FIELD.height);
      }
    },
  };
}

// Juice: short-lived particles and floating score popups. Nothing here knows
// the rules; the caller spawns bursts (chop bits, steam, coin sparkles) and the
// renderer draws what is alive.

export function createParticles() {
  const list = [];

  function burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = (speed || 120) * (0.4 + Math.random() * 0.8);
      list.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 40,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
        size: 2 + Math.random() * 4,
        color,
        gravity: 260,
      });
    }
  }

  function steam(x, y) {
    list.push({
      x: x + (Math.random() * 24 - 12),
      y,
      vx: Math.random() * 10 - 5,
      vy: -28 - Math.random() * 14,
      life: 0.9,
      maxLife: 0.9,
      size: 7 + Math.random() * 6,
      color: 'rgba(255,255,255,0.55)',
      gravity: -30,
    });
  }

  function coins(x, y) {
    burst(x, y, '#f2c230', 14, 200);
    burst(x, y, '#ffe066', 8, 140);
  }

  function step(dt) {
    for (let i = list.length - 1; i >= 0; i -= 1) {
      const p = list[i];
      p.life -= dt;
      if (p.life <= 0) {
        list.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  function draw(ctx) {
    for (const p of list) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  return { burst, steam, coins, step, draw, list };
}

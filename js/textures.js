import * as THREE from "three";

// ---------------------------------------------------------------------------
// Everything that paints a texture onto a Canvas 2D context or builds an item
// geometry. No external image/audio assets are used anywhere in this game —
// every painting, skydome, plaque, and treasure shape is generated here.
// ---------------------------------------------------------------------------

// ---- painterly helpers, shared by every canvas-painted texture below ----

export function radialGlow(ctx, x, y, r, colorInner, colorOuter) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, colorInner);
  g.addColorStop(1, colorOuter);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

// scatters short, softly-angled strokes to break up flat gradients into
// something that reads like visible brushwork instead of a digital gradient
export function paintStrokes(ctx, w, yFrom, yTo, count, colors, opts = {}) {
  const { minLen = 8, maxLen = 26, minAlpha = 0.03, maxAlpha = 0.11, width = 3 } = opts;
  ctx.lineCap = "round";
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = yFrom + Math.random() * (yTo - yFrom);
    const len = minLen + Math.random() * (maxLen - minLen);
    const angle = (Math.random() - 0.5) * 0.6; // mostly horizontal-ish strokes
    ctx.strokeStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = minAlpha + Math.random() * (maxAlpha - minAlpha);
    ctx.lineWidth = width * (0.6 + Math.random() * 0.9);
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * len * 0.5, y - Math.sin(angle) * len * 0.5);
    ctx.lineTo(x + Math.cos(angle) * len * 0.5, y + Math.sin(angle) * len * 0.5);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

export function addVignette(ctx, w, h, strength = 0.5) {
  const g = ctx.createRadialGradient(w / 2, h / 2, w * 0.28, w / 2, h / 2, w * 0.74);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function makePaintingTexture(theme) {
  const size = 768;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  if (theme.id === "stars") {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#080a20");
    sky.addColorStop(0.45, "#151a4a");
    sky.addColorStop(0.72, "#31337a");
    sky.addColorStop(0.85, "#5b4f8c");
    sky.addColorStop(1, "#7a5f7a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    // moon with a soft multi-ring glow
    radialGlow(ctx, 580, 150, 280, "rgba(253,246,216,0.35)", "rgba(253,246,216,0)");
    radialGlow(ctx, 580, 150, 150, "rgba(253,246,216,0.55)", "rgba(253,246,216,0)");
    radialGlow(ctx, 580, 150, 75, "#fdf6d8", "#f3e2a8");

    // swirling clouds, Van-Gogh-inspired spirals (an original stylized take, not a copy)
    const swirls = [
      { cx: 260, cy: 260, rMax: 130, turns: 2.4, color: "rgba(230,225,255,0.5)" },
      { cx: 560, cy: 410, rMax: 150, turns: 2.0, color: "rgba(200,210,255,0.4)" },
      { cx: 130, cy: 470, rMax: 110, turns: 2.6, color: "rgba(220,220,250,0.35)" },
    ];
    for (const sw of swirls) {
      ctx.strokeStyle = sw.color;
      ctx.lineWidth = 5;
      ctx.lineCap = "round";
      for (let arm = 0; arm < 2; arm++) {
        ctx.beginPath();
        const steps = 60;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const angle = t * Math.PI * 2 * sw.turns + arm * Math.PI;
          const r = t * sw.rMax;
          const x = sw.cx + Math.cos(angle) * r;
          const y = sw.cy + Math.sin(angle) * r * 0.8;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    // gentle horizontal drift lines for atmosphere
    for (let i = 0; i < 5; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.08 + i * 0.02})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      const y = 340 + i * 45;
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 24) {
        ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 14);
      }
      ctx.stroke();
    }

    // stars: soft glow + a few sparkle crosses for the brightest ones
    for (let i = 0; i < 110; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size * 0.68;
      const r = Math.random() * 2.2 + 0.7;
      radialGlow(ctx, x, y, r * 4, "rgba(255,255,255,0.5)", "rgba(255,255,255,0)");
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 7; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size * 0.55;
      const len = 14;
      ctx.strokeStyle = "rgba(255,255,255,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - len, y);
      ctx.lineTo(x + len, y);
      ctx.moveTo(x, y - len);
      ctx.lineTo(x, y + len);
      ctx.stroke();
    }

    paintStrokes(ctx, size, 0, size * 0.68, 160, [
      "rgba(255,255,255,0.06)",
      "rgba(120,130,200,0.08)",
      "rgba(60,50,110,0.08)",
    ]);

    // rolling dark hills near the bottom of the frame
    ctx.fillStyle = "#171233";
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, 560);
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, 585 + Math.sin(x * 0.018) * 32);
    }
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0d0a20";
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, 630);
    for (let x = 0; x <= size; x += 20) {
      ctx.lineTo(x, 650 + Math.sin(x * 0.024 + 2) * 24);
    }
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();

    // a lone flame-shaped tree silhouette for a sense of scale and composition
    ctx.fillStyle = "#0a0818";
    ctx.beginPath();
    ctx.moveTo(120, size);
    ctx.bezierCurveTo(75, 620, 175, 460, 128, 330);
    ctx.bezierCurveTo(200, 450, 215, 610, 168, size);
    ctx.closePath();
    ctx.fill();
  } else if (theme.id === "desert") {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#ffe9b8");
    sky.addColorStop(0.35, "#ffc478");
    sky.addColorStop(0.62, "#ff9d5c");
    sky.addColorStop(0.8, "#f0784f");
    sky.addColorStop(1, "#c9603f");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    radialGlow(ctx, 610, 150, 260, "rgba(255,246,217,0.55)", "rgba(255,246,217,0)");
    radialGlow(ctx, 610, 150, 100, "#fff6d9", "#ffdca0");

    // faint drifting heat-haze bands near the horizon
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = `rgba(255,255,255,${0.1 - i * 0.02})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      const y = 540 + i * 22;
      ctx.moveTo(0, y);
      for (let x = 0; x <= size; x += 30) ctx.lineTo(x, y + Math.sin(x * 0.02 + i) * 8);
      ctx.stroke();
    }

    paintStrokes(ctx, size, 0, size * 0.65, 150, [
      "rgba(255,230,190,0.07)",
      "rgba(255,160,110,0.07)",
      "rgba(200,90,60,0.06)",
    ]);

    // layered dunes with atmospheric perspective (far = pale, near = saturated)
    const dunes = [
      { y0: 610, amp: 30, color: "#e2a463", alpha: 0.9 },
      { y0: 670, amp: 35, color: "#c9803f", alpha: 0.95 },
      { y0: 725, amp: 26, color: "#a5602e", alpha: 1 },
    ];
    dunes.forEach((d, i) => {
      ctx.globalAlpha = d.alpha;
      ctx.fillStyle = d.color;
      ctx.beginPath();
      ctx.moveTo(0, size);
      ctx.lineTo(0, d.y0);
      for (let x = 0; x <= size; x += 16) {
        ctx.lineTo(x, d.y0 + Math.sin(x * 0.006 + i * 2) * d.amp);
      }
      ctx.lineTo(size, size);
      ctx.closePath();
      ctx.fill();
      // sunlit rim on each dune crest
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#ffe3ad";
      ctx.lineWidth = 4;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 16) {
        const y = d.y0 + Math.sin(x * 0.006 + i * 2) * d.amp;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.globalAlpha = 1;

    // cacti with simple two-tone shading and a soft ground shadow
    for (const [x, y, sc] of [
      [180, 745, 1],
      [330, 758, 0.8],
      [560, 752, 0.9],
    ]) {
      radialGlow(ctx, x + 8, y + 4, 34 * sc, "rgba(0,0,0,0.35)", "rgba(0,0,0,0)");
      ctx.fillStyle = "#3c6b34";
      ctx.fillRect(x - 10 * sc, y - 110 * sc, 20 * sc, 110 * sc);
      ctx.fillRect(x - 32 * sc, y - 74 * sc, 20 * sc, 55 * sc);
      ctx.fillRect(x + 12 * sc, y - 84 * sc, 20 * sc, 62 * sc);
      ctx.fillStyle = "#2a4f24";
      ctx.fillRect(x + 3 * sc, y - 110 * sc, 7 * sc, 110 * sc);
    }
  } else if (theme.id === "ocean") {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#8fd9e8");
    sky.addColorStop(0.25, "#3fa9c9");
    sky.addColorStop(0.5, "#146b93");
    sky.addColorStop(0.75, "#0a3d5c");
    sky.addColorStop(1, "#031824");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    // shafts of light from the surface
    ctx.globalAlpha = 0.16;
    for (const x of [150, 330, 510, 690]) {
      ctx.fillStyle = "#eafcff";
      ctx.beginPath();
      ctx.moveTo(x - 26, 0);
      ctx.lineTo(x + 26, 0);
      ctx.lineTo(x + 95, size);
      ctx.lineTo(x - 95, size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    paintStrokes(ctx, size, 0, size, 160, [
      "rgba(220,250,255,0.06)",
      "rgba(120,200,230,0.07)",
      "rgba(10,60,90,0.08)",
    ]);

    // layered waves: a soft wide stroke behind + a crisp thin one in front, per band
    for (let i = 0; i < 6; i++) {
      const y = 130 + i * 105;
      ctx.strokeStyle = `rgba(200,240,255,${0.12 + i * 0.02})`;
      ctx.lineWidth = 14;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 14) ctx.lineTo(x, y + Math.sin(x * 0.045 + i * 1.3) * 30);
      ctx.stroke();
      ctx.strokeStyle = `rgba(235,255,255,${0.25 + i * 0.03})`;
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      for (let x = 0; x <= size; x += 14) ctx.lineTo(x, y + Math.sin(x * 0.045 + i * 1.3) * 30);
      ctx.stroke();
    }

    // a couple of drifting fish silhouettes for a sense of life
    for (const [x, y, fs, dir] of [
      [280, 330, 1, 1],
      [560, 500, 0.75, -1],
    ]) {
      const sc = fs * dir;
      ctx.fillStyle = "rgba(10,30,45,0.55)";
      ctx.beginPath();
      ctx.ellipse(x, y, 30 * Math.abs(sc), 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x - 30 * sc, y);
      ctx.lineTo(x - 46 * sc, y - 11);
      ctx.lineTo(x - 46 * sc, y + 11);
      ctx.closePath();
      ctx.fill();
    }

    // bubbles with a tiny highlight for roundness
    for (let i = 0; i < 34; i++) {
      const x = Math.random() * size;
      const y = 380 + Math.random() * 340;
      const r = Math.random() * 9 + 2.5;
      ctx.strokeStyle = "rgba(220,250,255,0.45)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#020d16";
    ctx.fillRect(0, 690, size, size - 690);
  } else if (theme.id === "forest") {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#eaf6c8");
    sky.addColorStop(0.3, "#c3e296");
    sky.addColorStop(0.6, "#6f9f56");
    sky.addColorStop(0.85, "#33552e");
    sky.addColorStop(1, "#1c3320");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    // sunbeams filtering down through the canopy
    ctx.globalAlpha = 0.18;
    for (const x of [120, 320, 520, 700]) {
      ctx.fillStyle = "#fff6d0";
      ctx.beginPath();
      ctx.moveTo(x - 18, 0);
      ctx.lineTo(x + 18, 0);
      ctx.lineTo(x + 90, size);
      ctx.lineTo(x - 90, size);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // overlapping leaf-cluster blobs along the top for a canopy silhouette
    for (let i = 0; i < 14; i++) {
      const x = (i / 13) * size + (Math.random() - 0.5) * 60;
      const y = 40 + Math.random() * 70;
      radialGlow(ctx, x, y, 90, "rgba(30,60,25,0.55)", "rgba(30,60,25,0)");
    }

    paintStrokes(ctx, size, 0, size * 0.7, 170, [
      "rgba(255,255,220,0.06)",
      "rgba(120,180,90,0.08)",
      "rgba(40,80,40,0.08)",
    ]);

    // fireflies: small glowing motes
    for (let i = 0; i < 30; i++) {
      const x = Math.random() * size;
      const y = 260 + Math.random() * 380;
      radialGlow(ctx, x, y, 10, "rgba(210,255,150,0.6)", "rgba(210,255,150,0)");
      ctx.fillStyle = "#eaffb0";
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // tree trunks in the foreground
    for (const [x, w] of [
      [90, 46],
      [250, 34],
      [540, 40],
      [690, 50],
    ]) {
      const trunk = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
      trunk.addColorStop(0, "#1b1006");
      trunk.addColorStop(0.5, "#3a2412");
      trunk.addColorStop(1, "#160d05");
      ctx.fillStyle = trunk;
      ctx.fillRect(x - w / 2, 420, w, size - 420);
    }

    // low drifting mist near the ground
    ctx.fillStyle = "rgba(220,240,210,0.35)";
    ctx.fillRect(0, 660, size, 60);
    ctx.fillStyle = "rgba(220,240,210,0.22)";
    ctx.fillRect(0, 700, size, 68);
  } else if (theme.id === "volcano") {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#160a08");
    sky.addColorStop(0.35, "#3a1410");
    sky.addColorStop(0.6, "#6e2413");
    sky.addColorStop(0.82, "#a83a18");
    sky.addColorStop(1, "#5c1a10");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    // smoke plumes drifting up from the crater
    for (let i = 0; i < 6; i++) {
      const x = 400 + (Math.random() - 0.5) * 220;
      const y = 90 + Math.random() * 220;
      radialGlow(ctx, x, y, 130, "rgba(60,50,55,0.35)", "rgba(60,50,55,0)");
    }

    // embers drifting in the smoky air
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size * 0.7;
      radialGlow(ctx, x, y, 6, "rgba(255,150,60,0.7)", "rgba(255,150,60,0)");
      ctx.fillStyle = "#ffcf8a";
      ctx.beginPath();
      ctx.arc(x, y, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    paintStrokes(ctx, size, 0, size * 0.75, 170, [
      "rgba(255,160,90,0.07)",
      "rgba(120,40,30,0.08)",
      "rgba(40,20,20,0.08)",
    ]);

    // volcano silhouette with a glowing crater
    ctx.fillStyle = "#170c0a";
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(220, 380);
    ctx.lineTo(400, 260);
    ctx.lineTo(580, 380);
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();
    radialGlow(ctx, 400, 265, 90, "rgba(255,140,60,0.85)", "rgba(255,90,30,0)");
    ctx.fillStyle = "#ffb066";
    ctx.beginPath();
    ctx.arc(400, 268, 20, 0, Math.PI * 2);
    ctx.fill();

    // glowing lava cracks running down the slope
    ctx.strokeStyle = "#ff9450";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    for (const [sx, ex] of [
      [380, 300],
      [415, 470],
      [400, 360],
    ]) {
      ctx.beginPath();
      ctx.moveTo(sx, 300);
      ctx.quadraticCurveTo((sx + ex) / 2, 470, ex, 620);
      ctx.stroke();
    }

    // dark obsidian foreground rocks
    ctx.fillStyle = "#0e0806";
    ctx.beginPath();
    ctx.moveTo(0, size);
    ctx.lineTo(0, 700);
    for (let x = 0; x <= size; x += 40) {
      ctx.lineTo(x, 690 + Math.sin(x * 0.02) * 20);
    }
    ctx.lineTo(size, size);
    ctx.closePath();
    ctx.fill();
  } else if (theme.id === "maze") {
    const sky = ctx.createLinearGradient(0, 0, 0, size);
    sky.addColorStop(0, "#221c30");
    sky.addColorStop(0.5, "#150f22");
    sky.addColorStop(1, "#05040a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, size, size);

    const vx = size / 2;

    // receding stone doorframes toward a vanishing point, suggesting a
    // corridor disappearing into the labyrinth
    const frames = [
      { w: 620, h: 640 },
      { w: 420, h: 460 },
      { w: 250, h: 300 },
      { w: 120, h: 160 },
    ];
    frames.forEach((f, i) => {
      ctx.strokeStyle = `rgba(190, 178, 214, ${0.45 - i * 0.08})`;
      ctx.lineWidth = 10 - i * 2;
      ctx.strokeRect(vx - f.w / 2, size - f.h, f.w, f.h);
    });
    radialGlow(ctx, vx, size - frames[3].h + 30, 90, "rgba(255,207,138,0.55)", "rgba(255,207,138,0)");

    // torchlight glows along the corridor walls
    for (const [tx, ty] of [
      [120, 520],
      [648, 520],
      [200, 640],
      [568, 640],
    ]) {
      radialGlow(ctx, tx, ty, 55, "rgba(255,171,90,0.5)", "rgba(255,171,90,0)");
    }

    paintStrokes(ctx, size, 0, size, 150, [
      "rgba(200,190,220,0.05)",
      "rgba(60,50,80,0.08)",
      "rgba(20,15,30,0.08)",
    ]);

    // floor lines converging on the vanishing point
    ctx.strokeStyle = "rgba(170,160,190,0.3)";
    ctx.lineWidth = 2;
    for (const fx of [30, 220, 420, 600, 738]) {
      ctx.beginPath();
      ctx.moveTo(fx, size);
      ctx.lineTo(vx, size - frames[3].h + 60);
      ctx.stroke();
    }

    // a loose silver thread, echoing the treasure hidden within
    ctx.strokeStyle = "rgba(216,200,255,0.55)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(110, 700);
    ctx.bezierCurveTo(190, 660, 150, 620, 230, 610);
    ctx.bezierCurveTo(300, 602, 260, 660, 340, 668);
    ctx.stroke();
  } else if (theme.id === "secret") {
    const cx = size / 2;
    const cy = size / 2;
    radialGlow(ctx, cx, cy, size * 0.5, "rgba(122,60,160,0.5)", "rgba(10,6,22,0)");
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(232,198,255,${0.5 - i * 0.045})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, 55 + i * 32, 0, Math.PI * 2);
      ctx.stroke();
    }
    radialGlow(ctx, cx, cy, 90, "#f4e7c1", "rgba(244,231,193,0)");
    ctx.fillStyle = "#f4e7c1";
    ctx.beginPath();
    ctx.arc(cx, cy, 32, 0, Math.PI * 2);
    ctx.fill();
  } else if (theme.id === "celebration") {
    const cx = size / 2;
    const cy = size / 2;
    radialGlow(ctx, cx, cy, size * 0.55, "rgba(255,214,140,0.55)", "rgba(255,178,102,0)");
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.strokeStyle = `rgba(255,255,255,${0.7 - (i % 2) * 0.3})`;
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(a) * 390, cy + Math.sin(a) * 390);
      ctx.stroke();
    }
    radialGlow(ctx, cx, cy, 105, "#fff6df", "rgba(255,246,223,0.2)");
    ctx.fillStyle = "#ffd27a";
    ctx.beginPath();
    ctx.arc(cx, cy, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  addVignette(ctx, size, size, 0.4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeSkydome(theme, radius = 110) {
  const geo = new THREE.SphereGeometry(radius, 24, 16);
  const pos = geo.attributes.position;
  const top = new THREE.Color(theme.skyTop);
  const bottom = new THREE.Color(theme.skyBottom);
  const tmp = new THREE.Color();
  const colors = [];
  for (let i = 0; i < pos.count; i++) {
    const t = THREE.MathUtils.clamp((pos.getY(i) / radius) * 0.5 + 0.5, 0, 1);
    tmp.copy(bottom).lerp(top, t);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    fog: false,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -1;
  return mesh;
}

export function makePlaqueTexture(lines) {
  const w = 512;
  const h = 300;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#1c1610";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(244, 231, 193, 0.6)";
  ctx.lineWidth = 6;
  ctx.strokeRect(8, 8, w - 16, h - 16);

  ctx.fillStyle = "#f4e7c1";
  ctx.textAlign = "center";
  ctx.font = '30px "Hiragino Sans", "Yu Gothic", sans-serif';
  const lineHeight = 44;
  const startY = h / 2 - ((lines.length - 1) * lineHeight) / 2 + 10;
  lines.forEach((line, i) => ctx.fillText(line, w / 2, startY + i * lineHeight));

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function makeTitlePlacardTexture(title) {
  const w = 512;
  const h = 128;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#efe6d0";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(120, 95, 50, 0.6)";
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, w - 12, h - 12);

  ctx.fillStyle = "#3a2f1c";
  ctx.textAlign = "center";
  ctx.font = '600 40px "Hiragino Sans", "Yu Gothic", serif';
  ctx.fillText(title, w / 2, h / 2 + 14);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// mounts a small museum-style title placard just beneath a painting frame;
// added as a child of the frame group so it inherits its position/rotation —
// call this for every painting, including any added later
export function addTitlePlacard(frameGroup, title) {
  const backing = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.44, 0.05),
    new THREE.MeshStandardMaterial({ color: 0xcda45a, metalness: 0.3, roughness: 0.5 })
  );
  backing.position.set(0, -1.95, 0.03);
  frameGroup.add(backing);

  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 0.38),
    new THREE.MeshStandardMaterial({ map: makeTitlePlacardTexture(title), roughness: 0.6 })
  );
  plate.position.set(0, -1.95, 0.065);
  frameGroup.add(plate);
}

// ---------------------------------------------------------------------------
// Distinct item shapes, one per treasure — matched to what each is named after
// ---------------------------------------------------------------------------

function createStarGeometry(size) {
  const points = 5;
  const outerR = size;
  const innerR = size * 0.42;
  const shape = new THREE.Shape();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: size * 0.35,
    bevelEnabled: true,
    bevelThickness: size * 0.06,
    bevelSize: size * 0.05,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function createDropGeometry(size) {
  const pts = [
    new THREE.Vector2(0, size * 0.75),
    new THREE.Vector2(size * 0.18, size * 0.55),
    new THREE.Vector2(size * 0.42, size * 0.15),
    new THREE.Vector2(size * 0.5, -size * 0.15),
    new THREE.Vector2(size * 0.4, -size * 0.45),
    new THREE.Vector2(size * 0.18, -size * 0.68),
    new THREE.Vector2(0, -size * 0.78),
  ];
  return new THREE.LatheGeometry(pts, 16);
}

// picks a geometry that matches what each treasure is actually named after,
// so they no longer all read as the same generic gem
export function createItemGeometry(theme, size = 0.4) {
  switch (theme.id) {
    case "stars":
      return createStarGeometry(size);
    case "desert":
      return createDropGeometry(size);
    case "ocean":
      return new THREE.SphereGeometry(size * 0.95, 20, 20);
    case "forest": {
      const geo = new THREE.OctahedronGeometry(size, 0);
      geo.scale(0.55, 1.4, 0.55);
      return geo;
    }
    case "volcano": {
      const geo = new THREE.TetrahedronGeometry(size * 1.05, 0);
      geo.scale(0.75, 1.35, 0.75);
      return geo;
    }
    case "maze":
      return new THREE.TorusKnotGeometry(size * 0.28, size * 0.11, 64, 8);
    default:
      return new THREE.IcosahedronGeometry(size, 0);
  }
}

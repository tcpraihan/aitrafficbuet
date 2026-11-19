/* =========================================================================
   Adaptive signal-timing simulator
   - Two identical 4-arm intersections (left-hand traffic, as in Bangladesh)
   - Both receive the SAME random arrival stream, so only the controller differs
   - Controllers: fixed-time, Webster optimal, actuated (gap-out),
     adaptive queue-pressure (what camera-based AI control enables)
   ========================================================================= */
(function () {
  const $ = (id) => document.getElementById(id);
  if (!$("canvasA")) return;

  /* ---------- constants ---------- */
  const DT = 0.1;                 // s, physics step
  const AMBER = 3, ALLRED = 2;    // s
  const SAT_FLOW = 1500;          // veh/h/lane, for Webster
  const SPAWN_S = 130;            // m upstream of stop line where vehicles enter
  const EXIT_S = -95;             // m past stop line where vehicles leave
  const SCALE = 3;                // px per m
  const SIZE = 460, C = SIZE / 2;
  const LANE = 22;                // px lane width (one lane per direction)
  const STOP_PX = LANE + 14;      // px from centre to stop line
  const APPS = ["N", "S", "E", "W"];
  const PHASE_OF = { N: 0, S: 0, E: 1, W: 1 }; // phase 0 = N–S, phase 1 = E–W
  // direction of travel & lateral offset (keep left)
  const GEOM = {
    N: { d: [0, 1], lat: [1, 0] },
    S: { d: [0, -1], lat: [-1, 0] },
    E: { d: [-1, 0], lat: [0, 1] },
    W: { d: [1, 0], lat: [0, -1] },
  };
  const TYPES = [
    { name: "car", p: 0.42, len: 4.5, w: 11, vmax: 11, acc: 2.2, color: ["#f3f3f3", "#2b2f36", "#3466a8", "#c8ccd2", "#9b2c2c"] },
    { name: "cng", p: 0.24, len: 3.2, w: 9, vmax: 9, acc: 2.0, color: ["#2f8f46"] },
    { name: "bus", p: 0.14, len: 11, w: 13, vmax: 9, acc: 1.2, color: ["#b8312f", "#1f5fa8", "#d9822b"] },
    { name: "rickshaw", p: 0.20, len: 2.6, w: 8, vmax: 5.5, acc: 1.4, color: ["#e0a43a"] },
  ];
  const MIN_GAP = 1.8, B_COMF = 3, B_MAX = 6;

  const SCEN = {
    morning: { N: 15, S: 12, E: 6, W: 5 },
    balanced: { N: 9, S: 9, E: 9, W: 9 },
    evening: { N: 6, S: 5, E: 13, W: 15 },
    offpeak: { N: 5, S: 4, E: 4, W: 5 },
    shifting: { N: 10, S: 9, E: 9, W: 10 },
  };

  /* ---------- seeded RNG so both sides see identical traffic ---------- */
  function rng(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ---------- UI state ---------- */
  const ui = {
    rates: { ...SCEN.morning },
    scenario: "morning",
    gNS: 30, gEW: 30,
    speed: 4, running: true,
  };

  /* ---------- Webster ---------- */
  function webster(rates) {
    const s = SAT_FLOW / 60; // veh/min
    const yNS = Math.max(rates.N, rates.S) / s;
    const yEW = Math.max(rates.E, rates.W) / s;
    let Y = yNS + yEW;
    const L = 2 * (AMBER + ALLRED) + 2 * 2; // inter-greens + start-up loss
    const sat = Y >= 0.9;
    let Cy = sat ? 150 : (1.5 * L + 5) / (1 - Y);
    Cy = Math.min(150, Math.max(40, Cy));
    const G = Cy - 2 * (AMBER + ALLRED);
    const Ysafe = Math.max(Y, 0.001);
    let gNS = Math.max(10, (G * (yNS || 0.0005)) / Ysafe);
    let gEW = Math.max(10, G - gNS);
    if (gEW < 10) { gEW = 10; gNS = G - 10; }
    return { yNS, yEW, Y, L, C: Cy, gNS: Math.round(gNS), gEW: Math.round(gEW), sat };
  }

  /* ---------- Intersection model ---------- */
  class Intersection {
    constructor(canvas, ctrl) {
      this.cv = canvas; this.ctx = canvas.getContext("2d");
      this.ctrl = ctrl;
      this.reset();
    }
    reset() {
      this.t = 0;
      this.lanes = { N: [], S: [], E: [], W: [] };
      this.backlog = { N: [], S: [], E: [], W: [] };
      this.phase = 0; this.state = "G"; this.st = 0; // state timer
      this.gap = { 0: 0, 1: 0 }; // time since a vehicle was detected (actuated)
      this.plan = null; this.planFor();
      this.done = 0; this.delaySum = 0; this.maxQ = 0;
      this.served = [];
      this.cycles = 0;
    }
    planFor() {
      if (this.ctrl === "webster") this.plan = webster(ui.rates);
      else this.plan = { gNS: ui.gNS, gEW: ui.gEW };
    }
    light(app) {
      if (PHASE_OF[app] !== this.phase) return "R";
      return this.state === "G" ? "G" : this.state === "Y" ? "Y" : "R";
    }
    queue(app) {
      let q = this.backlog[app].length;
      for (const v of this.lanes[app]) if (v.s > 0 && v.s < SPAWN_S + 1 && v.v < 1.5) q++;
      return q;
    }
    oldestWait(app) {
      let w = 0;
      if (this.backlog[app].length) w = this.t - this.backlog[app][0].t0;
      for (const v of this.lanes[app]) if (v.s > 0 && v.v < 1.5) w = Math.max(w, this.t - v.t0);
      return w;
    }
    approaching(app, range) {
      return this.lanes[app].some((v) => v.s > 0 && v.s < range) || this.backlog[app].length > 0;
    }
    phaseQueue(p) { return APPS.filter((a) => PHASE_OF[a] === p).reduce((s, a) => s + this.queue(a), 0); }
    phaseWait(p) { return Math.max(...APPS.filter((a) => PHASE_OF[a] === p).map((a) => this.oldestWait(a))); }
    phaseDemand(p) { return APPS.some((a) => PHASE_OF[a] === p && this.approaching(a, 70)); }

    /* --- controller logic: should the current green end now? --- */
    endGreen() {
      const g = this.st, p = this.phase, o = 1 - p;
      switch (this.ctrl) {
        case "fixed":
        case "webster": {
          const target = p === 0 ? this.plan.gNS : this.plan.gEW;
          return g >= target;
        }
        case "actuated": {
          const MIN = 8, MAX = 50, GAP = 3;
          if (g < MIN) return false;
          if (g >= MAX) return this.phaseDemand(o);
          const detect = APPS.some((a) => PHASE_OF[a] === p && this.lanes[a].some((v) => v.s > 0 && v.s < 30));
          this.gap[p] = detect ? 0 : this.gap[p] + DT;
          return this.gap[p] >= GAP && this.phaseDemand(o);
        }
        case "adaptive": {
          // queue pressure with anti-starvation weighting on waiting time
          const MIN = 7, MAX = 60;
          if (g < MIN) return false;
          const qc = this.phaseQueue(p), qo = this.phaseQueue(o);
          const pc = qc + 0.06 * this.phaseWait(p);
          const po = qo + 0.06 * this.phaseWait(o);
          if (g >= MAX) return qo > 0;
          const flowing = APPS.some((a) => PHASE_OF[a] === p && this.lanes[a].some((v) => v.s > 0 && v.s < 35 && v.v > 2));
          if (qc === 0 && !flowing) return this.phaseDemand(o);
          return po > pc + 3;
        }
      }
      return false;
    }

    addVehicle(app, type, color) {
      this.backlog[app].push({ type, color, t0: this.t });
    }

    step() {
      this.t += DT;
      this.st += DT;
      // signal state machine
      if (this.state === "G" && this.endGreen()) { this.state = "Y"; this.st = 0; }
      else if (this.state === "Y" && this.st >= AMBER) { this.state = "AR"; this.st = 0; }
      else if (this.state === "AR" && this.st >= ALLRED) {
        this.phase = 1 - this.phase; this.state = "G"; this.st = 0; this.gap[this.phase] = 0;
        if (this.phase === 0) { this.cycles++; this.planFor(); }
      }

      for (const app of APPS) {
        const lane = this.lanes[app];
        // admit from backlog if there's room at the entry point
        if (this.backlog[app].length) {
          const last = lane[lane.length - 1];
          const b = this.backlog[app][0];
          if (!last || SPAWN_S - (last.s + last.type.len) > MIN_GAP + 1) {
            this.backlog[app].shift();
            const v0 = last ? Math.min(b.type.vmax, last.v) : b.type.vmax;
            lane.push({ type: b.type, color: b.color, s: SPAWN_S, v: v0, t0: b.t0, crossed: false });
          }
        }
        const lt = this.light(app);
        for (let i = 0; i < lane.length; i++) {
          const v = lane[i], T = v.type;
          let vt = T.vmax;
          if (i > 0) {
            const L = lane[i - 1];
            const gap = v.s - (L.s + L.type.len) - MIN_GAP;
            vt = Math.min(vt, Math.sqrt(2 * B_COMF * Math.max(0, gap)) + Math.min(L.v, 0.6 * Math.max(0, gap)));
          }
          if (!v.crossed && lt !== "G") {
            const dist = v.s - 0.6;
            const stopDist = (v.v * v.v) / (2 * B_COMF);
            const mustStop = lt === "R" || (lt === "Y" && dist > stopDist * 0.9);
            if (mustStop && dist > -0.5) vt = Math.min(vt, Math.sqrt(2 * B_COMF * Math.max(0, dist)));
          }
          const dv = vt - v.v;
          v.v += Math.max(-B_MAX * DT, Math.min(T.acc * DT, dv));
          if (v.v < 0) v.v = 0;
          v.s -= v.v * DT;
          if (!v.crossed && v.s <= 0) {
            v.crossed = true;
            const free = SPAWN_S / T.vmax;
            const delay = Math.max(0, this.t - v.t0 - free);
            this.done++; this.delaySum += delay;
            this.served.push(this.t);
          }
        }
        while (lane.length && lane[0].s < EXIT_S) lane.shift();
      }
      const q = APPS.reduce((s, a) => s + this.queue(a), 0);
      if (q > this.maxQ) this.maxQ = q;
      while (this.served.length && this.served[0] < this.t - 120) this.served.shift();
    }

    totalQueue() { return APPS.reduce((s, a) => s + this.queue(a), 0); }
    avgDelay() { return this.done ? this.delaySum / this.done : 0; }
    throughput() { return this.served.length / Math.min(2, Math.max(this.t, 1) / 60); } // veh/min, 2-min window

    /* ---------- drawing ---------- */
    pos(app, s) {
      const g = GEOM[app];
      const along = STOP_PX + s * SCALE;
      return [C + g.lat[0] * LANE / 2 - g.d[0] * along, C + g.lat[1] * LANE / 2 - g.d[1] * along];
    }
    draw() {
      const x = this.ctx;
      x.clearRect(0, 0, SIZE, SIZE);
      // ground
      x.fillStyle = "#e9ece6"; x.fillRect(0, 0, SIZE, SIZE);
      x.fillStyle = "#dfe4da";
      const blk = C - LANE - 8;
      [[0, 0], [C + LANE + 8, 0], [0, C + LANE + 8], [C + LANE + 8, C + LANE + 8]].forEach(([a, b]) => x.fillRect(a + 10, b + 10, blk - 20, blk - 20));
      // footpaths
      x.fillStyle = "#cfd3cc";
      x.fillRect(C - LANE - 8, 0, LANE * 2 + 16, SIZE); x.fillRect(0, C - LANE - 8, SIZE, LANE * 2 + 16);
      // roads
      x.fillStyle = "#3b3f45";
      x.fillRect(C - LANE, 0, LANE * 2, SIZE); x.fillRect(0, C - LANE, SIZE, LANE * 2);
      // centre lines
      x.strokeStyle = "#e9d27a"; x.lineWidth = 2; x.setLineDash([12, 10]);
      x.beginPath();
      x.moveTo(C, 0); x.lineTo(C, C - STOP_PX); x.moveTo(C, C + STOP_PX); x.lineTo(C, SIZE);
      x.moveTo(0, C); x.lineTo(C - STOP_PX, C); x.moveTo(C + STOP_PX, C); x.lineTo(SIZE, C);
      x.stroke(); x.setLineDash([]);
      // zebra crossings
      x.fillStyle = "rgba(255,255,255,.75)";
      for (let k = -LANE + 3; k < LANE - 2; k += 7) {
        x.fillRect(C + k, C - STOP_PX + 3, 4, 10); x.fillRect(C + k, C + STOP_PX - 13, 4, 10);
        x.fillRect(C - STOP_PX + 3, C + k, 10, 4); x.fillRect(C + STOP_PX - 13, C + k, 10, 4);
      }
      // stop lines
      x.fillStyle = "#fff";
      x.fillRect(C, C - STOP_PX - 2, LANE, 3); x.fillRect(C - LANE, C + STOP_PX - 1, LANE, 3);
      x.fillRect(C + STOP_PX - 1, C, 3, LANE); x.fillRect(C - STOP_PX - 2, C - LANE, 3, LANE);

      // vehicles
      for (const app of APPS) {
        const g = GEOM[app];
        for (const v of this.lanes[app]) {
          const [fx, fy] = this.pos(app, v.s);
          const len = v.type.len * SCALE, w = v.type.w;
          const cx = fx - g.d[0] * len / 2, cy = fy - g.d[1] * len / 2;
          if (cx < -40 || cx > SIZE + 40 || cy < -40 || cy > SIZE + 40) continue;
          x.save(); x.translate(cx, cy);
          x.rotate(Math.atan2(g.d[1], g.d[0]));
          x.fillStyle = "rgba(0,0,0,.25)"; x.fillRect(-len / 2 + 1, -w / 2 + 1.5, len, w);
          x.fillStyle = v.color;
          if (v.type.name === "rickshaw") {
            x.fillRect(-len / 2, -w / 2, len * 0.65, w);
            x.fillStyle = "#3a2a10"; x.fillRect(len * 0.15, -1, len * 0.35, 2);
          } else {
            roundRect(x, -len / 2, -w / 2, len, w, 2.5); x.fill();
            x.fillStyle = "rgba(40,60,80,.55)";
            x.fillRect(len / 2 - Math.min(5, len * 0.28), -w / 2 + 1.5, Math.min(3, len * 0.18), w - 3);
          }
          x.restore();
        }
        // offscreen queue indicator
        const hidden = this.backlog[app].length + this.lanes[app].filter((v) => v.s * SCALE + STOP_PX > C + 10).length;
        if (hidden > 0) {
          const [ex, ey] = this.pos(app, (C - STOP_PX - 18) / SCALE);
          x.fillStyle = "rgba(255,255,255,.95)";
          roundRect(x, ex - 17, ey - 10, 34, 20, 10); x.fill();
          x.fillStyle = "#b42318"; x.font = "600 11px JetBrains Mono, monospace"; x.textAlign = "center"; x.textBaseline = "middle";
          x.fillText("+" + hidden, ex, ey + 0.5);
        }
      }
      // signal heads at kerb side of each approach
      const heads = {
        N: [C + LANE + 16, C - STOP_PX - 16], S: [C - LANE - 16, C + STOP_PX + 16],
        E: [C + STOP_PX + 16, C + LANE + 16], W: [C - STOP_PX - 16, C - LANE - 16],
      };
      for (const app of APPS) {
        const [hx, hy] = heads[app], lt = this.light(app);
        x.fillStyle = "#14171b"; roundRect(x, hx - 9, hy - 22, 18, 44, 5); x.fill();
        [["R", "#e5484d"], ["Y", "#f5b83d"], ["G", "#2fbf71"]].forEach(([k, col], i) => {
          x.beginPath(); x.arc(hx, hy - 13 + i * 13, 4.6, 0, Math.PI * 2);
          x.fillStyle = lt === k ? col : "#33373d"; x.fill();
        });
        x.fillStyle = "#14171b"; x.font = "700 11px Manrope, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle";
        const off = { N: [0, -32], S: [0, 32], E: [24, 0], W: [-24, 0] }[app];
        x.fillText(app, hx + off[0], hy + off[1]);
      }
      // HUD
      x.fillStyle = "rgba(255,255,255,.92)"; roundRect(x, 10, 10, 150, 50, 8); x.fill();
      x.fillStyle = "#14171b"; x.textAlign = "left"; x.textBaseline = "alphabetic";
      x.font = "600 12px Manrope, sans-serif";
      const ph = this.phase === 0 ? "N–S" : "E–W";
      const st = this.state === "G" ? "green" : this.state === "Y" ? "amber" : "all-red";
      x.fillText(`${ph} ${st}`, 20, 30);
      x.font = "400 12px JetBrains Mono, monospace"; x.fillStyle = "#555c66";
      x.fillText(`${this.st.toFixed(1)} s · cycle ${this.cycles + 1}`, 20, 49);
    }
  }
  function roundRect(x, a, b, w, h, r) {
    x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r);
    x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath();
  }

  /* ---------- world: shared arrivals ---------- */
  const A = new Intersection($("canvasA"), $("ctrlA").value);
  const B = new Intersection($("canvasB"), $("ctrlB").value);
  let rand = rng(2026), simT = 0, history = [], lastSample = 0;

  function currentRates() {
    if (ui.scenario !== "shifting") return ui.rates;
    // demand swings from N–S to E–W over a 10-minute period
    const k = Math.sin((simT / 600) * Math.PI * 2);
    const f = (base, sign) => Math.max(0, base * (1 + 0.65 * sign * k));
    return { N: f(ui.rates.N, 1), S: f(ui.rates.S, 1), E: f(ui.rates.E, -1), W: f(ui.rates.W, -1) };
  }
  function pickType() {
    let r = rand(), acc = 0;
    for (const t of TYPES) { acc += t.p; if (r <= acc) return t; }
    return TYPES[0];
  }
  function worldStep() {
    simT += DT;
    const R = currentRates();
    for (const app of APPS) {
      if (rand() < (R[app] / 60) * DT) {
        const T = pickType();
        const col = T.color[Math.floor(rand() * T.color.length)];
        A.addVehicle(app, T, col); B.addVehicle(app, T, col);
      }
    }
    A.step(); B.step();
    if (simT - lastSample >= 2) {
      lastSample = simT;
      history.push([simT, A.totalQueue(), B.totalQueue()]);
      if (history.length > 450) history.shift();
    }
  }
  function resetAll() {
    rand = rng(2026); simT = 0; lastSample = 0; history = [];
    A.reset(); B.reset();
  }

  /* ---------- metrics + chart ---------- */
  function metricsHTML(me, other) {
    const d = me.avgDelay(), od = other.avgDelay();
    const q = me.totalQueue();
    const better = (a, b) => (me.done > 10 && other.done > 10 && a < b * 0.95 ? " win" : "");
    return `
      <div class="metric${better(d, od)}"><b>${d.toFixed(1)}<small>s</small></b><span>Avg delay</span></div>
      <div class="metric"><b>${q}</b><span>Queued now</span></div>
      <div class="metric"><b>${me.maxQ}</b><span>Max queue</span></div>
      <div class="metric"><b>${me.done}</b><span>Served</span></div>`;
  }
  const chart = $("queueChart"), cx = chart.getContext("2d");
  function drawChart() {
    const W = chart.width, H = chart.height, P = { l: 38, r: 10, t: 12, b: 26 };
    cx.clearRect(0, 0, W, H);
    const maxY = Math.max(8, ...history.map((h) => Math.max(h[1], h[2])));
    const tick = maxY <= 20 ? 5 : maxY <= 40 ? 10 : maxY <= 100 ? 25 : 50;
    const yMax = Math.ceil(maxY / tick) * tick;
    const t0 = history.length ? history[0][0] : 0, t1 = Math.max(t0 + 60, history.length ? history[history.length - 1][0] : 60);
    const X = (t) => P.l + ((t - t0) / (t1 - t0)) * (W - P.l - P.r);
    const Y = (v) => H - P.b - (v / yMax) * (H - P.t - P.b);
    cx.strokeStyle = "#eceeed"; cx.lineWidth = 1; cx.fillStyle = "#8a929b"; cx.font = "11px JetBrains Mono, monospace";
    cx.textAlign = "right"; cx.textBaseline = "middle";
    for (let v = 0; v <= yMax; v += tick) {
      const y = Y(v);
      cx.beginPath(); cx.moveTo(P.l, y); cx.lineTo(W - P.r, y); cx.stroke();
      cx.fillText(Math.round(v), P.l - 6, y);
    }
    cx.textAlign = "center"; cx.textBaseline = "top";
    const step = (t1 - t0) > 600 ? 120 : 60;
    for (let t = Math.ceil(t0 / step) * step; t <= t1; t += step) cx.fillText(fmt(t), X(t), H - P.b + 7);
    [[1, "#c98a1b"], [2, "#167a4a"]].forEach(([k, col]) => {
      cx.strokeStyle = col; cx.lineWidth = 2; cx.beginPath();
      history.forEach((h, i) => (i ? cx.lineTo(X(h[0]), Y(h[k])) : cx.moveTo(X(h[0]), Y(h[k]))));
      cx.stroke();
    });
  }
  const fmt = (t) => `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

  function renderWebster() {
    const w = webster(ui.rates);
    $("websterBox").innerHTML = `
      Flow ratio y<sub>NS</sub> = <b>${w.yNS.toFixed(2)}</b>, y<sub>EW</sub> = <b>${w.yEW.toFixed(2)}</b>, Y = <b>${w.Y.toFixed(2)}</b><br>
      Lost time L = <b>${w.L}s</b> &nbsp; C₀ = (1.5L+5)/(1−Y) = <b>${Math.round(w.C)}s</b>${w.sat ? " <span style='color:#b42318'>(oversaturated, capped)</span>" : ""}<br>
      Optimal greens: N–S <b>${w.gNS}s</b>, E–W <b>${w.gEW}s</b>`;
  }

  /* ---------- controls ---------- */
  function syncInputs() {
    APPS.forEach((a) => { $("r" + a).value = ui.rates[a]; $("o" + a).textContent = ui.rates[a]; });
    $("gNS").value = ui.gNS; $("oNS").textContent = ui.gNS + "s";
    $("gEW").value = ui.gEW; $("oEW").textContent = ui.gEW + "s";
    renderWebster();
  }
  $("scenario").addEventListener("change", (e) => {
    ui.scenario = e.target.value;
    if (SCEN[ui.scenario]) ui.rates = { ...SCEN[ui.scenario] };
    syncInputs(); resetAll();
  });
  APPS.forEach((a) => $("r" + a).addEventListener("input", (e) => {
    ui.rates[a] = +e.target.value; $("o" + a).textContent = e.target.value;
    if (ui.scenario !== "shifting") { ui.scenario = "custom"; $("scenario").value = "custom"; }
    renderWebster();
  }));
  ["gNS", "gEW"].forEach((id) => $(id).addEventListener("input", (e) => {
    ui[id] = +e.target.value; $("o" + id.slice(1)).textContent = e.target.value + "s";
  }));
  $("applyWebster").addEventListener("click", () => {
    const w = webster(ui.rates); ui.gNS = w.gNS; ui.gEW = w.gEW; syncInputs(); resetAll();
  });
  $("ctrlA").addEventListener("change", (e) => { A.ctrl = e.target.value; resetAll(); });
  $("ctrlB").addEventListener("change", (e) => { B.ctrl = e.target.value; resetAll(); });
  $("simPlay").addEventListener("click", () => { ui.running = !ui.running; $("simPlay").textContent = ui.running ? "Pause" : "Play"; });
  $("simReset").addEventListener("click", resetAll);
  $("simSpeed").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    ui.speed = +b.dataset.s;
    [...$("simSpeed").children].forEach((c) => c.classList.toggle("on", c === b));
  });

  /* ---------- loop (only runs while visible) ---------- */
  let visible = false, last = performance.now(), acc = 0;
  new IntersectionObserver((e) => (visible = e[0].isIntersecting), { threshold: 0.05 }).observe($("simulation"));
  function frame(now) {
    const realDt = Math.min(0.1, (now - last) / 1000); last = now;
    if (visible) {
      if (ui.running) {
        acc += realDt * ui.speed;
        let n = 0;
        while (acc >= DT && n < 400) { worldStep(); acc -= DT; n++; }
      }
      A.draw(); B.draw();
      $("metricsA").innerHTML = metricsHTML(A, B);
      $("metricsB").innerHTML = metricsHTML(B, A);
      $("simClock").textContent = fmt(simT);
      drawChart();
    }
    requestAnimationFrame(frame);
  }
  syncInputs();
  // warm up so the page opens on a populated scene
  for (let i = 0; i < 600; i++) worldStep();
  A.draw(); B.draw(); drawChart();
  requestAnimationFrame(frame);
})();

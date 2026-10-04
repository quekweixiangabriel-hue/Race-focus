// RaceFocus — Pomodoro engine, stats, animations.
const $ = id => document.getElementById(id);
const Me = { name: "", driver: null };
let toastTimer;
function toast(msg) { const t = $("toast"); t.textContent = msg; t.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 2600); }

/* ================= DRIVER SELECT ================= */
let selectedDriver = localStorage.getItem("rf_driver");
$("playerName").value = localStorage.getItem("rf_name") || "";
const grid = $("driverGrid");
DRIVERS.forEach(d => {
  const el = document.createElement("div");
  el.className = "driver-card" + (d.id === selectedDriver ? " selected" : "");
  el.style.setProperty("--dc", d.color);
  el.innerHTML = `<span class="d-num">#${d.num}</span><div class="helmet">${d.helmet}</div><div class="d-name">${d.name}</div><div class="d-team">${d.team}</div>`;
  el.onclick = () => { selectedDriver = d.id; document.querySelectorAll(".driver-card").forEach(c => c.classList.remove("selected")); el.classList.add("selected"); };
  grid.appendChild(el);
});
$("confirmDriver").onclick = () => {
  if (!selectedDriver) return toast("PICK A DRIVER FIRST 🏎️");
  Me.name = ($("playerName").value.trim() || "ANONYMOUS").toUpperCase();
  Me.driver = driverById(selectedDriver);
  localStorage.setItem("rf_driver", selectedDriver);
  localStorage.setItem("rf_name", Me.name);
  $("driverScreen").classList.remove("active");
  $("garage").classList.add("active");
  Race.connect();
  App.renderAll();
};
if (localStorage.getItem("rf_driver")) { // skip screen on return
  Me.name = (localStorage.getItem("rf_name") || "ANONYMOUS").toUpperCase();
  Me.driver = driverById(localStorage.getItem("rf_driver"));
  $("driverScreen").classList.remove("active");
  $("garage").classList.add("active");
  Race.connect();
}

/* ================= STATS ================= */
const today = () => new Date().toISOString().slice(0, 10);
function loadStats() {
  try { return JSON.parse(localStorage.getItem("rf_stats")) || { days: {}, fastest: null }; }
  catch { return { days: {}, fastest: null }; }
}
function saveStats(s) { localStorage.setItem("rf_stats", JSON.stringify(s)); }
function bumpDay(patch) {
  const s = loadStats(), t = today();
  s.days[t] = Object.assign({ focus: 0, laps: 0, races: 0, wins: 0 }, s.days[t], patch(s.days[t] || {}));
  saveStats(s); App.renderStats();
}
const fmtClock = ms => { const s = Math.max(0, Math.round(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0"); };

/* ================= POMODORO ENGINE ================= */
const Engine = {
  phase: "focus", running: false, endAt: null, lapStart: null, raf: null,
  lap: 0, laps: [], focusSec: 25 * 60, breakSec: 5 * 60, rounds: 0,
  counting: false,

  setPhase(p) { this.phase = p; },
  duration() { return (this.phase === "focus" ? this.focusSec : this.breakSec) * 1000; },
  remaining() { return this.running ? Math.max(0, this.endAt - Date.now()) : this._remain ?? this.duration(); },

  startRaceLaps(lapSec, lapsTarget) { this.focusSec = lapSec; this.phase = "focus"; },

  go() {
    if (this.running) return;
    this.running = true;
    const rem = this._remain ?? this.duration();
    this.endAt = Date.now() + rem;
    if (this.phase === "focus" && this.lapStart === null) this.lapStart = Date.now();
    this.tick();
  },
  pause() { if (!this.running) return; this._remain = this.endAt - Date.now(); this.running = false; cancelAnimationFrame(this.raf); },
  reset() { this.running = false; cancelAnimationFrame(this.raf); this._remain = this.duration(); this.lapStart = null; this.render(); },

  tick() {
    const rem = this.remaining();
    this.render(rem);
    if (rem <= 0) { this.complete(); return; }
    this.raf = requestAnimationFrame(() => this.tick());
  },

  complete() {
    this.running = false; cancelAnimationFrame(this.raf);
    if (this.phase === "focus") {
      const lapMs = Date.now() - (this.lapStart || Date.now() - this.duration());
      this.laps.push(lapMs); this.lap = this.laps.length;
      const best = Math.min(...this.laps);
      const isPurple = lapMs <= best;
      if (isPurple) { const s = loadStats(); s.fastest = Math.min(s.fastest || 9e15, lapMs); saveStats(s); FX.confetti(innerWidth / 2, innerHeight * 0.25, 90, ["#b06bff", "#e10600", "#fff"]); toast("⚡ PURPLE LAP — fastest yet!"); }
      FX.confetti(innerWidth / 2, innerHeight * 0.3, 120);
      bumpDay(d => ({ laps: d.laps + 1, focus: d.focus + Math.round(this.duration() / 1000) }));
      if (Race.inRace()) Race.send({ t: "lap", ms: lapMs });
      // next phase
      this.rounds++;
      this.phase = (this.laps.length % 4 === 0) ? "long" : "short";
      if (this.phase === "long") this._remain = 15 * 60 * 1000;
      this._remain = (this.phase === "long" ? 15 * 60 : this.breakSec / 1000) * 1000;
      this.lapStart = null;
      FX.fanfare();
      toast("🏁 LAP " + this.lap + " DONE — " + fmtClock(lapMs) + " · PIT FOR " + (this.phase === "long" ? "15:00" : fmtClock(this.breakSec * 1000)));
      App.renderLaps();
      this.render();
      setTimeout(() => { this.phase = "focus"; }, 0);
      // auto-start break
      this._remain = (this.phase === "long" ? 15 * 60 * 1000 : this.breakSec * 1000);
      this.go();
    } else {
      this.phase = "focus"; this._remain = null;
      toast("🟢 LIGHTS OUT — back on track!");
      FX.beep(1200, 0.15, "sine", 0.2);
      this.go();
    }
    this.render();
  },

  render(rem) {
    const r = rem ?? this.remaining();
    const td = $("timeDisplay");
    td.textContent = fmtClock(r);
    td.classList.toggle("break-time", this.phase !== "focus");
    $("phaseLabel").textContent = this.phase === "focus" ? (Race.inRace() ? "RACE LAP " + (this.laps.length + 1) + " — FLAT OUT" : "FOCUS MODE — FLAT OUT") : "PIT STOP — RECHARGE";
    $("sessionBadge").textContent = this.phase === "focus" ? "FOCUS LAP " + (this.laps.length + 1) : "BREAK";
    const bs = $("btnStart");
    bs.textContent = this.running ? "RUNNING…" : (this._remain != null && this._remain !== this.duration() ? "RESUME" : "START ENGINE");
    bs.classList.toggle("running", this.running);
    App.moveCar(1 - r / this.duration());
  }
};

/* ================= APP UI ================= */
const App = {
  trackPath: null, pathLen: 0,

  init() {
    this.trackPath = $("trackPath"); this.pathLen = this.trackPath.getTotalLength();
    $("trackProgress").style.strokeDasharray = `0 ${this.pathLen}`;
    $("btnStart").onclick = () => { Engine._remain = Engine._remain ?? Engine.duration(); Engine.go(); FX.speedLines(); };
    $("btnPause").onclick = () => Engine.pause();
    $("btnReset").onclick = () => { Engine.reset(); toast("SESSION RESET"); };
    $("setFocus").onchange = e => { Engine.focusSec = (+e.target.value || 25) * 60; if (!Engine.running) { Engine._remain = null; Engine.reset(); } };
    $("setBreak").onchange = e => { Engine.breakSec = (+e.target.value || 5) * 60; };
    $("btnClosePodium").onclick = () => { $("podiumModal").classList.add("hidden"); };
    // pre-race lights
    this.showLights();
    this.renderStats(); this.renderLaps();
    Engine.reset();
    setInterval(() => { if (Race.inRace() && Engine.running && Engine.phase === "focus") Race.send({ t: "progress", lap: Engine.laps.length, elapsed: Engine.duration() - Engine.remaining() }); }, 2000);
  },

  showLights() {
    const wrap = document.createElement("div"); wrap.className = "lights"; wrap.id = "lights";
    for (let i = 0; i < 5; i++) { const l = document.createElement("i"); wrap.appendChild(l); }
    $("phaseLabel").before(wrap);
    const lights = [...wrap.children];
    lights.forEach((l, i) => setTimeout(() => { l.classList.add("on"); FX.beep(440, 0.1); }, 600 + i * 450));
    setTimeout(() => { lights.forEach(l => l.classList.add("out")); FX.beep(880, 0.3, "square", 0.25); setTimeout(() => wrap.remove(), 800); }, 600 + 5 * 450 + 400);
  },

  moveCar(frac) {
    const len = this.pathLen;
    const p = this.trackPath.getPointAtLength(Math.max(0.001, Math.min(0.999, frac)) * len);
    const g = $("carMe");
    g.setAttribute("transform", `translate(${p.x},${p.y})`);
    $("trackProgress").style.strokeDasharray = `${frac * len} ${len}`;
    // ghost = best lap pace
    const s = loadStats();
    if (s.fastest && Engine.phase === "focus") {
      const ghostFrac = Math.min(0.999, (Engine.duration() - Engine.remaining()) / s.fastest);
      const gp = this.trackPath.getPointAtLength(Math.max(0.001, ghostFrac) * len);
      $("carGhost").setAttribute("transform", `translate(${gp.x},${gp.y})`);
    }
  },

  renderLaps() {
    const strip = $("lapStrip");
    const best = Engine.laps.length ? Math.min(...Engine.laps) : null;
    strip.innerHTML = Engine.laps.map((ms, i) =>
      `<span class="lap-chip ${ms === best ? "purple" : ""}">LAP ${i + 1} · ${fmtClock(ms)}</span>`).join("");
    $("fastestLap").textContent = "FASTEST LAP: " + (loadStats().fastest ? fmtClock(loadStats().fastest) : "—");
  },

  renderStats() {
    const s = loadStats(), d = s.days[today()] || { focus: 0, laps: 0, races: 0, wins: 0 };
    $("statLaps").textContent = Object.values(s.days).reduce((a, x) => a + x.laps, 0);
    $("statRaces").textContent = Object.values(s.days).reduce((a, x) => a + x.races, 0);
    $("statWins").textContent = Object.values(s.days).reduce((a, x) => a + x.wins, 0);
    $("todayFocus").textContent = Math.round(d.focus / 60) + "m today";
    // streak
    let streak = 0, dt = new Date();
    for (;;) {
      const key = dt.toISOString().slice(0, 10);
      if (s.days[key] && s.days[key].laps > 0) { streak++; dt.setDate(dt.getDate() - 1); }
      else if (key === today()) { dt.setDate(dt.getDate() - 1); }
      else break;
    }
    $("streakDays").textContent = streak; $("statStreak").textContent = streak;
    this.renderChart();
  },

  renderChart() {
    const cv = $("weekChart"), ctx = cv.getContext("2d");
    const W = cv.width, H = cv.height, pad = 26;
    ctx.clearRect(0, 0, W, H);
    const s = loadStats(), days = [];
    for (let i = 6; i >= 0; i--) { const dt = new Date(); dt.setDate(dt.getDate() - i); const key = dt.toISOString().slice(0, 10); days.push({ key, label: "SMTWTFS"[dt.getDay()], mins: Math.round(((s.days[key] || {}).focus || 0) / 60) }); }
    const max = Math.max(60, ...days.map(d => d.mins));
    const bw = (W - pad * 2) / 7;
    days.forEach((d, i) => {
      const h = (d.mins / max) * (H - 60);
      const x = pad + i * bw + bw * 0.2, y = H - 30 - h;
      const grad = ctx.createLinearGradient(0, y, 0, H - 30);
      grad.addColorStop(0, "#e10600"); grad.addColorStop(1, "rgba(225,6,0,.15)");
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.roundRect(x, y, bw * 0.6, Math.max(h, 3), 5); ctx.fill();
      ctx.fillStyle = "#8b94a7"; ctx.font = "12px Titillium Web"; ctx.textAlign = "center";
      ctx.fillText(d.label, x + bw * 0.3, H - 12);
      if (d.mins > 0) { ctx.fillStyle = "#ffd257"; ctx.font = "bold 11px Orbitron"; ctx.fillText(d.mins + "m", x + bw * 0.3, y - 6); }
    });
  },

  renderAll() { this.renderStats(); this.renderLaps(); },

  onRaceRoom(room) {
    if (room.status === "racing" && !Engine.running && Engine.laps.length === 0) {
      // synced start
      Engine.focusSec = room.lapSeconds;
      Engine.reset();
      const wait = room.startAt - Race.serverNow();
      if (wait > 0) {
        Engine.running = false;
        const cd = setInterval(() => {
          const left = room.startAt - Race.serverNow();
          const td = $("timeDisplay");
          if (left <= 0) { clearInterval(cd); td.classList.remove("counting"); Engine.go(); FX.speedLines(); toast("🟢 LIGHTS OUT — GO GO GO!"); }
          else { td.classList.add("counting"); td.textContent = Math.ceil(left / 1000); $("phaseLabel").textContent = "RACE STARTS IN…"; }
        }, 100);
      }
    }
    if (room.status === "finished") { Engine.pause(); }
  },

  onPodium(order) {
    const medal = [null, $("p1"), $("p2"), $("p3")];
    order.slice(0, 3).forEach((p, i) => {
      const d = driverById(p.driver);
      medal[i + 1].innerHTML = `<span class="helmet">${d.helmet}</span>${p.name}`;
    });
    const meIdx = order.findIndex(p => p.id === Race.you);
    const total = ms => fmtClock(ms.reduce((a, b) => a + b, 0));
    $("podiumTimes").innerHTML = order.map((p, i) =>
      `<div><b>P${i + 1} ${p.name}</b> — ${p.laps.length} laps · total ${total(p.laps)} ${p.id === Race.you ? "🏆 YOU!" : ""}</div>`).join("");
    $("podiumModal").classList.remove("hidden");
    FX.confetti(innerWidth / 2, innerHeight * 0.35, 260);
    FX.fanfare();
    bumpDay(d => ({ races: d.races + 1, wins: d.wins + (meIdx === 0 ? 1 : 0) }));
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());

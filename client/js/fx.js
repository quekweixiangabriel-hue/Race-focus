// FX: confetti, speed lines, beeps — pure canvas + WebAudio, no libs.
const FX = (() => {
  const cv = document.getElementById("fx"), ctx = cv.getContext("2d");
  let parts = [], raf = null;
  const resize = () => { cv.width = innerWidth; cv.height = innerHeight; };
  addEventListener("resize", resize); resize();

  function loop() {
    ctx.clearRect(0, 0, cv.width, cv.height);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life--; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(p.life / p.max, 0);
      if (p.shape === "rect") { ctx.fillStyle = p.color; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); }
      else { ctx.beginPath(); ctx.arc(0, 0, p.s / 2, 0, 7); ctx.fillStyle = p.color; ctx.fill(); }
      ctx.restore();
    }
    if (parts.length) raf = requestAnimationFrame(loop); else raf = null;
  }
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  function confetti(x = innerWidth / 2, y = innerHeight / 3, n = 140, colors = ["#e10600", "#ffd257", "#fff", "#3ec6ff"]) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 9;
      parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 4, g: 0.18 + Math.random() * 0.12,
        s: 6 + Math.random() * 8, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3,
        color: colors[(Math.random() * colors.length) | 0], shape: Math.random() > 0.4 ? "rect" : "dot",
        life: 90 + Math.random() * 70, max: 160 });
    }
    kick();
  }

  function speedLines(n = 26) {
    for (let i = 0; i < n; i++) {
      parts.push({ x: Math.random() * cv.width, y: Math.random() * cv.height, vx: -(14 + Math.random() * 18), vy: 0,
        g: 0, s: 2, rot: 0, vr: 0, color: "rgba(255,255,255," + (0.12 + Math.random() * 0.25) + ")",
        shape: "line", life: 22 + Math.random() * 16, max: 38 });
    }
    // draw lines via rect hack
    parts.filter(p => p.shape === "line").forEach(p => { p.shape = "rect"; p.s = 60 + Math.random() * 90; });
    kick();
  }

  let ac;
  function beep(freq = 880, dur = 0.12, type = "square", vol = 0.15) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(vol, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
      o.connect(g); g.connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  const fanfare = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, 0.22, "triangle", 0.2), i * 140)); };

  return { confetti, speedLines, beep, fanfare };
})();

// Live F1 mini-player via the free OpenF1 API (no key, CORS-enabled).
// Shows a countdown to the next session; if a session is live, polls the top 10.
const LiveF1 = (() => {
  const pill = document.getElementById("livePill"),
        pillText = document.getElementById("livePillText"),
        mp = document.getElementById("miniPlayer"),
        mpTitle = document.getElementById("mpTitle"),
        mpCount = document.getElementById("mpCountdown"),
        mpTable = document.getElementById("mpTable"),
        mpFoot = document.getElementById("mpFoot");
  let nextSession = null, pollTimer = null, cdTimer = null;

  document.getElementById("mpToggle").onclick = () => mp.classList.toggle("open");
  pill.onclick = () => { mp.classList.toggle("open"); };

  async function fetchJSON(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    return r.json();
  }

  async function refresh() {
    try {
      const year = new Date().getFullYear();
      const sessions = await fetchJSON(`https://api.openf1.org/v1/sessions?year=${year}`);
      const nowD = new Date();
      nextSession = sessions
        .filter(s => new Date(s.date_end) > nowD)
        .sort((a, b) => new Date(a.date_start) - new Date(b.date_start))[0] || null;
      renderIdle();
      if (nextSession) {
        const start = new Date(nextSession.date_start), end = new Date(nextSession.date_end);
        if (nowD >= start && nowD <= end) startLive(nextSession.session_key, nextSession);
        else scheduleCountdown(start, nextSession);
      }
    } catch (e) {
      pillText.textContent = "F1 OFFLINE";
      mpTitle.textContent = "FORMULA 1 — UNAVAILABLE";
      mpCount.textContent = "no connection";
      mpFoot.textContent = "Check network / API status";
    }
  }

  function scheduleCountdown(start, s) {
    clearInterval(pollTimer); clearInterval(cdTimer);
    pill.className = "live-pill soon"; pillText.textContent = "RACE WEEKEND SOON";
    mpTitle.textContent = `${s.circuit_short_name || s.meeting_name || "GRAND PRIX"} — ${s.session_name}`.toUpperCase();
    const tick = () => {
      const d = start - Date.now();
      if (d <= 0) { clearInterval(cdTimer); refresh(); return; }
      const days = Math.floor(d / 864e5), h = Math.floor(d % 864e5 / 36e5), m = Math.floor(d % 36e5 / 6e4), sec = Math.floor(d % 6e4 / 1e3);
      mpCount.textContent = (days > 0 ? days + "d " : "") + String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0") + ":" + String(sec).padStart(2, "0");
    };
    tick(); cdTimer = setInterval(tick, 1000);
    mpTable.innerHTML = "";
  }

  async function startLive(sessionKey, s) {
    clearInterval(cdTimer);
    pill.className = "live-pill live"; pillText.textContent = "F1 LIVE";
    mpTitle.classList.add("live");
    mpTitle.textContent = `● LIVE — ${s.session_name}`.toUpperCase();
    mp.classList.add("open");
    const load = async () => {
      try {
        const [pos, drivers] = await Promise.all([
          fetchJSON(`https://api.openf1.org/v1/position?session_key=${sessionKey}`),
          fetchJSON(`https://api.openf1.org/v1/drivers?session_key=${sessionKey}`)
        ]);
        const latest = {};
        for (const p of pos) {
          if (!latest[p.driver_number] || new Date(p.date) > new Date(latest[p.driver_number].date)) latest[p.driver_number] = p;
        }
        const byNum = Object.fromEntries(drivers.map(d => [d.driver_number, d]));
        const top = Object.values(latest).sort((a, b) => a.position - b.position).slice(0, 10);
        mpTable.innerHTML = top.map(p => {
          const d = byNum[p.driver_number] || {};
          const col = d.team_colour ? "#" + d.team_colour : "#888";
          return `<tr><td class="pos">P${p.position}</td><td><span class="team-dot" style="background:${col}"></span></td><td class="code">${d.name_acronym || "#" + p.driver_number}</td><td style="text-align:right;color:var(--dim)">${d.team_name || ""}</td></tr>`;
        }).join("");
        mpFoot.textContent = "Live timing · OpenF1 · auto-updates";
      } catch (e) { mpFoot.textContent = "Live timing error — retrying…"; }
    };
    await load();
    pollTimer = setInterval(load, 10000);
    setTimeout(() => { clearInterval(pollTimer); refresh(); }, 3 * 3600 * 1000); // re-check session window
  }

  function renderIdle() {
    mpTitle.classList.remove("live");
    pill.className = "live-pill idle";
  }

  refresh();
  setInterval(refresh, 10 * 60 * 1000); // re-check every 10 min
  return {};
})();

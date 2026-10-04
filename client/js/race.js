// RaceClient — WebSocket rooms. Same code = same grid.
const Race = (() => {
  let ws, you = null, room = null, offset = 0, heartbeat = null;
  const $ = id => document.getElementById(id);
  const connDot = $("connDot"), err = $("raceError");

  function connect() {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => { connDot.classList.add("on"); if (room) send({ t: "join", code: room.code, name: Me.name, driver: Me.driver.id }); };
    ws.onclose = () => { connDot.classList.remove("on"); setTimeout(connect, 2500); };
    ws.onmessage = ev => {
      const m = JSON.parse(ev.data);
      if (m.serverNow) offset = m.serverNow - Date.now();
      if (m.t === "created" || m.t === "joined") { you = m.you; $("raceLobby").classList.add("hidden"); $("raceRoom").classList.remove("hidden"); }
      if (m.t === "room") { room = m; renderRoom(); App.onRaceRoom(m); }
      if (m.t === "error") { err.textContent = m.msg; setTimeout(() => err.textContent = "", 3000); }
      if (m.t === "podium") App.onPodium(m.order);
    };
  }
  const send = o => ws && ws.readyState === 1 && ws.send(JSON.stringify(o));
  const serverNow = () => Date.now() + offset;

  function renderRoom() {
    if (!room) return;
    $("roomCode").textContent = room.code;
    $("btnRaceStart").style.display = room.host === you && room.status === "lobby" ? "" : "none";
    $("btnRaceReset").classList.toggle("hidden", !(room.host === you && room.status === "finished"));
    const rows = computeOrder(room).map((p, i) => {
      const d = driverById(p.driver);
      const fl = p.laps.length ? Math.min(...p.laps) : null;
      return `<div class="rp-row ${p.id === you ? "me" : ""}">
        <span class="rp-pos">P${i + 1}</span><span class="rp-helmet">${d.helmet}</span>
        <span class="rp-name">${esc(p.name)} ${p.id === room.host ? "👑" : ""}</span>
        ${fl ? `<span class="rp-fl">FL ${fmtLap(fl)}</span>` : ""}
        <span class="rp-laps">${p.laps.length}/${room.lapsTarget} LAPS</span>
        <span class="rp-gap">${gapText(p, i)}</span></div>`;
    }).join("");
    $("roomPlayers").innerHTML = rows;
  }

  function computeOrder(r) {
    return [...r.players].sort((a, b) => {
      const pa = raceProgress(a), pb = raceProgress(b);
      if (pb !== pa) return pb - pa;
      return (a.laps.reduce((x, y) => x + y, 0) || 9e15) - (b.laps.reduce((x, y) => x + y, 0) || 9e15);
    });
  }
  function raceProgress(p) {
    if (!room.startAt) return 0;
    const lapLen = room.lapSeconds * 1000;
    const t = Math.max(0, serverNow() - room.startAt);
    return Math.min(p.laps.length + (p.finished ? 0 : Math.min(t - p.laps.length * lapLen, lapLen) / lapLen), room.lapsTarget);
  }
  function gapText(p, idx) {
    if (!room.startAt || room.status !== "racing") return room.status.toUpperCase();
    if (idx === 0) return "LEADER";
    const order = computeOrder(room);
    const lead = raceProgress(order[0]), me = raceProgress(p);
    const gap = Math.max(0, ((lead - me) * room.lapSeconds * 1000) / 1000);
    return "+" + gap.toFixed(1) + "s";
  }
  const esc = s => s.replace(/[<>&"]/g, c => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c]));
  const fmtLap = ms => { const s = ms / 1000; return Math.floor(s / 60) + ":" + (s % 60).toFixed(1).padStart(4, "0"); };

  // ---- UI wiring ----
  $("btnCreate").onclick = () => {
    const mode = document.querySelector('input[name="mode"]:checked').value;
    const laps = mode === "sprint" ? 3 : 4;
    const lapSeconds = mode === "sprint" ? 5 * 60 : 25 * 60;
    send({ t: "create", name: Me.name, driver: Me.driver.id, laps, lapSeconds });
    toast("RACE CREATED — share the code!");
  };
  $("btnJoin").onclick = () => {
    const code = $("joinCode").value.trim().toUpperCase();
    if (code.length !== 5) return (err.textContent = "Code is 5 characters");
    send({ t: "join", code, name: Me.name, driver: Me.driver.id });
  };
  $("joinCode").addEventListener("keydown", e => e.key === "Enter" && $("btnJoin").click());
  $("btnCopyCode").onclick = () => { navigator.clipboard?.writeText(room?.code || ""); toast("CODE COPIED 📋"); };
  $("btnRaceStart").onclick = () => send({ t: "start" });
  $("btnRaceReset").onclick = () => send({ t: "reset" });
  $("btnLeaveRoom").onclick = () => { location.reload(); };

  // expose for app
  const api = {
    connect,
    send,
    get room() { return room; },
    get you() { return you; },
    serverNow,
    inRace: () => room && room.status === "racing",
    startHeartbeat(cb) { clearInterval(heartbeat); heartbeat = setInterval(cb, 2000); },
    stopHeartbeat: () => clearInterval(heartbeat)
  };
  return api;
})();

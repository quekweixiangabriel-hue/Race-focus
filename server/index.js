// RaceFocus multiplayer race server (WebSocket rooms)
// Rooms live in memory — restart clears them. Perfect for a study group.
const { WebSocketServer } = require("ws");
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const CLIENT_DIR = path.join(__dirname, "..", "client");
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon" };

const server = http.createServer((req, res) => {
  let urlPath = req.url.split("?")[0];
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.join(CLIENT_DIR, path.normalize(urlPath).replace(/^(\.\.[/\\])+/, ""));
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
const rooms = new Map(); // code -> { host, players: Map<id, player>, startAt, lapsTarget, status }
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const newCode = () => Array.from({ length: 5 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join("");
const now = () => Date.now();

function roomSnapshot(room) {
  return {
    t: "room",
    code: room.code,
    status: room.status,
    startAt: room.startAt,
    lapsTarget: room.lapsTarget,
    lapSeconds: room.lapSeconds,
    serverNow: now(),
    host: room.host,
    players: [...room.players.values()].map(p => ({
      id: p.id, name: p.name, driver: p.driver, laps: p.laps, finished: p.finished,
      progress: p.progress // { lap, elapsed } live heartbeat
    }))
  };
}
function broadcast(room) {
  const msg = JSON.stringify(roomSnapshot(room));
  for (const p of room.players.values()) if (p.ws.readyState === 1) p.ws.send(msg);
}
function send(ws, obj) { if (ws.readyState === 1) ws.send(JSON.stringify(obj)); }

wss.on("connection", (ws) => {
  const id = Math.random().toString(36).slice(2, 9);
  let myRoom = null;

  ws.on("message", (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }

    if (m.t === "create") {
      const code = newCode();
      myRoom = { code, host: id, players: new Map(), status: "lobby", startAt: null, lapsTarget: m.laps || 4, lapSeconds: m.lapSeconds || 25 * 60 };
      myRoom.players.set(id, { id, ws, name: m.name, driver: m.driver, laps: [], finished: false, progress: { lap: 0, elapsed: 0 } });
      rooms.set(code, myRoom);
      send(ws, { t: "created", code, you: id });
      broadcast(myRoom);
    }

    if (m.t === "join" && !myRoom) {
      const room = rooms.get((m.code || "").toUpperCase());
      if (!room) return send(ws, { t: "error", msg: "Room not found" });
      if (room.status !== "lobby") return send(ws, { t: "error", msg: "Race already started" });
      myRoom = room;
      room.players.set(id, { id, ws, name: m.name, driver: m.driver, laps: [], finished: false, progress: { lap: 0, elapsed: 0 } });
      send(ws, { t: "joined", code: room.code, you: id });
      broadcast(room);
    }

    if (!myRoom) return;
    const me = myRoom.players.get(id);

    if (m.t === "start" && myRoom.host === id && myRoom.status === "lobby") {
      myRoom.status = "racing";
      myRoom.startAt = now() + 5000 + Math.ceil((5000 - (now() % 1000)) % 1000); // synced ~5s countdown
      broadcast(myRoom);
    }

    if (m.t === "lap") {
      me.laps.push(m.ms);
      me.progress = { lap: me.laps.length, elapsed: 0 };
      broadcast(myRoom);
    }

    if (m.t === "progress") {
      me.progress = { lap: m.lap, elapsed: m.elapsed };
      // throttle-free: client sends every 2s
    }

    if (m.t === "finish") {
      me.finished = true;
      const allDone = [...myRoom.players.values()].every(p => p.finished || p.laps.length >= myRoom.lapsTarget);
      broadcast(myRoom);
      if (allDone && myRoom.status === "racing") {
        myRoom.status = "finished";
        const order = [...myRoom.players.values()]
          .sort((a, b) => {
            if (a.laps.length !== b.laps.length) return b.laps.length - a.laps.length;
            return a.laps.reduce((x, y) => x + y, 0) - b.laps.reduce((x, y) => x + y, 0);
          })
          .map(p => ({ id: p.id, name: p.name, driver: p.driver, laps: p.laps }));
        broadcast(myRoom);
        for (const p of myRoom.players.values()) send(p.ws, { t: "podium", order, serverNow: now() });
      }
    }

    if (m.t === "reset" && myRoom.host === id) {
      for (const p of myRoom.players.values()) { p.laps = []; p.finished = false; p.progress = { lap: 0, elapsed: 0 }; }
      myRoom.status = "lobby"; myRoom.startAt = null;
      broadcast(myRoom);
    }
  });

  ws.on("close", () => {
    if (!myRoom) return;
    myRoom.players.delete(id);
    if (myRoom.players.size === 0) rooms.delete(myRoom.code);
    else { if (myRoom.host === id) myRoom.host = myRoom.players.keys().next().value; broadcast(myRoom); }
  });
});

server.listen(PORT, () => console.log(`🏁 RaceFocus running → http://localhost:${PORT}`));

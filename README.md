# 🏁 RaceFocus — F1 Pomodoro Racing

Study like a Grand Prix. Every Pomodoro is a **lap**, every day is a **race weekend**.

![stack](https://img.shields.io/badge/stack-Node%20%2B%20Vanilla%20JS-e10600) ![deps](https://img.shields.io/badge/dependencies-1%20(ws)-111) ![license](https://img.shields.io/badge/license-MIT-blue)

## Features
- 🏎️ **20 real F1 drivers** — pick yours, the whole app takes their team livery
- ⏱️ **Pomodoro engine** — focus laps + pit-stop breaks, animated SVG race track, purple-lap detection, ghost car at your fastest-lap pace
- 🏆 **Race Mode** — create a room, share the 5-letter code, friends join and race the same laps. Live standings, gaps, fastest laps, synchronized lights-out start, podium ceremony with confetti
- ⚡ Two race formats: **Sprint** (3 × 5 min) for quick sessions, **Grand Prix** (4 × 25 min) for deep work
- 📊 **Season stats** — laps, races, wins, day streak 🔥, weekly focus chart, all stored locally
- 📺 **Live F1 mini-player** — auto-detects real sessions via the free [OpenF1 API](https://www.openf1.org). Countdown when a race weekend is coming, live top-10 timing during sessions. No API key needed
- 🎬 **Animations** — lights-out sequence, confetti physics, speed lines, podium bounce, waving flags, WebAudio beeps

## Quick Start
```bash
npm install
npm start
```
Open **http://localhost:3000** — done. 🏁

## Racing with friends
**Same room / same Wi-Fi:** friends open `http://<your-ip>:3000` (e.g. `http://192.168.1.20:3000`).

**Anywhere in the world:** expose the port once —
```bash
npx ngrok http 3000        # or: cloudflared tunnel --url http://localhost:3000
```
then share the URL. Everyone creates/joins the same room code and races.

## How a race works
1. Host picks **Sprint** or **Grand Prix** → creates a room → gets a 5-letter code
2. Friends type the code → pick drivers → grid fills up
3. Host hits **START RACE** → everyone's app counts down together (server-synced lights out)
4. Each focus Pomodoro = one lap; lap times are broadcast live
5. First to complete all laps (or best total time) wins → 🏆 podium + stats update

## Project structure
```
racefocus/
├── package.json
├── server/
│   └── index.js          # static hosting + WebSocket race rooms (in-memory)
└── client/
    ├── index.html
    ├── css/style.css     # F1 dark theme, all animations
    └── js/
        ├── data.js       # driver lineup + team colors
        ├── fx.js         # confetti / speed lines / WebAudio
        ├── live.js       # OpenF1 mini-player (live timing + countdown)
        ├── race.js       # WebSocket race client
        └── app.js        # Pomodoro engine, stats, charts, podium
```

## Notes
- Rooms are in-memory — restarting the server clears them (fine for study groups; add Redis if you want persistence)
- The F1 mini-player needs internet; everything else works fully offline on your LAN
- Change the lineup in `client/js/data.js` whenever the silly season strikes

## Deploy (free options)
- **Render / Railway / Fly.io:** `npm start`, set `PORT` env var
- **VPS:** `git clone`, `npm i`, `pm2 start server/index.js --name racefocus`

MIT License — now go set a purple lap. ⚡

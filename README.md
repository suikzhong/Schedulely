# Schedulely Demo

Work submitted for Intro to PM class Group 8
Sui Zhong, Calvin Yuxiong Lin, Tracy Cen
Code written with the aid of OpenAI Codex GPT5.3

Minimal scheduling demo for class.

The app lets a user:
- onboard with name/email/timezone
- import calendar availability from a published URL (Outlook HTML/ICS) or uploaded file (`.ics`/`.html`)
- view personal busy blocks
- create a shared space with teammates
- see suggested group meeting slots
- propose a slot and get `valid`/`conflicted` status
- reset the demo database and auto-reseed demo users

## Requirements
- Node.js 20+ and npm

## Run the demo
1. Start the backend:
```bash
cd /Users/skz/Documents/sch/backend
npm install
npm run build
npm start
```

2. Start the frontend (new terminal):
```bash
cd /Users/skz/Documents/sch/frontend
npm install
npm run dev
```

3. Open the app:
- [http://localhost:5173](http://localhost:5173)

Backend health check (optional):
- [http://localhost:3001/health](http://localhost:3001/health)

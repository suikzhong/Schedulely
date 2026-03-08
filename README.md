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

## Run the demo (assume you're in the repo directory after cloning)

### Set up environment
```
cd backend
npm install
cd ../frontend
npm install
```

### Start both the frontend and backend:
```
cd backend
npm run build
npm start
cd ../frontend
npm run dev
```

### Start a browser, then open the app:
- [http://localhost:5173](http://localhost:5173)

Backend health check (optional):
- [http://localhost:3001/health](http://localhost:3001/health)

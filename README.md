# Quiz Portal

A full-stack quiz system with real-time student tracking, built with Node.js + Prisma + Redis + React.

## Prerequisites
- Node.js 18+
- PostgreSQL (running locally)
- Redis (running locally)

## Setup

### 1. Backend
```bash
cd backend
cp .env .env.local   # edit DATABASE_URL and REDIS_URL
npm install
npx prisma migrate dev --name init   # creates all tables
npm run dev          # starts on port 4000
```

### 2. Create first admin user
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin","email":"admin@school.com","password":"admin123","role":"admin"}'
```

### 3. Frontend
```bash
cd frontend
npm install
npm run dev     # starts on port 5173
```

## Usage Flow

### Admin
1. Login at http://localhost:5173
2. Dashboard → Create Quiz → set title, duration, shuffle option
3. Manage Quiz → Add Questions (MCQ with 4 options, mark correct answer)
4. Activate Quiz when ready
5. View Results → per-student report with time spent per question, visit count, answer changes

### Students
1. Login at http://localhost:5173
2. See available quizzes → Start Quiz
3. Answer questions — timer counts down, answers auto-saved every 5s
4. Submit or auto-submit when timer expires
5. View result with score

## Tech Stack
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Redis, node-cron
- **Frontend**: React 18, Vite, React Router, Axios
- **Auth**: JWT (8h expiry)

## Key Design Decisions
- Events batched every 5s from browser → minimal DB load
- Redis stores live answer buffer + session timer
- Background job auto-submits expired sessions every 10s
- Buffer flushed to Postgres every 30s as backup

<div align="center">

# 🚌 SLTB SRMSS

### Smart Route Management & Scheduling System

A full-stack web platform for the **Sri Lanka Transport Board (SLTB)** to manage bus routes, timetables, fleet, drivers, maintenance and fuel — with role-based access, live dashboards and exportable reports.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=nodedotjs&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)

</div>

---

## 📖 About

Managing a national bus fleet with spreadsheets and paper timetables leads to scheduling clashes, missed maintenance and untracked fuel spend. **SRMSS** centralises these operations in a single system so depot staff can plan routes, assign buses and drivers, monitor fleet health and produce management reports from one place.

Developed as part of the *Advanced Software Engineering* university coursework.

## ✨ Features

| Module | Capabilities |
|---|---|
| **Dashboard & Analytics** | Live fleet KPIs, bus-status breakdown, trip analytics, route performance and activity feed (Recharts) |
| **Route Management** | Create/edit routes (express, local, inter-city, rural), interactive map view with Leaflet |
| **Scheduling** | Schedule calendar, timetable management, daily/weekly/monthly/special timetables, delay & status tracking |
| **Fleet Management** | Bus registry with status (active, maintenance, delayed, out of service, idle), fuel type and detail pages |
| **Driver Management** | Driver profiles, licence class, shifts, availability, plus a **driver self-service** portal |
| **Maintenance & Fuel** | Maintenance records (routine, repair, inspection, overhaul, emergency), priorities, fuel logs and consumption |
| **Reports** | Analytics reports with **PDF export** (jsPDF) |
| **Notifications** | In-app alerts for maintenance, schedule and fuel events with priority levels |
| **User & System Settings** | User management and system settings for administrators |
| **Security** | JWT authentication, bcrypt password hashing, forgot/reset password by email, role-based route protection, Helmet, CORS and rate limiting |

## 👥 User Roles

| Role | Access |
|---|---|
| `super_admin` | Full system access, user management and settings |
| `depot_manager` | Depot operations, users and settings |
| `scheduler_officer` | Routes, schedules and timetables |
| `maintenance_officer` | Maintenance and fuel records |
| `driver` | Personal self-service portal |

## 🛠️ Tech Stack

**Frontend** — React 18, Vite, React Router 6, Tailwind CSS, Framer Motion, Recharts, React-Leaflet, Axios, jsPDF, Lucide icons

**Backend** — Node.js, Express, MongoDB with Mongoose, JSON Web Tokens, bcryptjs, express-validator, Multer, Nodemailer, Helmet, express-rate-limit, Morgan

## 🗂️ Project Structure

```
SLTB-SRMSS/
├── backend/
│   ├── config/         # Database connection
│   ├── middleware/     # Auth & file upload
│   ├── models/         # Mongoose schemas (User, Bus, Driver, Route, Schedule, ...)
│   ├── routes/         # REST API routes
│   ├── scripts/        # Database seed scripts
│   ├── utils/          # Email helper
│   └── server.js       # Express entry point
├── frontend/
│   └── src/
│       ├── components/ # UI kit, charts, layout, map
│       ├── context/    # Auth context
│       ├── pages/      # auth, dashboard, routes, schedules, buses, drivers, ...
│       └── services/   # Axios API client
├── START PROJECT.bat   # One-click launcher (Windows)
├── start-backend.bat
└── start-frontend.bat
```

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [MongoDB](https://www.mongodb.com/try/download/community) running locally (or a MongoDB Atlas URI)

### 1. Clone

```bash
git clone https://github.com/angiedazun/SLTB-SRMSS.git
cd SLTB-SRMSS
```

### 2. Configure the backend

```bash
cd backend
cp .env.example .env      # on Windows: copy .env.example .env
```

Edit `backend/.env` — at minimum set a strong `JWT_SECRET`, your `MONGODB_URI`, and (optionally) SMTP credentials for password-reset emails.

### 3. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 4. Seed demo data (optional)

```bash
cd backend
node scripts/seedAll.js   # users, buses, drivers, routes, schedules, maintenance and fuel logs
```

> ⚠️ Seeding **clears existing collections**. Use it on a development database only.

### 5. Run

**Windows (one click):** double-click `START PROJECT.bat`

**Manually:**

```bash
# Terminal 1 — API on http://localhost:5000
cd backend && npm run dev

# Terminal 2 — App on http://localhost:5173
cd frontend && npm run dev
```

Open **http://localhost:5173**.

### Demo accounts (seed data only)

| Role | Email | Password |
|---|---|---|
| Super Admin | `admin@sltb.lk` | `Admin@1234` |
| Depot Manager | `manager@sltb.lk` | `Manager@1234` |
| Scheduler Officer | `scheduler@sltb.lk` | `Scheduler@1234` |
| Maintenance Officer | `maintenance@sltb.lk` | `Maintenance@1234` |

These credentials exist only for local demos. **Never deploy with them** — change or remove them in production.

## 🔌 API Overview

All endpoints are prefixed with `/api` and (except auth) require a `Bearer` token.

`/auth` · `/users` · `/buses` · `/drivers` · `/routes` · `/schedules` · `/maintenance` · `/fuel` · `/reports` · `/dashboard` · `/notifications` · `/settings`

A health check is available at `GET /health`.

## 🔐 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | API port (default `5000`) |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret used to sign tokens — **keep private** |
| `JWT_EXPIRE` | Token lifetime (e.g. `7d`) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_USER` / `EMAIL_PASS` | SMTP settings for password-reset emails |
| `CLIENT_URL` | Frontend origin allowed by CORS |

## 👤 Author

**Anjana Dasun Dissanayake** — [@angiedazun](https://github.com/angiedazun)

## 📄 License

This project was created for academic purposes. All rights reserved by the author unless a license is added.

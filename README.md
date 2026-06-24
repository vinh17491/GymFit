# GymFit - Premium Home Training Platform

GymFit is a full-stack fitness e-commerce & coaching platform built with **React + TypeScript** (frontend) and **Express + TypeScript** (backend) on **SQL Server**. It combines a supplement store, membership plans, personal coaching bookings, AI-powered workout generation, diet plans, video library, community Q&A, real-time chat, health tracking, and a credits/loyalty system.

> **Vibe-coded project** - single comprehensive README for local setup & architecture overview.

---

## Tech Stack

| Layer | Technologies |
|-------|-------------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Redux Toolkit, React Query, React Hook Form, Yup, Framer Motion, React Router v6 |
| **Backend** | Node.js, Express, TypeScript, mssql, Socket.IO, JWT (jsonwebtoken), bcrypt, Cloudinary, Winston |
| **Database** | Microsoft SQL Server 2019+ (local or Docker) |
| **Real-time** | Socket.IO (chat, typing indicators, online status) |
| **Payment** | VietQR / Techcombank bank transfer (QR code via vietqr.io) - Stripe optional |
| **Auth** | JWT (access + refresh tokens), Google OAuth (Firebase or @react-oauth/google) |
| **AI** | Rule-based workout & meal plan generator (extensible to OpenAI) |
| **DevOps** | Docker Compose (backend + frontend + SQL Server), Fly.io deployment config |
| **PWA** | vite-plugin-pwa for offline support |

---

## Project Structure

```
GymFit/
  .gitignore
  package.json                  # Root: concurrently runs frontend + backend

  ecommerce-goshop-main/
    docker-compose.yml          # Docker Compose for full stack
    .eslintrc.json

    backend/
      src/
        index.ts                # Express server entry (helmet, CORS, rate-limit, routes)
        config/
          database.ts           # mssql connection pool
          jwt.ts                # JWT sign/verify helpers
          socket.ts             # Socket.IO init + auth middleware
          stripe.ts             # Stripe (deprecated, kept as stub)
          bank.ts               # Techcombank QR info
          logger.ts             # Winston logger
        controllers/            # 24 controllers
        middleware/              # auth, error, multer, rate-limit, validate, roles
        routes/                 # 24 route files (1:1 with controllers)
        services/
          vietqr.ts             # VietQR URL generator
        types/
        migrations/             # SQL migration scripts
        scripts/                # DB backup, migrate, seed helpers
      .env.example
      Dockerfile
      fly.toml
      tsconfig.json
      package.json

    frontend/
      src/
        main.tsx                # App bootstrap (React + Redux + React Query + Router)
        App.tsx                 # Top-level: ErrorBoundary, AuthProvider, Toast, Routes
        app/
          api.ts                # Axios instance (interceptors for auth, retry, toast)
          store.ts              # Redux store (favorites + cart, persisted)
          firebase.ts           # Firebase config (for Google Auth)
        context/
          AuthContext.tsx        # Auth context (login/signup/google/signout)
        routes/                 # AppRoutes with lazy-loaded features + ProtectedRoute
        features/               # 20 feature modules
        components/             # Shared UI components
        types/                  # TypeScript interfaces
        utils/                  # Helpers
        assets/styles/          # Tailwind CSS + custom styles
      .env
      vite.config.ts
      tailwind.config.js
      tsconfig.json
      index.html

    database/
      GymFit.sql                # Full DB schema (39 tables) with seed data

    docs/                       # Documentation & requirement docs
    tool/                       # Utility scripts
```

---

## Prerequisites

- **Node.js** >= 18 (tested with 20+)
- **SQL Server** - choose one:
  - Local: SQL Server 2019+ (Developer/Express)
  - Docker: `docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=YourPass@123' -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest`
- **npm** >= 9

---

## Environment Variables

### Backend (backend/.env)

```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# SQL Server Database
DB_HOST=localhost
DB_PORT=1433
DB_NAME=GymFit
DB_USER=sa
DB_PASSWORD=YourPass@123

# JWT
JWT_SECRET=change-this-in-production
JWT_REFRESH_SECRET=change-this-in-production

# Stripe (optional - leave empty to disable)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Cloudinary (for image uploads)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

### Frontend (frontend/.env)

```env
VITE_API_URL=http://localhost:3000
VITE_BACKEND_URL=http://localhost:3000
VITE_GOOGLE_CLIENT_ID=
VITE_STRIPE_PUBLISHABLE_KEY=
```

---

## Local Development

### 1. Database Setup

```powershell
# Option A: Docker SQL Server
docker run -e 'ACCEPT_EULA=Y' -e 'SA_PASSWORD=GymFit@123' -p 1433:1433 -d mcr.microsoft.com/mssql/server:2022-latest

# Option B: Local SQL Server - ensure it's running

# Then run the schema: connect via SSMS or Azure Data Studio to localhost, run database/GymFit.sql
```

### 2. Backend

```powershell
cd ecommerce-goshop-main/backend
cp .env.example .env           # Edit .env with your DB credentials
npm install
npm run server                 # ts-node-dev with hot reload on port 3000
```

### 3. Frontend

```powershell
cd ecommerce-goshop-main/frontend
npm install
npm run dev                    # Vite dev server on http://localhost:5115
```

### 4. Run Both (from root)

```powershell
cd GymFit
npm install
npm run dev                    # concurrently runs backend + frontend
```

---

## Docker (Production)

```powershell
cd ecommerce-goshop-main
docker-compose up -d
# Spins up: SQL Server (:1433) -> Backend (:5000) -> Frontend (:80)
```

---

## Features Overview

### Authentication & Roles
- 3 roles: ADMIN, COACH, MEMBER
- Register / Login / Google OAuth
- JWT access token (15 min) + refresh token (7 days) with rotation
- Role-based route protection (frontend & backend middleware)

### Supplement Store
- Full CRUD for supplements (admin)
- Categories, search, sort, pagination
- Favorites (Redux persisted) + Cart (Redux persisted)
- Checkout with QR bank transfer payment

### Membership Plans
- Multiple plans (duration, price, PT sessions, diet plan included)
- Purchase via QR bank transfer
- Membership status tracking (PENDING -> ACTIVE -> EXPIRED)

### Coach Booking
- Coach profiles (specialization, certifications, hourly rate)
- Schedule management (coach sets available slots)
- Book a session -> QR payment -> CONFIRMED -> COMPLETED
- Rating system

### Workout Programs
- Browse workouts with pagination, difficulty filter
- Save / favorite programs
- AI-powered workout generator (rule-based, extendable)
- Logbook: track workout & nutrition logs

### Diet Plans
- Diet plans created by coaches
- Save diet plans, daily calorie goals, meal breakdowns

### Blog
- CRUD blogs with tags, publish status
- Comments + likes

### Video Library
- Video catalog with categories, search, premium filter
- View count tracking

### Community Q&A
- Posts + answers, search by tag, pagination
- Like & view count

### Real-time Chat
- Socket.IO chat between members & coaches
- Conversation management, online status, typing indicators, read receipts

### Health Tracking
- BMI calculator, Body Fat calculator
- Health profile, free trial management, progress logs

### Credits & Rewards
- Credit balance, purchase credits, redeem rewards
- Admin adjustment capability

### Dashboard
- Member: workout logs, diet logs, progress overview
- Coach: student bookings, schedules
- Admin: all memberships, bookings, revenue overview

### Notifications
- In-app notification system

---

## Database Tables (39)

| Schema | Tables |
|--------|--------|
| **Auth & Users** | Roles, Users, RefreshTokens |
| **Membership** | MembershipPlans, Memberships |
| **Coaching** | Coaches, CoachSchedules, Bookings |
| **Products** | SupplementCategories, Supplements |
| **Orders** | Orders, OrderItems, Payments |
| **Workouts** | WorkoutPrograms, WorkoutProgramExercises, WorkoutProgramFavorites, WorkoutProgramSaves, WorkoutSessions, WorkoutLogs, WorkoutLogExercises |
| **Diet** | DietPlans, DietPlanSaves, FoodDatabase, MealLogs |
| **Blog** | Blogs, BlogComments, BlogLikes |
| **Community** | QAPosts, QAAnswers |
| **Video** | Videos |
| **Health** | HealthProfiles, FreeTrials, ProgressLogs |
| **Chat** | ChatConversations, ChatMessages |
| **Credits** | Credits, CreditTransactions |
| **Other** | Notifications, Reviews, CoachStudentAssignments |

---

## Auth Flow

```
Frontend  --POST /auth/login--> Backend --JWT sign--> Store tokens
Frontend  --GET /protected--> Backend --verify access token--> response
On 401 --retry--> Refresh token rotation -> new tokens
On 401 + expired --> redirect to /auth/login
```

## Payment Flow

```
User checks out (supplement / membership / booking)
  |
  v
Backend creates Order/Membership/Booking (status = PENDING)
  |
  v
Backend generates VietQR URL via img.vietqr.io
  -> Bank: Techcombank | Account: 01101749880417 | Content: GYMFIT-{orderId}
  |
  v
Frontend shows QR code to user
  |
  v
User scans & transfers via banking app
  |
  v
Admin confirms payment (PATCH /payments/:id/confirm)
  -> Status -> SUCCEEDED
  -> Order -> PROCESSING
  -> Booking -> CONFIRMED
  -> Membership -> ACTIVE
```

---

## API Routes Overview

| Prefix | Description | Auth |
|--------|-------------|------|
| GET /health | Health check | Public |
| POST /auth/* | Login, register, Google, refresh | Public |
| GET/POST /products | Supplement CRUD | Public / Admin |
| GET /category | Categories | Public |
| GET /coaches | Coach listing & detail | Public |
| POST /bookings | Create/cancel bookings | Member |
| GET/POST /membership | Plans & purchase | Public / Member |
| POST /checkout | Create order & QR | Member |
| GET /orders | User orders | Member |
| POST /payment | Payment confirm | Admin |
| GET /workouts | Workout programs | Public |
| GET /diet | Diet plans | Public |
| GET /blogs | Blog list & detail | Public |
| GET/POST /community | Q&A posts | Member |
| GET/POST /videos | Video catalog | Member |
| GET/POST /chat | Conversations & messages | Member/Coach |
| GET/POST /health | BMI, body fat, profile | Member |
| GET/POST /ai/* | AI workout/meal generator | Member |
| GET/POST /credits | Credit system | Member |
| GET/POST /dashboard | Dashboard data | All roles |
| GET /notifications | User notifications | Member |
| GET/POST /logbook | Workout & nutrition logs | Member |
| PATCH /users | Profile update | All roles |

---

## Deployment (Fly.io)

Configured in backend/fly.toml:
- App: goshop-backend
- Region: lhr (London)
- Internal port: 3000
- HTTPS enforced

```powershell
fly deploy
fly secrets set JWT_SECRET=... JWT_REFRESH_SECRET=... DB_HOST=... DB_USER=... DB_PASSWORD=...
```

---

## Security Notes

- Helmet for security headers
- Rate-limiting: 200 req/15min global, 10 req/15min for auth
- CORS restricted to known origins
- JWT access token: 15 min expiry
- Refresh token rotation (old tokens revoked on each refresh)
- SQL injection mitigated via parameterized queries (mssql)
- File uploads via Cloudinary (no local storage for public images)
- Input validation on key endpoints (express-validator + manual checks)
- Password hashing with bcrypt (cost factor 12)

---

## Audit Status

Last audit: FINAL_AUDIT_REPORT.md - Score: 72/100

| Area | Score | Status |
|------|-------|--------|
| Architecture | 75 | Good |
| Frontend | 70 | Needs work |
| Backend | 75 | Needs work |
| Database | 65 | Needs indexes (18 added) |
| Authentication | 80 | Good |
| Authorization | 70 | IDOR risk (fixed) |
| Security (OWASP) | 60 | Critical issues (fixed) |
| DevOps | 50 | No CI/CD |
| Performance | 65 | No caching |
| Testing | 20 | No tests |
| Monitoring | 40 | Basic logging only |

All critical and high issues from the audit have been resolved.

---

## Next Priority

Add automated CI/CD pipeline with GitHub Actions (lint, build, test, deploy).
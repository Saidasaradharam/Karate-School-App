# Karate-School-App

# 🥋 Kodokan India — Karate School Management App

A full-stack web application for managing a karate school — students, fees, attendance, belt progression, photos, and multi-branch admin support.

**Live Demo:** [https://kodokan-india.vercel.app](https://kodokan-india.vercel.app)  
**API Docs:** [https://kodokan-india.up.railway.app/docs](https://kodokan-india.up.railway.app/docs)

---

## 🧰 Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| FastAPI | REST API framework |
| PostgreSQL | Primary database |
| SQLAlchemy | ORM |
| Alembic | Database migrations |
| python-jose | JWT authentication |
| passlib + bcrypt | Password hashing |
| APScheduler | Scheduled cleanup jobs |
| slowapi | Rate limiting |
| bleach | Input sanitization |

### Frontend
| Tool | Purpose |
|------|---------|
| React 18 | UI framework |
| React Router v6 | Client-side routing |
| React Query | Server state management |
| Tailwind CSS | Styling |
| Axios | HTTP client |
| Vite | Build tool |
| vite-plugin-pwa | PWA support |

### Infrastructure
| Service | Purpose |
|---------|---------|
| Railway | Backend + PostgreSQL hosting |
| Vercel | Frontend hosting |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────┐
│                    CLIENT (Browser/PWA)              │
│              React + React Query + Tailwind          │
│                   Hosted on Vercel                   │
└────────────────────────┬─────────────────────────────┘
                         │ HTTPS REST API
                         ▼
┌──────────────────────────────────────────────────────┐
│                 BACKEND (FastAPI)                    │
│              JWT Auth + Rate Limiting                │
│                 Hosted on Railway                    │
│                                                      │
│  ┌─────────────┐  ┌────────────┐  ┌──────────────┐   │
│  │   Routers   │  │   Models   │  │  Scheduler   │   │
│  │  /students  │  │   Users    │  │ Photo Cleanup│   │
│  │  /fees      │  │  Students  │  └──────────────┘   │
│  │  /attendance│  │  Branches  │                     │
│  │  /branches  │  │  FeeRecord │                     │
│  │  /admins    │  │  Attendance│                     │
│  │  /photos    │  │   Photos   │                     │
│  │  /auth      │  └────────────┘                     │
│  └─────────────┘                                     │
└───────────┬──────────────────────────────────────────┘
            │                         
            ▼                         
┌────────────────────┐    
│   PostgreSQL DB    │    
│   (Railway)        │    
│                    │    
│  users             │    
│  students          │    
│  branches          │    
│  fee_records       │
│  attendance        │
│  photos            │
│  notifications     │
│  branch_requests   │
│  promotion_requests│
│  admin_branches    │
└────────────────────┘
```

---

## 👥 User Roles

| Role | Access |
|------|--------|
| `student` | Dashboard, fees, attendance, photos, profile |
| `admin` | Students, attendance, schedule, branches, photo gallery |
| `super_admin` | Everything + branch management, admin management, fee entry |

---

## 📁 Project Structure

```
karate-school-app/
├── backend/
│   ├── alembic/              # Database migrations
│   │   ├── versions/
│   │   └── env.py
│   ├── auth/
│   │   ├── dependencies.py   # JWT + role guards
│   │   └── utils.py          # Password hashing
│   ├── cron/
│   │   └── cleanup.py        # APScheduler photo cleanup
│   ├── models/
│   │   └── models.py         # SQLAlchemy models
│   ├── routers/
│   │   ├── admins.py         # Admin CRUD + promotion requests
│   │   ├── attendance.py     # Mark + view attendance
│   │   ├── auth.py           # Login + register
│   │   ├── belt_grades.py    # Belt grade management
│   │   ├── branches.py       # Branch CRUD + requests
│   │   ├── fees.py           # Fee records + summaries
│   │   ├── notifications.py  # In-app notifications
│   │   ├── payments.py       # Offline payment requests
│   │   ├── photos.py         # Photo upload + R2 (For future plan)
│   │   └── students.py       # Student profiles
│   ├── utils/
│   │   └── notify.py         # Notification helper
│   ├── alembic.ini
│   ├── database.py           # DB connection + session
│   ├── main.py               # FastAPI app + middleware
│   └── requirements.txt
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js      # Axios instance + interceptors
│   │   ├── components/       # Reusable components
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── hooks/            # Custom React hooks
│   │   ├── layouts/
│   │   │   └── MainLayout.jsx
│   │   ├── pages/
│   │   │   ├── admin/        # Admin pages
│   │   │   ├── superadmin/   # Super admin pages
│   │   │   └── shared/       # Shared pages
│   │   └── styles/
│   │       └── login.css
│   ├── vercel.json           # Vercel SPA rewrite config
│   └── vite.config.js
│
├── Dockerfile                # Docker build for Railway
├── railway.json              # Railway deployment config
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites
- Python 3.11+
- Node.js 18+
- PostgreSQL (local or use Railway's public URL)

### Backend Setup

```bash
# Clone repo
git clone https://github.com/yourusername/karate-school-app.git
cd karate-school-app/backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Copy env file and fill in values
cp .env.example .env

# Run migrations
alembic upgrade head

# Create super admin + seed data
python add_data.py

# Start dev server
uvicorn main:app --reload
```

Backend runs at: `http://localhost:8000`  
Swagger docs: `http://localhost:8000/docs`

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env

# Start dev server
npm run dev
```

Frontend runs at: `http://localhost:5173`

---

## 🗄️ Database Schema

```
users                    — email, hashed_password, role, branch_id
students                 — user_id, full_name, dob, contact, belt_grade
branches                 — name, location, is_active
admin_branches           — admin_id, branch_id (many-to-many)
branch_requests          — branch_id, requested_by, status
fee_records              — student_id, amount, month, year, paid_date
offline_payment_requests — student_id, amount, status, proof_url
attendance               — student_id, date, status
photos                   — branch_id, url, caption, expires_at
notifications            — user_id, message, is_read
promotion_requests       — student_id, reason, status, reviewed_by
active_belt_grades       — grade, is_active
branch_schedules         — branch_id, day_of_week
```

---

## 📡 API Endpoints

Full interactive docs: `https://kodokan-india.up.railway.app/docs`

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login, returns JWT |
| POST | `/auth/register` | Register new student |

### Students
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/students/` | List students (branch-filtered) |
| GET | `/students/me` | Current student profile |
| PUT | `/students/me` | Update profile |

### Fees
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/fees/my-fees` | Student's fee history |
| GET | `/fees/branch-summary` | Admin fee overview |
| POST | `/fees/` | Record fee payment |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/attendance/branch` | Branch attendance for date |
| POST | `/attendance/mark` | Mark attendance |
| GET | `/attendance/branch/history` | Monthly history |
| GET | `/attendance/my` | Student's own attendance |

### Branches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/branches/my-branches` | Admin's assigned branches |
| POST | `/branches/` | Create branch (super admin) |
| PATCH | `/branches/{id}` | Update branch |
| DELETE | `/branches/{id}` | Delete branch |
| POST | `/branches/request` | Request new branch (admin) |
| GET | `/branches/requests` | Pending requests (super admin) |
| PATCH | `/branches/requests/{id}/approve` | Approve + assign requester |
| PATCH | `/branches/requests/{id}/reject` | Reject + delete branch |

### Admins
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admins/` | List all admins |
| POST | `/admins/` | Create admin |
| PUT | `/admins/{id}` | Update admin |
| DELETE | `/admins/{id}` | Delete admin |
| POST | `/admins/promote` | Promote student to admin |
| POST | `/admins/promotion-requests` | Request promotion (student) |
| GET | `/admins/promotion-requests` | View requests (super admin) |
| PATCH | `/admins/promotion-requests/{id}/approve` | Approve |
| PATCH | `/admins/promotion-requests/{id}/reject` | Reject |

### Photos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/photos/` | Branch photos |
| POST | `/photos/` | Upload photo |
| DELETE | `/photos/{id}` | Delete photo |

---

## 🌟 Features

- **Role-based access control** — student, admin, super admin
- **Multi-branch admin support** — admins can manage multiple branches via junction table
- **Fee tracking** — monthly fee records with offline payment approval workflow
- **Attendance management** — mark and view with belt-grade reverse sorting
- **Belt journey visualization** — student profile shows full progression
- **Photo gallery** — branch photos with auto-expiry cleanup via APScheduler
- **Notifications** — in-app notification system
- **Branch request workflow** — admins request, super admin approves/rejects
- **Promotion request workflow** — students request, super admin reviews
- **PWA support** — installable on mobile, works offline
- **Rate limiting** — 5 login attempts per minute
- **Input sanitization** — bleach for XSS prevention
- **Security headers** — CSP, X-Frame-Options, etc.
- **Responsive UI** — mobile-first, hamburger nav

---

## 🚢 Deployment

### Backend (Railway)
1. Connect GitHub repo to Railway
2. Railway detects `Dockerfile` automatically
3. Add PostgreSQL service → copy `DATABASE_URL`
4. Set all environment variables in Railway Variables tab
5. Run `railway run alembic upgrade head`

### Frontend (Vercel)
1. Connect GitHub repo to Vercel
2. Set root directory to `frontend`
3. Add `VITE_API_URL=https://kodokan-india.up.railway.app`
4. Deploy — auto-deploys on every push to main

---

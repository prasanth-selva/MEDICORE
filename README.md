# 🏥 MediCore HMS

**AI-Powered Hospital Management System** — A full-stack, real-time HMS with intelligent inventory forecasting, disease prediction, drug interaction checking, and multi-portal access for Admin, Doctors, Pharmacy, and Patients.

---

## ✨ Features

### 🔐 Authentication & Security
- JWT with refresh token rotation
- Role-Based Access Control (Admin, Doctor, Pharmacist, Receptionist, Patient)
- Rate limiting and helmet security headers

### 📊 Admin Portal
- Real-time dashboard with revenue charts and disease analytics
- Live patient queue and doctor status board
- SOS emergency command centre

### 🩺 Doctor Portal
- Patient queue management with triage severity
- Prescription builder with voice input and templates
- Real-time prescription delivery to pharmacy via Socket.IO
- Multi-status selector (Available, With Patient, Break, etc.)

### 💊 Pharmacy Portal
- Live prescription feed from doctors
- Inventory management with FEFO tracking and CSV import
- Billing with Cash/UPI/Card payment processing
- AI Intelligence Hub (disease forecast, restock AI, drug interactions)

### 👤 Patient Portal
- Doctor availability board with live status
- Appointment booking with time slots
- Medical records and prescription history
- SOS Emergency with GPS and real-time acknowledgment

### 🤖 AI Microservice
- **Disease Prediction** — Seasonal forecasting with confidence scoring
- **Inventory Forecasting** — Demand prediction with restock recommendations
- **Drug Interaction Checker** — 18+ known interaction database with severity levels

---

## 🏗️ Architecture

```
HEALTHCORE/
├── backend/                  # Node.js + Express API
│   ├── migrations/           #   PostgreSQL schema (init.sql)
│   ├── seeds/                #   Demo data seeder
│   └── src/
│       ├── config/           #   Database & Redis configuration
│       ├── controllers/      #   8 route controllers
│       ├── middleware/        #   JWT auth, RBAC, error handler
│       ├── models/           #   16 Sequelize models
│       ├── routes/           #   9 Express route files
│       └── socket/           #   Socket.IO event handlers
├── ai_service/               # Python FastAPI microservice
│   └── api/routes/           #   Predict, interactions, health
├── frontend/                 # React + Vite SPA
│   └── src/
│       ├── admin/            #   Admin dashboard
│       ├── doctor/           #   Doctor portal (queue, prescriptions)
│       ├── pharmacy/         #   Pharmacy portal (inventory, billing, AI)
│       ├── patient/          #   Patient portal (doctors, records, SOS)
│       ├── pages/            #   Login page
│       └── shared/           #   Context, components, utilities
├── nginx/                    # Reverse proxy configuration
├── docker-compose.yml        # Container orchestration
└── .env.example              # Environment template
```

---

## 🚀 Quick Start

### Option 1: Docker (Full Stack)

```bash
cp .env.example .env
docker-compose up --build
```

| Service    | URL                      |
|------------|--------------------------|
| Frontend   | http://localhost:3000     |
| Backend    | http://localhost:5000/api |
| AI Service | http://localhost:8000     |

### Option 2: Frontend Only (Demo Mode)

```bash
cd frontend
npm install
npm run dev
```

The frontend includes a **demo mode** that works without the backend. Click any Quick Demo Login button — if the backend is unreachable, it automatically falls back to local demo user profiles.

### Option 3: Full Local Development

```bash
# Terminal 1: Backend
cd backend
npm install
npm run dev

# Terminal 2: AI Service
cd ai_service
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 3: Frontend
cd frontend
npm install
npm run dev
```

---

## 🔑 Demo Accounts

All demo accounts use password: `admin123`

| Role        | Email                     |
|-------------|---------------------------|
| Admin       | admin@medicore.com        |
| Doctor      | dr.sharma@medicore.com    |
| Pharmacist  | pharmacy@medicore.com     |
| Patient     | patient@medicore.com      |
| Receptionist| reception@medicore.com    |

### Seed the Database

```bash
cd backend
npm run seed
```

---

## 🔌 Real-Time Events (Socket.IO)

| Event                   | Direction        | Description                      |
|-------------------------|------------------|----------------------------------|
| `DOCTOR_STATUS_CHANGED` | Server → Client  | Doctor updates their status      |
| `PRESCRIPTION_SENT`     | Server → Pharmacy| New prescription from doctor     |
| `PRESCRIPTION_DISPENSED`| Server → Patient | Pharmacy dispenses medicines     |
| `SOS_ALERT`             | Client → All     | Patient emergency broadcast      |
| `SOS_ACKNOWLEDGED`      | Server → Patient | Doctor acknowledges SOS          |
| `QUEUE_UPDATED`         | Server → Client  | Patient queue position changed   |

---

## 🛠️ Tech Stack

| Layer    | Technology                                          |
|----------|-----------------------------------------------------|
| Frontend | React 18, Vite, Recharts, Lucide Icons, Socket.IO   |
| Backend  | Node.js, Express, Sequelize, JWT, Socket.IO          |
| AI       | Python, FastAPI, scikit-learn, Prophet                |
| Database | PostgreSQL 15, Redis 7                                |
| Infra    | Docker, Nginx, Docker Compose                        |

---

## 📄 API Endpoints

| Module        | Endpoints                                           |
|---------------|-----------------------------------------------------|
| Auth          | POST `/api/auth/login`, `/register`, `/refresh`     |
| Patients      | GET/POST/PUT `/api/patients`, `/search`, `/:id/history` |
| Doctors       | GET/POST/PUT `/api/doctors`, `/status`, `/queue`    |
| Appointments  | GET/POST/PUT `/api/appointments`, `/slots`          |
| Prescriptions | GET/POST `/api/prescriptions`, `/templates`         |
| Inventory     | GET/POST `/api/inventory/medicines`, `/batches`, `/import` |
| Billing       | GET/POST `/api/billing`, `/pay`, `/analytics`       |
| SOS           | POST `/api/sos`, `/acknowledge`                     |
| Dashboard     | GET `/api/dashboard/stats`, `/diseases`, `/notifications` |
| AI Predict    | POST `/predict/disease`, `/predict/restock`         |
| AI Check      | POST `/check/interactions`                          |

---

## 📜 License

MIT License © 2024 MediCore HMS

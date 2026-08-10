# 💼 Employee Management System (EMS)

A full-stack, enterprise-grade Employee Management System built with **Django REST Framework** on the backend and **React (Vite)** on the frontend. Featuring real-time WebSocket chat, granular role-based access control (RBAC), interactive task sprint management, HR administration, ticket resolution, and gamified employee rewards.

---

## 🚀 System Features

- 🔐 **Role-Based Authentication**: Secure JWT-based authentication for `Admin`, `Manager`, and `Employee` roles.
- 📋 **Task & Sprint Management**: Create, assign, review, and track tasks with interactive checklists and sprint milestones.
- 👔 **HR & Department Control**: Manage employee roles, departments, manager hierarchy, and hourly rates.
- 🏆 **Rewards & Gamified Leaderboard**: Reward exceptional performance with points, bonuses, and real-time leaderboard rankings.
- 🎫 **Support Ticketing**: Internal ticket submission, supervisor assignment, status updates, and audit comments.
- 📅 **Meeting Management**: Schedule meetings, track attendance, and rate meeting quality.
- 💬 **Real-Time WebSocket Chat**: Instant messaging across channels and direct messages backed by a custom WebSocket server.
- 📊 **Analytics & Reports**: Visual productivity breakdown, exportable reporting, and administrative dashboards.

---

## 🛠 Tech Stack

### Backend
- **Framework**: Python 3.10+ / Django 5.x & Django REST Framework (DRF)
- **Authentication**: SimpleJWT (`rest_framework_simplejwt`)
- **Real-Time Chat**: Standalone `websocket_server` with JWT payload decoding
- **Database**: SQLite (Development) / PostgreSQL (Production supported)
- **API Documentation**: OpenAPI / Swagger via `drf-spectacular`

### Frontend
- **Framework**: React 18+ powered by Vite
- **Styling**: Modern Vanilla CSS Design Tokens (Glassmorphism, Dark/Light modes)
- **Routing**: React Router v6 with Role-Based Route Guards (`RoleRoute`)
- **HTTP Client**: Axios with automated JWT refresh request interceptors
- **Notifications**: React Hot Toast

---

## 📁 Repository Structure

```
.
├── backend/
│   ├── apps/
│   │   ├── accounts/         # Authentication, User Models, WorkLogs & HR
│   │   ├── tasks/            # Task management, Checklists & Sprints
│   │   ├── tickets/          # Support ticketing workflow
│   │   ├── meetings/         # Calendar & meeting ratings
│   │   ├── notifications/    # In-app notifications engine
│   │   ├── reports/          # Admin analytics & CSV export
│   │   ├── rewards/          # Gamification & Leaderboard
│   │   └── chat/             # Chat channels & Direct messaging models
│   ├── config/               # Django settings, URLs, ASGI & WSGI
│   ├── reset_tasks.py        # Database seed script for task rewards
│   ├── socket_server.py       # Standalone WebSocket server (Port 8001)
│   ├── manage.py
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/              # Centralized Axios API client
│   │   ├── components/       # Reusable UI components (Sidebar, Topbar, Modal)
│   │   ├── context/          # Global AuthContext provider
│   │   ├── layouts/          # Dashboard & Auth layout wrappers
│   │   ├── pages/            # View components (Home, Tasks, HR, Rewards, etc.)
│   │   ├── App.jsx           # Main Router & Role Guard configurations
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .env.example
├── .gitignore
└── README.md
```

---

## ⚙️ Local Development Setup

### 1. Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Seed sample data (Optional)
python manage.py seed_data

# Start Django backend server (Port 8000)
python manage.py runserver
```

In a separate terminal, launch the standalone WebSocket server for chat:
```bash
python socket_server.py
```

---

### 2. Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install packages
npm install

# Start Vite development server (Port 5173)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 📡 API Endpoints Summary

| Feature | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login/` | User login & token generation |
| **Auth** | `GET` | `/api/auth/me/` | Current user profile |
| **Tasks** | `GET/POST` | `/api/tasks/` | List and create tasks |
| **Tasks** | `POST` | `/api/tasks/{id}/complete/` | Mark task as completed / submitted |
| **HR** | `GET` | `/api/hr/employees/` | List all employees and managers |
| **HR** | `POST` | `/api/auth/departments/` | Create a new department |
| **Rewards**| `GET` | `/api/rewards/leaderboard/` | Top performing employees |
| **Tickets**| `GET/POST` | `/api/tickets/` | List and open support tickets |

---

## 📜 License

This project is licensed under the MIT License.

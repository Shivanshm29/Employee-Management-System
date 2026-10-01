# 💼 Employee Management System (EMS)

[![Django](https://img.shields.io/badge/Django-5.x-092E20?style=for-the-badge&logo=django&logoColor=white)](https://www.djangoproject.com/)
[![Django REST Framework](https://img.shields.io/badge/DRF-3.14+-red?style=for-the-badge&logo=django&logoColor=white)](https://www.django-rest-framework.org/)
[![React](https://img.shields.io/badge/React-19+-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](LICENSE)

A full-stack, enterprise-grade Employee Management System engineered with **Django REST Framework** on the backend and **React (Vite)** on the frontend. EMS is designed with strict Role-Based Access Control (RBAC), real-time WebSocket communication, task sprint pipelines, support ticket approvals, meeting coordination, gamified performance rewards, and managerial analytics.

---

## 📑 Table of Contents

- [Key Features](#-key-features)
  - [Role-Based Access Control](#1-role-based-access-control-rbac)
  - [Task & Sprint Management](#2-task--sprint-management)
  - [Support Ticketing System](#3-support-ticketing-system)
  - [Meeting & Video Conferencing](#4-meeting--video-conferencing)
  - [Real-Time WebSocket Chat](#5-real-time-websocket-chat)
  - [Gamified Rewards & Leaderboard](#6-gamified-rewards--leaderboard)
  - [Analytics & Exportable Reports](#7-analytics--exportable-reports)
- [Tech Stack](#-tech-stack)
- [Repository Structure](#-repository-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. WebSocket Server Setup](#2-websocket-server-setup)
  - [3. Frontend Setup](#3-frontend-setup)
- [Demo Credentials](#-demo-credentials)
- [API Endpoints](#-api-endpoints)
- [Environment Variables](#-environment-variables)
- [License](#-license)

---

## 🚀 Key Features

### 1. Role-Based Access Control (RBAC)
- **Granular Roles**: Strict permission separation for **Admin**, **Manager**, and **Employee**.
- **Secure Authentication**: Stateless JWT authentication (`rest_framework_simplejwt`) with automatic token refresh interceptors.
- **Hierarchical Structure**: Organizational departments, manager-to-employee reporting trees, and hourly compensation tracking.
- **Work Session Auditing**: Automated login/logout tracking with work-duration timestamps.

### 2. Task & Sprint Management
- **Lifecycle Pipeline**: Progress tasks across `Assigned` ➔ `In Progress` ➔ `Pending Review` ➔ `Completed`.
- **Interactive Checklists**: Sub-task item tracking and daily standup checklists.
- **Sprint Organization**: Milestone sprints with estimated vs. actual hour auditing.
- **Manager Review Workflow**: Managers can accept completed work or reject with feedback for rework.

### 3. Support Ticketing System
- **Ticket Categories**: Report bugs, feature requests, IT incidents, change requests, and general support.
- **Approval Pipeline**: Tickets submit for manager approval; approved tickets automatically convert into assignable tasks.
- **Audit History**: Full chronological event timeline and audit comments on each ticket.

### 4. Meeting & Video Conferencing
- **Meeting Scheduler**: Organize syncs, set agendas, specify time windows, and invite participants.
- **Jitsi Meet Integration**: One-click joinable video conference rooms automatically generated per meeting.
- **RSVP & Quality Ratings**: Track participant attendance status and post-meeting effectiveness ratings.

### 5. Real-Time WebSocket Chat
- **Channels & Direct Messaging**: Global company announcements, manager team hubs, and private 1-on-1 conversations.
- **Live Communication**: Standalone WebSocket server with JWT authentication for instant bidirectional message delivery.
- **Broadcast Notices**: Manager alerts dispatched company-wide or to dedicated team rooms.

### 6. Gamified Rewards & Leaderboard
- **Recognition & Bonuses**: Reward employees with commendation points and monetary bonuses (₹).
- **Auto-Crediting**: Automated bonus creation when milestone tasks with reward budgets are marked completed.
- **Live Leaderboard**: Real-time ranking of top performers across the organization.

### 7. Analytics & Exportable Reports
- **Executive Dashboards**: Visual charts for task status distribution and department productivity.
- **Work Logs**: Daily session duration and attendance logs for transparency.
- **CSV Data Export**: One-click administrative downloads for task registries and performance metrics.

---

## 🛠 Tech Stack

| Domain | Technology | Description |
| :--- | :--- | :--- |
| **Backend** | Python 3.10+ / Django 5.x | Core application server & ORM |
| **API** | Django REST Framework (DRF) | RESTful API endpoints and serializers |
| **Authentication** | SimpleJWT | Token-based stateless authentication |
| **Real-Time** | Python WebSocket Server | Standalone WebSocket engine (port 8001) |
| **Database** | SQLite (Dev) / PostgreSQL (Prod) | Relational database management |
| **API Docs** | drf-spectacular (OpenAPI / Swagger) | Automated API schema generation |
| **Frontend** | React 19+ / Vite | Modern high-performance UI library & bundler |
| **Routing** | React Router v7 | Protected routes with `RoleRoute` guards |
| **HTTP Client** | Axios | Custom interceptors for token auto-refresh |
| **Data Viz** | Recharts | Responsive charting and analytics views |
| **Styling** | Vanilla CSS Design System | Responsive dark/light theme & glassmorphic tokens |

---

## 📁 Repository Structure

```
Employee-Management-System/
├── backend/
│   ├── apps/
│   │   ├── accounts/             # User models, authentication, work logs, HR
│   │   ├── tasks/                # Tasks, checklists, sprints, review signals
│   │   ├── tickets/              # Ticket workflow, approvals, audit logs
│   │   ├── meetings/             # Scheduling, Jitsi links, participant RSVP
│   │   ├── notifications/        # In-app notification engine
│   │   ├── reports/              # Productivity analytics & CSV exports
│   │   ├── rewards/              # Performance points, bonuses & leaderboard
│   │   └── chat/                 # Chat rooms, messaging models, broadcasts
│   ├── config/                   # Django settings, URLs, ASGI & WSGI
│   ├── scripts/                  # Data setup and migration utility scripts
│   ├── socket_server.py          # Standalone WebSocket server (Port 8001)
│   ├── reset_tasks.py            # Task and reward seeder script
│   ├── manage.py                 # Django command-line utility
│   ├── requirements.txt          # Python backend dependencies
│   └── .env.example              # Backend environment variables template
├── frontend/
│   ├── public/                   # Static assets & SVG icons
│   ├── src/
│   │   ├── api/                  # Axios instance and API service calls
│   │   ├── components/           # Reusable UI (Sidebar, Topbar, Modal, etc.)
│   │   ├── context/              # AuthContext & global state providers
│   │   ├── layouts/              # DashboardLayout & AuthLayout
│   │   ├── pages/                # Application views (Home, Tasks, Chat, etc.)
│   │   ├── App.jsx               # Router configuration & role route guards
│   │   ├── index.css             # Design tokens, variables & typography
│   │   └── main.jsx              # React DOM entry point
│   ├── package.json              # Node packages & build scripts
│   ├── vite.config.js            # Vite configuration
│   └── .env.example              # Frontend environment variables template
├── .env.example                  # Root combined environment template
├── .gitignore                    # Git ignore specifications
├── CONTRIBUTING.md               # Contribution workflow & commit conventions
├── LEARNING_GUIDE.md             # Codebase architecture & vertical slice guide
├── LICENSE                       # MIT License
└── README.md                     # Project documentation
```

---

## ⚙️ Getting Started

### Prerequisites
- **Python**: `3.10` or higher ([Download Python](https://www.python.org/downloads/))
- **Node.js**: `18.0` or higher ([Download Node.js](https://nodejs.org/))
- **Git**: Installed and configured ([Download Git](https://git-scm.com/))

---

### 1. Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   - **Windows**:
     ```bash
     python -m venv venv
     venv\Scripts\activate
     ```
   - **macOS / Linux**:
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Initialize database & apply migrations**:
   ```bash
   python manage.py migrate
   ```

5. **Seed sample data** (Creates departments, managers, employees, sprints, tasks, and meetings):
   ```bash
   python manage.py seed_data
   ```

6. **Start the Django development server**:
   ```bash
   python manage.py runserver
   ```
   *The backend REST API will be running at `http://127.0.0.1:8000/`.*

---

### 2. WebSocket Server Setup

In a separate terminal window, activate your virtual environment and run the real-time chat socket engine:

```bash
cd backend
# Windows:
venv\Scripts\activate
# macOS / Linux:
source venv/bin/activate

python socket_server.py
```
*The WebSocket server will listen on `ws://127.0.0.1:8001/`.*

---

### 3. Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install frontend dependencies**:
   ```bash
   npm install
   ```

3. **Start the Vite development server**:
   ```bash
   npm run dev
   ```

4. **Open the application**:
   Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🔑 Demo Credentials

All seeded sample accounts share the default password: **`password123`**

| Role | Email | Name | Department | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@ems.dev` | Admin User | Engineering | Full system control, HR management, department configuration |
| **Manager** | `manager1@ems.dev` | Priya Sharma | Engineering | Team oversight, task assignment, review approvals, analytics |
| **Manager** | `manager2@ems.dev` | Arun Kumar | Product | Team oversight, ticket reviews, meeting host |
| **Employee** | `emp1@ems.dev` | Rahul Mehta | Engineering | Task execution, ticket submissions, meetings, rewards |
| **Employee** | `emp2@ems.dev` | Sneha Patel | Engineering | Task execution, daily checklists, chat, rewards |
| **Employee** | `emp3@ems.dev` | Vikram Singh | Design | Task execution, work sessions, leaderboard |
| **Employee** | `emp4@ems.dev` | Anjali Nair | Product | Task execution, work sessions, leaderboard |

> [!NOTE]
> When logging in via the web interface or the Django Admin panel (`http://127.0.0.1:8000/admin/`), use the **Email address** as the login identifier.

---

## 📡 API Endpoints

| Domain | Method | Endpoint | Description |
| :--- | :--- | :--- | :--- |
| **Auth** | `POST` | `/api/auth/login/` | Authenticate user & issue JWT tokens |
| **Auth** | `POST` | `/api/auth/refresh/` | Refresh expired access token |
| **Auth** | `GET` | `/api/auth/me/` | Fetch authenticated user profile |
| **Tasks** | `GET / POST` | `/api/tasks/` | List assigned tasks or create new tasks |
| **Tasks** | `POST` | `/api/tasks/{id}/complete/` | Submit task for manager review |
| **Tasks** | `POST` | `/api/tasks/{id}/review/` | Manager approve or request rework |
| **Tickets** | `GET / POST` | `/api/tickets/` | List and file support tickets |
| **Tickets** | `POST` | `/api/tickets/{id}/approve/` | Approve ticket & convert to task |
| **Meetings** | `GET / POST` | `/api/meetings/` | List upcoming meetings or schedule new sync |
| **Rewards** | `GET` | `/api/rewards/leaderboard/` | View organization-wide leaderboard |
| **Chat** | `GET / POST` | `/api/chat/rooms/` | List chat rooms or create direct conversation |
| **Reports** | `GET` | `/api/reports/dashboard/` | High-level metrics for dashboard cards |
| **Reports** | `GET` | `/api/reports/export/?type=tasks` | Download CSV task export |
| **API Docs** | `GET` | `/api/schema/swagger-ui/` | Interactive OpenAPI / Swagger UI |

---

## 🔒 Environment Variables

Copy `.env.example` to `.env` in both the backend and frontend directories as needed:

### Backend (`backend/.env`)
```ini
DJANGO_SECRET_KEY=your-custom-django-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
USE_POSTGRES=False
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

### Frontend (`frontend/.env`)
```ini
VITE_API_BASE_URL=http://localhost:8000/api
VITE_WS_URL=ws://localhost:8001
```

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Shivansh Mishra**  
- GitHub: [@Shivanshm29](https://github.com/Shivanshm29)
- Repository: [Employee-Management-System](https://github.com/Shivanshm29/Employee-Management-System)

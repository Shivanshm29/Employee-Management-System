# ⚛️ EMS Frontend Client

The frontend for the **Employee Management System (EMS)** is built using React 19 and Vite, styled with a modern vanilla CSS design token architecture featuring glassmorphism and light/dark theme support.

---

## 🛠 Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Bundler & Tooling**: [Vite](https://vitejs.dev/)
- **Routing**: [React Router v7](https://reactrouter.com/) (configured with role-based route guards)
- **HTTP Client**: [Axios](https://axios-http.com/) (with automatic JWT refresh request interceptors)
- **Visualizations**: [Recharts](https://recharts.org/) (for productivity & sprint metrics)
- **Notifications**: [React Hot Toast](https://react-hot-toast.com/)

---

## 📁 Directory Structure

```
frontend/
├── public/                 # Static assets & SVG icons
├── src/
│   ├── api/                # Centralized Axios client & API endpoints
│   ├── components/         # Reusable UI widgets (Sidebar, Topbar, Modal)
│   ├── context/            # AuthContext provider & global state
│   ├── layouts/            # DashboardLayout and AuthLayout
│   ├── pages/              # Application views:
│   │   ├── Home/           # Dashboard overview & summary metrics
│   │   ├── Tasks/          # Interactive task board & sprint checklists
│   │   ├── Tickets/        # Support ticket submission & management
│   │   ├── Approvals/      # Manager ticket reviews & task conversions
│   │   ├── Meetings/       # Meeting scheduling & Jitsi video call launcher
│   │   ├── Chat/           # Real-time WebSocket messaging
│   │   ├── Rewards/        # Gamified leaderboard & employee rewards
│   │   ├── Team/           # Managerial team oversight & session history
│   │   ├── WorkLog/        # Employee personal work duration logs
│   │   ├── HR/             # Department & employee role administration
│   │   ├── Notifications/  # Notification feed
│   │   ├── Login/          # User login
│   │   └── Register/       # User registration
│   ├── App.jsx             # Main router configuration & role guards
│   ├── index.css           # Global design system & theme tokens
│   └── main.jsx            # React root mount point
├── package.json
└── vite.config.js
```

---

## ⚙️ Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env`:
   ```bash
   # Windows:
   copy .env.example .env
   # Mac/Linux:
   cp .env.example .env
   ```

3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

4. **Production Build**:
   ```bash
   npm run build
   ```

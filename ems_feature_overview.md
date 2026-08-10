# EMS – Full Feature Reference

> **Stack**: Django REST Framework (backend) · React + Vite (frontend) · PostgreSQL · JWT Auth · WebSocket (socket_server.py)

---

## Architecture Overview

```
frontend/src/         ←  React + Vite SPA (port 5173)
backend/              ←  Django DRF API (port 8000)
backend/socket_server.py  ← Standalone WebSocket server (port 8001)
Database: PostgreSQL (pg2)
```

Authentication flow: JWT tokens (access 8h / refresh 7d). Every request carries a `Bearer` token in the `Authorization` header. The frontend stores tokens in context/localStorage and refreshes them automatically via `api/auth/refresh/`.

---

## 1. Authentication & User Accounts

### Backend App: `apps/accounts`

| File | Role |
|------|------|
| `models.py` | `User`, `Department`, `WorkLog` |
| `views.py` | Register, Login, Logout, Me, UserList, UserDetail, DepartmentList, WorkLogList |
| `serializers.py` | UserSerializer, RegisterSerializer, LoginSerializer, WorkLogSerializer |
| `permissions.py` | `IsManagerOrAbove`, `IsHROrAdmin`, `IsOwnerOrManagerOrAbove`, `IsAdminUser` |
| `urls.py` | Maps all auth endpoints |

### Models

**`User`** (extends `AbstractUser`)
- Fields: `email` (login field), `role` (employee / manager / admin), `department` FK, `phone`, `avatar`, `job_title`, `hourly_rate`, `manager` (self-referential FK → subordinates)
- Auth uses **email** not username

**`Department`**
- Simple name + description. Employees are linked to it.

**`WorkLog`**
- Created on every login, `logout_time` stamped on logout.
- Tracks session duration via `duration_seconds` property.

### API Endpoints (`/api/auth/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| POST | `/register/` | Anyone | Create user account, returns tokens |
| POST | `/login/` | Anyone | Validates credentials, creates WorkLog, returns tokens |
| POST | `/logout/` | Auth | Stamps WorkLog logout_time, blacklists refresh token |
| POST | `/refresh/` | Anyone | Rotates JWT access token |
| GET/PUT | `/me/` | Auth | Get or update own profile |
| GET | `/users/` | Auth | Role-filtered user list |
| GET/PUT | `/users/<id>/` | Auth | User detail (manager/admin can edit others) |
| GET | `/departments/` | Anyone | List departments |
| POST | `/departments/` | Admin | Create department |
| GET | `/work-logs/` | Auth | Own session history |

### Role-Based Visibility (UserListView)
- **Admin** → sees all users
- **Manager** → sees self + direct subordinates
- **Employee** → sees self + their manager + teammates (same manager)

### Frontend Pages
- `pages/Login/Login.jsx` — Email/password form, stores JWT in `AuthContext`
- `pages/WorkLog/WorkLog.jsx` — Employee-only; shows own login/logout session history

---

## 2. Task Management

### Backend App: `apps/tasks`

| File | Role |
|------|------|
| `models.py` | `Sprint`, `Task`, `TaskComment`, `TaskHistory`, `DailyChecklist` |
| `views.py` | SprintViewSet, TaskViewSet, DailyChecklistView, ChecklistCompleteView |
| `signals.py` | Auto-status transitions, cross-app notifications |
| `serializers.py` | Full and nested serializers for all models |
| `urls.py` | Router + checklist URLs |

### Models

**`Sprint`**
- Groups tasks. Has `is_active` flag, `goal`, date range.

**`Task`**
- Status lifecycle: `assigned → in_progress → pending_review → completed`  
- Priority: low / medium / high / critical
- Fields: `title`, `description`, `status`, `priority`, `assignee` (employee FK), `supervisor` (manager FK), `support_members` (M2M), `linked_ticket` (FK to Ticket), `sprint` FK, `estimated_hours`, `actual_hours`, `reward_amount` (₹ monetary), `end_date`, `completed_at`, `completion_comment`

**`TaskComment`** — Comments on tasks, with `is_system_generated` flag

**`TaskHistory`** — Audit trail: every field change is logged with old/new value + who changed it

**`DailyChecklist`** — An employee's daily "to-do" list. Unique per (user, task, date). Tracks `planned_hours`, `is_completed`, `completion_comment`.

### API Endpoints (`/api/tasks/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET/POST | `/` | Auth | List/create tasks |
| GET/PUT/DELETE | `/<id>/` | Auth | Task detail |
| POST | `/<id>/complete/` | Auth | Mark task done |
| POST | `/<id>/reassign/` | Manager | Reassign task back with feedback |
| GET/POST | `/<id>/comments/` | Auth | Task comments |
| GET | `/<id>/history/` | Auth | Change audit log |
| GET/POST | `/sprints/` | Auth | Sprint list/create |
| GET | `/checklist/` | Auth | Today's or any date's checklist |
| POST | `/checklist/` | Auth | Add task to checklist |
| PATCH/DELETE | `/checklist/<id>/` | Auth | Update/remove checklist item |
| POST | `/checklist/<id>/complete/` | Auth | Mark checklist item done |

### Business Logic (Task Completion)
- **Employee completes** → status becomes `pending_review`
- **Manager confirms** → status becomes `completed`, `completed_at` stamped, reward auto-credited if `reward_amount > 0`
- Auto-updates DailyChecklist for today
- Auto-logs to TaskHistory

### Django Signals (`signals.py`)
| Signal | Trigger | Effect |
|--------|---------|--------|
| `sync_task_update_to_ticket` | Task saved (not created) + has linked ticket | Adds auto-comment to linked ticket |
| `notify_on_task_complete` | Task marked completed | Notifies supervisor + support members |
| `transition_task_to_in_progress_on_comment` | Comment added to `assigned` task | Moves task to `in_progress` |
| `transition_task_to_in_progress_on_checklist` | Task added to DailyChecklist | Moves task from `assigned` to `in_progress` |

### Frontend Pages
- `pages/Tasks/Tasks.jsx` — Full task board; managers can create/assign; employees see their tasks
- Supports filtering by status, priority, sprint, assignee

---

## 3. Ticket System

### Backend App: `apps/tickets`

| File | Role |
|------|------|
| `models.py` | `Ticket`, `TicketComment`, `TicketHistory` |
| `views.py` | `TicketViewSet` with approve/reassign actions |

### Models

**`Ticket`**
- Types: bug / feature / support / incident / change / other
- Status lifecycle: `open → pending_approval → approved → resolved → closed`
- Fields: `title`, `description`, `ticket_type`, `status`, `priority`, `assignee`, `created_by`, `approved_by`, `linked_task`, `due_date`

**`TicketComment`** — Comments with `is_system_generated` flag

**`TicketHistory`** — Field-level audit trail

### API Endpoints (`/api/tickets/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET/POST | `/` | Auth | List/create tickets |
| GET/PUT/DELETE | `/<id>/` | Auth | Ticket detail |
| POST | `/<id>/approve/` | Manager | Approve ticket → auto-creates Task for assignee |
| POST | `/<id>/reassign/` | Auth | Reassign ticket + sync linked tasks |
| GET/POST | `/<id>/comments/` | Auth | Ticket comments |
| GET | `/<id>/history/` | Auth | Audit log |

### Key Business Logic
- **On approve**: A `Task` is auto-created with `linked_ticket` set. Employee gets a notification.
- **On reassign**: All linked tasks are also reassigned. Both old and new assignees are notified.
- Managers see ALL tickets; employees see only their own created/assigned ones.

### Frontend Pages
- `pages/Tickets/Tickets.jsx` — Ticket list with filtering
- `pages/Approvals/Approvals.jsx` — Manager-only; pending tickets awaiting review

---

## 4. Meetings

### Backend App: `apps/meetings`

| File | Role |
|------|------|
| `models.py` | `Meeting`, `MeetingParticipant` |
| `views.py` | `MeetingViewSet` |

### Models

**`Meeting`**
- Fields: `title`, `description`, `task` (optional FK), `date`, `start_time`, `end_time`, `location`, `meeting_link` (Jitsi URL), `created_by`
- `duration_hours` property calculates length from start/end time relative to meeting date

**`MeetingParticipant`**
- Links users to meetings with: `rating` (1–5), `is_organizer`, `accepted` (None=pending / True / False)

### API Endpoints (`/api/meetings/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET/POST | `/` | Auth | List/create meetings |
| GET/PUT/DELETE | `/<id>/` | Manager | Meeting detail |
| POST | `/<id>/rate/` | Participant | Rate meeting 1–5 |
| POST/DELETE | `/<id>/participants/<uid>/` | Auth | Add/remove participant |
| GET | `/today/` | Auth | Today's meetings |

### Key Business Logic
- Only managers can create/edit meetings.
- On creation, all participants (except creator) are auto-notified.
- `meeting_link` stores the Jitsi URL for video calls.
- Employees see only meetings they created or are participating in.

### Frontend Pages
- `pages/Meetings/Meetings.jsx` — Calendar/list view; manager UI shows all; employee sees own

---

## 5. Rewards & Recognition

### Backend App: `apps/rewards`

| File | Role |
|------|------|
| `models.py` | `Reward` |
| `views.py` | `RewardListCreateView`, `MyRewardsView`, `LeaderboardView` |

### Models

**`Reward`**
- Types: recognition / appreciation / award / **bonus**
- Fields: `recipient`, `given_by`, `reward_type`, `title`, `message`, `points`, `amount` (₹ monetary)

### API Endpoints (`/api/rewards/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET | `/` | Auth | All rewards |
| POST | `/` | Manager | Manually give a reward |
| GET | `/my/` | Auth | Own rewards + totals (₹ amount, points, count) |
| GET | `/leaderboard/` | Auth | Top 20 employees by total ₹ amount |

### Auto-Reward on Task Completion
When a manager marks a task as `completed` and `task.reward_amount > 0`:
1. A `Reward` record is auto-created (type: `bonus`)
2. A notification is sent to the employee: *"💰 You earned ₹X for completing Task Y"*

### Frontend Pages
- `pages/Rewards/Rewards.jsx` — Leaderboard + own reward history

---

## 6. Notifications

### Backend App: `apps/notifications`

| File | Role |
|------|------|
| `models.py` | `Notification` |
| `views.py` | List, mark-read, mark-all-read |

### Models

**`Notification`**
- Types: task_complete / ticket_approved / ticket_reassigned / meeting_invite / general
- Fields: `user`, `title`, `message`, `notification_type`, `related_id`, `is_read`

### When Notifications Are Created (Auto)
| Event | Recipients |
|-------|-----------|
| Task completed | Supervisor + support members |
| Task reward credited | Task assignee |
| Ticket approved | Ticket assignee |
| Ticket reassigned | Old assignee + new assignee |
| Meeting created | All participants (except creator) |
| Manual reward given | Reward recipient |

### Frontend Pages
- `pages/Notifications/Notifications.jsx` — Bell icon with unread count, mark-as-read

---

## 7. Chat System

### Backend App: `apps/chat`
### Standalone: `backend/socket_server.py` (port 8001)

| File | Role |
|------|------|
| `models.py` | `ChatRoom`, `ChatMessage` |
| `views.py` | `ChatRoomViewSet` |
| `socket_server.py` | Standalone WebSocket server for real-time messaging |

### Models

**`ChatRoom`**
- Types: `team` (manager's team hub), `global` (all users / announcements), `direct` (1-on-1)
- `manager` FK — who owns the team room
- `members` M2M — for direct/group rooms

**`ChatMessage`**
- Fields: `room`, `sender`, `content`, `is_broadcast`, `created_at`

### Room Auto-Creation Logic (in `get_queryset`)
- On any user's first API call: global "General Announcements" room is ensured to exist
- On manager login: their "Team [LastName]'s Hub" room is auto-created
- On employee login: their manager's team room is auto-created (if manager exists)

### API Endpoints (`/api/chat/rooms/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET | `/` | Auth | List accessible rooms |
| GET | `/<id>/messages/` | Auth | Last 50 messages in chronological order |
| POST | `/get-or-create-direct/` | Auth | Start or get a 1-on-1 direct chat |
| POST | `/broadcast/` | Manager | Send broadcast to global or specific room |

### WebSocket Server (`socket_server.py`)
- Clients connect to `ws://localhost:8001`
- First message must be `{ type: "authenticate", token: "<JWT>" }` — decoded with `settings.SECRET_KEY`
- After auth: `{ type: "chat_message", room_id: X, content: "..." }` messages are saved to DB and broadcast to all online clients
- Clients filter received messages by `room_id` on the frontend

### Frontend Pages
- `pages/Chat/Chat.jsx` — Two-pane layout: room list (left) + message thread (right)

---

## 8. Reports & Analytics

### Backend App: `apps/reports`

| File | Role |
|------|------|
| `views.py` | TaskReportView, ProductivityReportView, ReportExportView, DashboardSummaryView |

### API Endpoints (`/api/reports/`)

| Method | URL | Who | What |
|--------|-----|-----|------|
| GET | `/tasks/` | Auth | Task breakdown by status/priority + daily checklist summary |
| GET | `/productivity/` | Auth | Per-employee completion rate, hours, active days, total ₹ earned |
| GET | `/export/?type=tasks&format=csv` | Auth | CSV export of tasks or productivity |
| GET | `/dashboard/` | Auth | Quick stats for the home page |

### Dashboard Summary Response
```json
{
  "tasks": { "total", "completed", "in_progress", "assigned", "pending_review", "overdue" },
  "today": { "checklist_total", "checklist_completed", "planned_hours", "meetings" },
  "notifications": { "unread" }
}
```

### Role-Filtered Analytics
- **Admin** → all data
- **Manager** → own team only
- **Employee** → own tasks only; leaderboard shows anonymized "Employee" for others

### CSV Export
Generates downloadable reports for tasks (with all fields) or productivity (completion rate, hours).

### Frontend Pages
- `pages/Reports/Reports.jsx` — Charts (via Recharts) showing task distribution, team productivity
- `pages/Home/HomeDashboard.jsx` — Dashboard with summary cards + graphs

---

## 9. Team Management

### Frontend Page: `pages/Team/Team.jsx`
- **Manager/Admin only** (role-gated in `App.jsx`)
- Shows all team members under the manager
- Displays real-time work session data (login time, total hours today)
- Allows manager to view individual work logs

---

## 10. HR / Admin

### Frontend Page: `pages/HR/`
- Admin-only tools for managing departments and user accounts

---

## Cross-Cutting Concerns

### Permission Hierarchy
| Permission Class | Who has it |
|------------------|-----------|
| `IsManagerOrAbove` | manager, admin |
| `IsHROrAdmin` | admin only |
| `IsOwnerOrManagerOrAbove` | object owner OR manager/admin |
| `IsAdminUser` | admin only |

### JWT Token Flow
1. `POST /api/auth/login/` → returns `access` + `refresh`
2. Every API call: `Authorization: Bearer <access>`
3. On 401: `POST /api/auth/refresh/` with `refresh` token → new `access`
4. `POST /api/auth/logout/` → stamps WorkLog, blacklists refresh

### Filtering & Search
All major viewsets support:
- `django-filters` for field-level filtering (`?status=completed&priority=high`)
- `SearchFilter` for text search (`?search=bug`)
- `OrderingFilter` for sorting (`?ordering=-created_at`)
- Pagination: 20 items per page

---

## Frontend Structure

```
src/
├── App.jsx              — Routes + RoleRoute guard
├── context/AuthContext  — JWT storage, user state, role checks
├── layouts/
│   ├── AuthLayout       — Login/Register wrapper
│   └── DashboardLayout  — Sidebar + Topbar wrapper
├── components/
│   ├── Sidebar.jsx      — Nav links (role-aware)
│   ├── Topbar.jsx       — User info + notifications bell
│   └── Modal.jsx        — Reusable modal wrapper
├── api/
│   └── client.js        — Axios instance with base URL + token injection
└── pages/
    ├── Home/            — Dashboard with stats + charts
    ├── Tasks/           — Full task management board
    ├── Tickets/         — Ticket list + submit form
    ├── Approvals/       — Manager ticket review (Manager only)
    ├── Meetings/        — Meeting schedule + Jitsi join
    ├── Chat/            — Real-time chat (WebSocket)
    ├── Notifications/   — Notification feed
    ├── Reports/         — Analytics charts (Manager only)
    ├── Rewards/         — Leaderboard + own rewards
    ├── Team/            — Team member view (Manager only)
    ├── WorkLog/         — Session history (Employee only)
    ├── Login/           — Auth page
    └── Register/        — Registration page
```

### Route Access Control

| Route | Access |
|-------|--------|
| `/` | All authenticated users |
| `/tasks` | All |
| `/tickets` | All |
| `/meetings` | All |
| `/chat` | All |
| `/notifications` | All |
| `/team` | Manager, Admin |
| `/reports` | Manager, Admin |
| `/approvals` | Manager, Admin |
| `/work-log` | Employee only |

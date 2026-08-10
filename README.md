# Employee Management System (EMS)

A full-stack Employee Management System built with **Django REST Framework (DRF)** and **React + Vite**. EMS provides role-based employee management, task and sprint tracking, support tickets, meetings, real-time chat, notifications, rewards, and productivity analytics.

The system is designed for three primary roles:

- **Admin** — Full system and HR administration
- **Manager** — Team, task, ticket, meeting, and productivity management
- **Employee** — Tasks, tickets, meetings, chat, rewards, and personal work logs

---

## Features

### Authentication & Role-Based Access Control

- JWT-based authentication
- Email-based login
- Admin, Manager, and Employee roles
- Role-based route protection
- Automatic JWT access-token refresh
- User profile management
- Department management
- Manager/subordinate hierarchy
- Employee work-session logging

### Task & Sprint Management

- Create and assign tasks
- Task status workflow:
  `Assigned → In Progress → Pending Review → Completed`
- Task priorities:
  `Low`, `Medium`, `High`, `Critical`
- Sprint management
- Task comments
- Task history and audit logs
- Daily employee checklists
- Estimated and actual working hours
- Task completion review by managers
- Task reassignment with feedback
- Automatic task-to-ticket synchronization

### Support Ticket Management

- Create and manage support tickets
- Ticket types:
  - Bug
  - Feature
  - Support
  - Incident
  - Change
  - Other
- Ticket priority and status management
- Manager approval workflow
- Automatic task creation after ticket approval
- Ticket reassignment
- Ticket comments
- Ticket history and audit trail
- Automatic synchronization between tickets and linked tasks

### Meeting Management

- Schedule meetings
- Add/remove participants
- Meeting descriptions and locations
- Jitsi meeting links
- Meeting attendance/acceptance tracking
- Meeting ratings
- Today's meeting view
- Automatic participant notifications

### Rewards & Recognition

- Employee recognition system
- Points-based rewards
- Monetary bonuses
- Reward history
- Employee leaderboard
- Automatic bonus creation when eligible tasks are completed
- Reward notifications

### Notifications

Automatic notifications for:

- Task completion
- Ticket approval
- Ticket reassignment
- Meeting invitations
- Rewards and bonuses
- General system events

Includes:

- Unread notification count
- Mark as read
- Mark all as read

### Real-Time Chat

- Team chat rooms
- Global announcement room
- Direct one-to-one messaging
- Real-time WebSocket communication
- JWT authentication for WebSocket connections
- Persistent chat messages
- Manager broadcast messaging

WebSocket server:

```text
ws://localhost:8001

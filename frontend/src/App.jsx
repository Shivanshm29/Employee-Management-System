import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'

import { AuthLayout } from './layouts/AuthLayout'
import { DashboardLayout } from './layouts/DashboardLayout'

import Login from './pages/Login/Login'
import HomeDashboard from './pages/Home/HomeDashboard'
import Tasks from './pages/Tasks/Tasks'
import Tickets from './pages/Tickets/Tickets'
import Meetings from './pages/Meetings/Meetings'
import Reports from './pages/Reports/Reports'
import Notifications from './pages/Notifications/Notifications'
import Approvals from './pages/Approvals/Approvals'
import Chat from './pages/Chat/Chat'
import Team from './pages/Team/Team'
import WorkLog from './pages/WorkLog/WorkLog'
import HR from './pages/HR/HR'
import Rewards from './pages/Rewards/Rewards'

const RoleRoute = ({ roles, children }) => {
  const { user, loading } = useAuth()

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />

  const allowedRoles = Array.isArray(roles) ? roles : [roles]
  return allowedRoles.includes(user.role) ? children : <Navigate to="/" replace />
}

function App() {
  return (
    <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
            fontSize: '0.875rem'
          }
        }}
      />

      <Router>
        <Routes>
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
          </Route>

          <Route element={<DashboardLayout />}>
            <Route path="/" element={<HomeDashboard />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/tickets" element={<Tickets />} />
            <Route path="/meetings" element={<Meetings />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/rewards" element={<Rewards />} />

            <Route
              path="/team"
              element={
                <RoleRoute roles={['manager', 'admin']}>
                  <Team />
                </RoleRoute>
              }
            />

            <Route
              path="/hr"
              element={
                <RoleRoute roles={['manager', 'admin']}>
                  <HR />
                </RoleRoute>
              }
            />

            <Route
              path="/reports"
              element={
                <RoleRoute roles={['admin']}>
                  <Reports />
                </RoleRoute>
              }
            />

            <Route
              path="/approvals"
              element={
                <RoleRoute roles={['manager', 'admin']}>
                  <Approvals />
                </RoleRoute>
              }
            />

            <Route
              path="/work-log"
              element={
                <RoleRoute roles={['employee']}>
                  <WorkLog />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
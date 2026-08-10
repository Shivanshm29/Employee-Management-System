import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

const getTitle = (pathname) => {
  if (pathname === '/') return 'Dashboard'

  if (pathname.startsWith('/team')) return 'Team Management'
  if (pathname.startsWith('/approvals')) return 'Approvals'
  if (pathname.startsWith('/chat')) return 'Chat'
  if (pathname.startsWith('/tasks')) return 'Task Management'
  if (pathname.startsWith('/tickets')) return 'Support Tickets'
  if (pathname.startsWith('/meetings')) return 'Meetings'
  if (pathname.startsWith('/reports')) return 'Reports & Analytics'
  if (pathname.startsWith('/attendance')) return 'Attendance'
  if (pathname.startsWith('/notifications')) return 'Notifications'

  return 'EMS Hub'
}

export function DashboardLayout() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="app-layout" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner"></div>
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <div className={`app-layout role-${user.role || 'employee'}`}>
      <Sidebar />
      <div className="main-content">
        <Topbar title={getTitle(location.pathname)} />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

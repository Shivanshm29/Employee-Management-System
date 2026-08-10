import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

export default function Topbar({ title }) {
  const { unreadCount, logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/login')
      toast.success('Logged out successfully')
    } catch {
      toast.error('Logout failed')
    }
  }

  return (
    <header className="topbar">

      {/* LEFT */}
      <div className="topbar-title">
        {title || 'Dashboard'}
      </div>

      {/* RIGHT */}
      <div className="topbar-actions">

        {/* 🔹 Role Badge */}
        <span className="role-badge">
          {user?.role?.toUpperCase()}
        </span>

        {/* 🔹 Manager Quick Action */}
        {user?.role === 'manager' && (
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/tasks')}
          >
            + Assign Task
          </button>
        )}

        {/* 🔔 Notifications */}
        <button
          className="notification-btn"
          onClick={() => navigate('/notifications')}
          title="Notifications"
        >
          🔔
          {unreadCount > 0 && <span className="notification-dot" />}
        </button>

        {/* 🚪 Logout */}
        <button className="btn btn-outline btn-sm" onClick={handleLogout}>
          Logout
        </button>

      </div>
    </header>
  )
}
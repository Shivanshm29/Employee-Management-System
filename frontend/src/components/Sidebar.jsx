import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const MANAGER_MENU = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/team', label: 'My Team', icon: '👥' },
  { path: '/tasks', label: 'Task Management', icon: '📝' },
  { path: '/approvals', label: 'Approvals', icon: '✅' },
  { path: '/hr', label: 'HR Management', icon: '👔' },
  { path: '/rewards', label: 'Rewards', icon: '🏆' },
  { path: '/meetings', label: 'Meetings', icon: '📅' },
  { path: '/tickets', label: 'Tickets', icon: '🎫' },
  { path: '/chat', label: 'Chat', icon: '💬' },
]

const ADMIN_MENU = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/tasks', label: 'Task Management', icon: '📝' },
  { path: '/approvals', label: 'Approvals', icon: '✅' },
  { path: '/hr', label: 'HR Management', icon: '👔' },
  { path: '/rewards', label: 'Rewards', icon: '🏆' },
  { path: '/meetings', label: 'Meetings', icon: '📅' },
  { path: '/reports', label: 'Reports', icon: '📈' },
  { path: '/tickets', label: 'Tickets', icon: '🎫' },
  { path: '/chat', label: 'Chat', icon: '💬' },
]

const EMPLOYEE_MENU = [
  { path: '/', label: 'Dashboard', icon: '📊' },
  { path: '/tasks', label: 'My Tasks', icon: '📝' },
  { path: '/rewards', label: 'Rewards', icon: '🏆' },
  { path: '/tickets', label: 'Support', icon: '🎫' },
  { path: '/work-log', label: 'Work Log', icon: '⏱️' },
  { path: '/meetings', label: 'Meetings', icon: '📅' },
  { path: '/chat', label: 'Chat', icon: '💬' },
]

export default function Sidebar() {
  const { user } = useAuth()

  let menu = EMPLOYEE_MENU
  if (user?.role === 'admin') menu = ADMIN_MENU
  else if (user?.role === 'manager') menu = MANAGER_MENU

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>{user?.role === 'manager' ? 'EMS Executive' : user?.role === 'admin' ? 'EMS Admin' : 'EMS Hub'}</h1>
        <span>{user?.role === 'manager' ? 'Managerial Suite' : user?.role === 'admin' ? 'System Control' : 'Employee Portal'}</span>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section-label">
          {user?.role === 'manager' ? 'Operations' : user?.role === 'admin' ? 'Administration' : 'General'}
        </div>
        {menu.map(item => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            end={item.path === '/'}
          >
            <span className="nav-icon">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}

      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar" style={{ border: `2px solid var(--role-accent)` }}>
            {user?.first_name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name}</div>
            <div className="sidebar-user-role" style={{ color: 'var(--role-accent)', fontWeight: 600 }}>
              {user?.role}
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}

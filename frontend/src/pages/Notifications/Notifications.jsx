import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { notificationsApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function Notifications() {
  const { setUnreadCount } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await notificationsApi.list()
      const data = res.data.notifications?.results || res.data.notifications || res.data
      setNotifications(data)
      setUnreadCount(res.data.unread_count || 0)
    } finally {
      setLoading(false)
    }
  }, [setUnreadCount])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const markRead = async (id) => {
    try {
      await notificationsApi.markRead(id)
      fetchNotifications()
    } catch {
      // Silently fail
    }
  }

  const markAllRead = async () => {
    try {
      await notificationsApi.markAllRead()
      fetchNotifications()
    } catch {
      // Silently fail
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Notifications</h2>
          <p>Stay updated on tasks, tickets, and meetings.</p>
        </div>
        <button className="btn btn-outline" onClick={markAllRead}>Mark All as Read</button>
      </div>

      <div className="card">
        {notifications.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔕</div>
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        ) : (
          <div style={{ padding: '0 20px' }}>
            {notifications.map(n => (
              <div key={n.id} className="flex justify-between items-start" style={{ padding: '20px 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ opacity: n.is_read ? 0.6 : 1 }}>
                  <div className="font-semibold text-sm mb-1">{n.title}</div>
                  <div className="text-sm">{n.message}</div>
                  <div className="text-xs text-muted mt-2">{format(new Date(n.created_at), 'MMM dd, h:mm a')}</div>
                </div>
                {!n.is_read && (
                  <button className="btn btn-ghost btn-sm text-xs" onClick={() => markRead(n.id)}>Mark Read</button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

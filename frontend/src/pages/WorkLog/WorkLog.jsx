import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { authApi } from '../../api/client'

export default function WorkLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  const [now, setNow] = useState(new Date())

  const fetchLogs = async () => {
    try {
      const { data } = await authApi.workLogs()
      setLogs(data.results || data)
    } catch {
      toast.error('Failed to load work logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const timer = setInterval(() => setNow(new Date()), 60000) // Update every minute
    return () => clearInterval(timer)
  }, [])

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>

  // Group logs by date to calculate total hours per day
  const dailySummary = Array.isArray(logs) ? logs.reduce((acc, log) => {
    const date = log.date
    if (!date) return acc;
    if (!acc[date]) {
        acc[date] = { date, logs: [], totalSeconds: 0 }
    }
    acc[date].logs.push(log)
    
    if (log.login_time) {
        try {
            const start = new Date(log.login_time)
            const end = log.logout_time ? new Date(log.logout_time) : now
            if (!isNaN(start) && !isNaN(end)) {
                acc[date].totalSeconds += Math.max(0, (end - start) / 1000)
            }
        } catch (err) {
            console.error("Error calculating duration", err)
        }
    }
    return acc
  }, {}) : {}

  const sortedDates = Object.keys(dailySummary).sort((a, b) => b.localeCompare(a))

  const formatTotalTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return `${h}h ${m}m`
  }

  const safeFormat = (dateStr, formatStr) => {
    try {
        if (!dateStr) return '—'
        const date = parseISO(dateStr)
        if (isNaN(date)) return '—'
        return format(date, formatStr)
    } catch {
        return '—'
    }
  }

  const getLiveDuration = (log) => {
      if (log.logout_time) return log.duration;
      if (!log.login_time) return '—';
      try {
          const start = new Date(log.login_time);
          if (isNaN(start)) return '—';
          const diff = Math.max(0, (now - start) / 1000);
          return formatTotalTime(diff);
      } catch {
          return '—';
      }
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h2>Work Log ⏱️</h2>
          <p>Track your daily login activity and total hours worked.</p>
        </div>
      </div>

      <div className="grid-1 mb-6">
        <div className="card">
          <div className="card-header">
            <h3>Recent Sessions</h3>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                    <th>Duration</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {!Array.isArray(logs) || logs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-8 text-muted">No activity logs found.</td>
                    </tr>
                  ) : (
                    logs.map(log => (
                      <tr key={log.id}>
                        <td>{safeFormat(log.date, 'MMM dd, yyyy')}</td>
                        <td>{safeFormat(log.login_time, 'hh:mm a')}</td>
                        <td>{log.logout_time ? safeFormat(log.logout_time, 'hh:mm a') : '—'}</td>
                        <td>{getLiveDuration(log)}</td>
                        <td>
                          <span className={`badge ${log.logout_time ? 'badge-gray' : 'badge-green animate-pulse'}`}>
                            {log.logout_time ? 'Completed' : 'Current Session'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="page-header mt-8">
        <div>
          <h2>Daily Totals 📊</h2>
          <p>Aggregate of hours worked per day.</p>
        </div>
      </div>

      <div className="grid-3">
        {sortedDates.length === 0 ? (
            <p className="text-muted">No totals available.</p>
        ) : (
            sortedDates.map(date => (
              <div key={date} className="stat-card" style={{ borderLeft: '4px solid var(--brand-500)' }}>
                <div className="stat-label">{safeFormat(date, 'EEEE, MMM dd')}</div>
                <div className="stat-value">{formatTotalTime(dailySummary[date].totalSeconds)}</div>
                <div className="stat-footer text-xs text-muted">
                    {dailySummary[date].logs.length} session(s)
                </div>
              </div>
            ))
        )}
      </div>
    </div>
  )
}

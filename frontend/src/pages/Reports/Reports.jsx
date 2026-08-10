import { useState, useEffect, useCallback } from 'react'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { reportsApi, authApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

export default function Reports() {
  const { user } = useAuth()
  const [tasksReport, setTasksReport] = useState(null)
  const [prodReport, setProdReport] = useState(null)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [filters, setFilters] = useState({
    start_date: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    user_id: ''
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [tRes, pRes] = await Promise.all([
        reportsApi.tasks(filters),
        reportsApi.productivity(filters)
      ])
      setTasksReport(tRes.data)
      setProdReport(pRes.data)
    } catch {
      toast.error('Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await authApi.users()
      setUsers(res.data.results || res.data)
    } catch {
      // Silently fail for users load
    }
  }, [])

  useEffect(() => {
    fetchData()
    if (user?.role !== 'employee') fetchUsers()
  }, [fetchData, fetchUsers, user?.role])

  const handleExport = async (type) => {
    try {
      const res = await reportsApi.export({ ...filters, type })
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `ems_${type}_report_${filters.start_date}.csv`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      toast.success('Download started')
    } catch {
      toast.error('Export failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Reports & Analytics</h2>
          <p>Analyze team productivity, task completion, and hours worked.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => handleExport('tasks')}>📥 Export Tasks</button>
          <button className="btn btn-secondary" onClick={() => handleExport('productivity')}>📥 Export Productivity</button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body filter-row">
          <div className="form-group mb-0 flex items-center gap-2">
             <label className="mb-0 font-semibold text-sm">Date Range:</label>
             <input type="date" className="form-control" style={{width:140}} 
               value={filters.start_date} onChange={e => setFilters({...filters, start_date: e.target.value})} />
             <span className="text-muted">-</span>
             <input type="date" className="form-control" style={{width:140}} 
               value={filters.end_date} onChange={e => setFilters({...filters, end_date: e.target.value})} />
          </div>
          {user?.role !== 'employee' && (
            <div className="form-group mb-0 flex items-center gap-2 ml-4">
              <label className="mb-0 font-semibold text-sm">Employee:</label>
              <select className="form-control" style={{width:180}} 
                value={filters.user_id} onChange={e => setFilters({...filters, user_id: e.target.value})}>
                <option value="">All Team</option>
                {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
              </select>
             </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"></div></div>
      ) : (
        <>
          <div className="grid-3 mb-4">
            <div className="stat-card bg-brand-50">
              <div className="stat-label">Total Selected Tasks</div>
              <div className="stat-value text-brand-600">{tasksReport?.summary?.total_tasks || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Completed Tasks</div>
              <div className="stat-value">{tasksReport?.summary?.completed || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Logged Hours</div>
              <div className="stat-value">{tasksReport?.summary?.total_actual || 0}h</div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-header">
              <h3>Checklist Completion Trend</h3>
            </div>
            <div className="card-body" style={{ height: 320 }}>
              {tasksReport?.daily_checklist?.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tasksReport.daily_checklist} margin={{top:10, right:10, left:0, bottom:10}}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="date" tickFormatter={str => format(new Date(str), 'MMM dd')} stroke="#9ca3af" fontSize={12} />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      cursor={{fill: '#f3f4f6'}}
                      contentStyle={{borderRadius:'8px', border:'1px solid #e2e8f5', boxShadow:'0 4px 12px rgba(0,0,0,0.08)'}}
                    />
                    <Bar name="Completed Items" dataKey="completed" fill="#3b82f6" radius={[4,4,0,0]} />
                    <Bar name="Total Items" dataKey="total" fill="#e5e7eb" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state pt-10"><p>No activity data for this period.</p></div>
              )}
            </div>
          </div>

          <div className="card table-wrapper">
             <div className="card-header border-bottom-0 pb-0">
               <h3>Productivity Summary</h3>
             </div>
             <div className="card-body mt-0">
               <table>
                 <thead>
                   <tr>
                     <th>Employee Details</th>
                     <th>Tasks (Done/Total)</th>
                     <th>Completion Rate</th>
                     <th>Actual Hours</th>
                     <th>Active Days</th>
                   </tr>
                 </thead>
                 <tbody>
                   {prodReport?.employees?.map(emp => (
                     <tr key={emp.user_id}>
                       <td>
                         <div className="font-semibold">{emp.name}</div>
                         <div className="text-xs text-muted mt-1">{emp.role.toUpperCase()} • {emp.department || 'No Dept'}</div>
                       </td>
                       <td>{emp.completed_tasks} / {emp.total_tasks}</td>
                       <td>
                         <div className="flex items-center gap-2">
                           <div className="progress-bar" style={{width: 80}}>
                             <div className="progress-fill" style={{width: `${emp.completion_rate}%`, background: emp.completion_rate > 70 ? 'var(--success-500)' : 'var(--warning-500)'}}></div>
                           </div>
                           <span className="text-sm font-semibold">{emp.completion_rate}%</span>
                         </div>
                       </td>
                       <td>{emp.actual_hours}h</td>
                       <td>{emp.active_days} days</td>
                     </tr>
                   ))}
                   {prodReport?.employees?.length === 0 && (
                     <tr><td colSpan="5" className="text-center p-4 text-muted">No data available.</td></tr>
                   )}
                 </tbody>
               </table>
             </div>
          </div>
        </>
      )}
    </div>
  )
}

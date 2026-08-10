import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import toast from 'react-hot-toast'

import { reportsApi, tasksApi, rewardsApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#6b7280']

export default function HomeDashboard() {
  const { user } = useAuth()
  const [summary, setSummary] = useState(null)
  const [checklist, setChecklist] = useState({ entries: [], total_planned_hours: 0, remaining_hours: 8 })
  const [leaderboard, setLeaderboard] = useState([])
  const [myRewards, setMyRewards] = useState({ total_amount: 0, count: 0, rewards: [] })
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [completionComment, setCompletionComment] = useState('')

  const fetchData = async () => {
    try {
      const [summRes, checkRes, prodRes, rewardRes] = await Promise.all([
        reportsApi.dashboard(),
        tasksApi.checklist(),
        reportsApi.productivity(),
        rewardsApi.myRewards(),
      ])
      setSummary(summRes.data)
      setChecklist(checkRes.data)
      setLeaderboard(prodRes.data.employees?.sort((a,b) => b.completion_rate - a.completion_rate) || [])
      setMyRewards(rewardRes.data)
    } catch {
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const openCompletionModal = (item) => {
    if (item.is_completed) return
    setSelectedTask(item)
    setCompletionComment('')
    setIsModalOpen(true)
  }

  const handleCompleteChecklist = async () => {
    if (!completionComment.trim()) {
      toast.error('Please provide a completion comment.')
      return
    }
    try {
      await tasksApi.completeChecklist(selectedTask.id, { comment: completionComment })
      toast.success('Task marked as completed!')
      setIsModalOpen(false)
      fetchData() // refresh stats & list
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to complete task.')
    }
  }

  if (loading) return <div className="loading-center"><div className="spinner"></div></div>

  const isManager = user?.role === 'manager' || user?.role === 'admin'

  return (
    <div className="fade-in">
      {isManager ? (
        <ManagerOverview 
          summary={summary} 
          leaderboard={leaderboard} 
          user={user}
        />
      ) : (
      <EmployeeWorkspace 
          user={user} 
          summary={summary} 
          checklist={checklist} 
          openCompletionModal={openCompletionModal}
          leaderboard={leaderboard}
          myRewards={myRewards}
        />
      )}

      {/* Completion Modal (Shared) */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Complete Task">
        <div className="modal-body">
          <p className="mb-4">
            {user.role === 'employee' 
              ? `Submit ${selectedTask?.task_detail?.title} for manager review?` 
              : `Mark ${selectedTask?.task_detail?.title} as completed?`}
          </p>
          <div className="form-group">
            <label className="form-label">Completion Update / Comment <span className="required">*</span></label>
            <textarea 
              className="form-control"
              placeholder="What did you accomplish?"
              value={completionComment}
              onChange={(e) => setCompletionComment(e.target.value)}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button 
            className={`btn ${user.role === 'employee' ? 'btn-primary' : 'btn-success'}`} 
            onClick={handleCompleteChecklist}
          >
            {user.role === 'employee' ? 'Submit for Review' : 'Confirm Completion'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

/* ============================================================
   👨‍💼 MANAGER OVERVIEW COMPONENT
   ============================================================ */
function ManagerOverview({ summary, leaderboard, user }) {
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Executive Overview 🏛️</h2>
          <p>Strategic summary and department performance metrics.</p>
        </div>
        <div className="flex gap-2">
          {user?.role === 'admin' && <Link to="/reports" className="btn btn-primary">Detailed Reports</Link>}
          <Link to="/approvals" className="btn btn-outline">
            Review Queue <span className="nav-badge ml-2">{summary?.tasks?.pending_review || 0}</span>
          </Link>
        </div>
      </div>

      <div className="grid-4 mb-6">
        <div className="stat-card" style={{ borderLeft: '4px solid var(--brand-500)' }}>
          <div className="stat-icon">📈</div>
          <div className="stat-value">{summary?.tasks?.total || 0}</div>
          <div className="stat-label">Total Dept Tasks</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--warning-500)' }}>
          <div className="stat-icon">⏳</div>
          <div className="stat-value">{summary?.tasks?.in_progress || 0}</div>
          <div className="stat-label">In Active Progress</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--danger-500)' }}>
          <div className="stat-icon">🔔</div>
          <div className="stat-value">{summary?.tasks?.pending_review || 0}</div>
          <div className="stat-label">Awaiting Your Approval</div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid var(--success-500)' }}>
          <div className="stat-icon">✅</div>
          <div className="stat-value">{summary?.tasks?.completed || 0}</div>
          <div className="stat-label">Total Completed</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header">
            <h3>Team Performance Index</h3>
          </div>
          <div className="card-body" style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leaderboard.slice(0, 5)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} />
                <YAxis unit="%" />
                <RechartsTooltip />
                <Bar dataKey="completion_rate" fill="var(--brand-600)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex-col gap-4">
           <div className="card">
             <div className="card-header">
               <h3>Administrative Quick Actions</h3>
             </div>
             <div className="card-body grid-2">
               <Link to="/team" className="btn btn-secondary">Manage Team</Link>
               <Link to="/meetings" className="btn btn-secondary">Schedule Briefing</Link>
               <Link to="/tasks" className="btn btn-secondary">Assign New Task</Link>
               <Link to="/tickets" className="btn btn-secondary">View System Tickets</Link>
             </div>
           </div>

           <div className="card">
             <div className="card-header">
               <h3>Active Submissions</h3>
             </div>
             <div className="card-body">
               {summary?.tasks?.pending_review > 0 ? (
                 <div className="alert alert-info">
                   <span className="alert-icon">💡</span>
                   <div>There are {summary.tasks.pending_review} tasks waiting for your review.</div>
                   <Link to="/approvals" className="ml-auto font-bold underline">Go to Approvals</Link>
                 </div>
               ) : (
                 <p className="text-muted text-center py-4">No tasks currently awaiting review.</p>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}

/* ============================================================
   👷 EMPLOYEE WORKSPACE COMPONENT
   ============================================================ */
function EmployeeWorkspace({ user, summary, checklist, openCompletionModal, leaderboard, myRewards }) {
  const completedHours = checklist?.entries
    ?.filter(item => item.is_completed)
    .reduce((sum, item) => sum + (Number(item.planned_hours) || 0), 0) || 0;

  const pieData = [
    { name: 'Completed', value: summary?.tasks?.completed || 0 },
    { name: 'In Progress', value: summary?.tasks?.in_progress || 0 },
    { name: 'To Do', value: summary?.tasks?.assigned || 0 },
    { name: 'Pending Review', value: summary?.tasks?.pending_review || 0 },
  ].filter(d => d.value > 0)

  const me = leaderboard.find(emp => String(emp.user_id) === String(user.id) || emp.name !== 'Employee');
  let displayList = leaderboard.slice(0, 3);
  if (me && !displayList.find(emp => String(emp.user_id) === String(me.user_id))) {
      displayList = [...leaderboard.slice(0, 2), me];
  }

  let peerCount = 1;
  const anonymizedLeaderboard = displayList.map(emp => {
      let name = emp.name;
      if (String(emp.user_id) === String(user.id) || emp.name !== 'Employee') {
          name = 'Me';
      } else {
          name = `Peer ${peerCount++}`;
      }
      return { ...emp, name };
  });

  const totalRewards = myRewards?.total_amount || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>My Workspace 👋</h2>
          <p>Welcome back, {user?.first_name}. Let's get things done!</p>
        </div>
        <div className="flex gap-3 items-center">
          {totalRewards > 0 && (
            <div style={{
              background: 'linear-gradient(135deg, #052e16, #14532d)',
              color: 'white',
              borderRadius: '12px',
              padding: '8px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 15px rgba(21,128,61,0.3)',
            }}>
              <span style={{ fontSize: '1.2rem' }}>💰</span>
              <div>
                <div style={{ fontSize: '0.65rem', opacity: 0.8, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Total Earned</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>₹{totalRewards.toLocaleString('en-IN')}</div>
              </div>
            </div>
          )}
          <Link to="/tasks" className="btn btn-primary">View Tasks</Link>
        </div>
      </div>

      <div className="grid-2">
        {/* Left: Checklist */}
        <div className="card">
          <div className="card-header">
            <h3>My Daily Checklist — {format(new Date(), 'MMM dd')}</h3>
          </div>
          <div className="card-body">
             <div className="flex justify-between items-end mb-1">
               <span className="text-sm font-semibold text-gray-700">Today's Progress</span>
               <span className="text-sm font-bold text-brand-600">
                 {completedHours}h / 7h
               </span>
             </div>
             <div className="hours-bar-container mb-4">
              <div 
                className={`hours-bar-fill ${completedHours >= 7 ? 'at-limit' : ''}`}
                style={{ width: `${Math.min((completedHours / 7) * 100, 100)}%` }}
              ></div>
            </div>
            
            {checklist.entries.length === 0 ? (
              <div className="empty-state">
                <h3>Empty list today</h3>
                <p>Add some tasks to start tracking your progress.</p>
              </div>
            ) : (
              <div className="checklist-container">
                {checklist.entries.map(item => (
                  <div key={item.id} className={`checklist-item ${item.is_completed ? 'completed' : ''}`} onClick={() => openCompletionModal(item)}>
                    <div className={`checklist-radio ${item.is_completed ? 'completed' : ''}`} />
                    <div className="checklist-info">
                      <div className="checklist-title">{item.task_detail.title}</div>
                      <div className="checklist-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span>⏱️ {item.planned_hours}h</span>
                        {item.task_detail.reward_amount > 0 && (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 2,
                            padding: '2px 8px',
                            background: item.is_completed ? 'rgba(255,255,255,0.25)' : '#dcfce7',
                            border: '1px solid ' + (item.is_completed ? 'rgba(255,255,255,0.4)' : '#86efac'),
                            borderRadius: 'var(--radius-full)',
                            fontSize: '0.7rem', fontWeight: 800,
                            color: item.is_completed ? '#fff' : '#166534',
                            boxShadow: item.is_completed ? 'none' : '0 1px 2px rgba(22,163,74,0.1)',
                          }}>
                            💰 ₹{Number(item.task_detail.reward_amount).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Personal Stats */}
        <div className="flex-col gap-4">
          <div className="card">
             <div className="card-header">
               <h3>Task Breakdown</h3>
             </div>
             <div className="card-body" style={{ height: '250px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="card">
             <div className="card-header">
               <h3>Peer Performance</h3>
             </div>
             <div className="card-body" style={{ height: '260px' }}>
               {anonymizedLeaderboard.length === 0 ? (
                 <div className="flex-center h-full text-muted text-sm">No peer data yet.</div>
               ) : (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart
                   data={anonymizedLeaderboard}
                   margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                 >
                   <CartesianGrid strokeDasharray="3 3" vertical={false} />
                   <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                   <YAxis yAxisId="left" unit="%" domain={[0, 100]} tick={{ fontSize: 10 }} width={38} />
                   <YAxis yAxisId="right" orientation="right" tickFormatter={v => `₹${v}`} tick={{ fontSize: 10 }} width={50} />
                   <RechartsTooltip
                     formatter={(value, name) =>
                       name === 'completion_rate'
                         ? [`${value}%`, 'Task Rate']
                         : [`₹${Number(value).toLocaleString('en-IN')}`, 'Rewards']
                     }
                   />
                   <Legend formatter={name => name === 'completion_rate' ? 'Task Rate %' : 'Rewards ₹'} />
                   <Bar yAxisId="left" dataKey="completion_rate" fill="var(--brand-500)" radius={[4, 4, 0, 0]} barSize={18} name="completion_rate" />
                   <Bar yAxisId="right" dataKey="total_reward_amount" fill="#10b981" radius={[4, 4, 0, 0]} barSize={18} name="total_reward_amount" />
                 </BarChart>
               </ResponsiveContainer>
               )}
             </div>
          </div>
          
          <div className="grid-2">
             <Link to="/tickets" className="btn btn-secondary btn-sm" style={{justifyContent: 'center'}}>Support</Link>
             <Link to="/chat" className="btn btn-secondary btn-sm" style={{justifyContent: 'center'}}>Chat</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

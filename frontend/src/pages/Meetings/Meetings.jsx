import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { meetingsApi, tasksApi, authApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

export default function Meetings() {
  const { user } = useAuth()
  const [meetings, setMeetings] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchData = async () => {
    setLoading(true)
    try {
      const [mRes, tRes, uRes] = await Promise.all([
        meetingsApi.list(), tasksApi.list(), authApi.users()
      ])
      setMeetings(mRes.data.results || mRes.data)
      setTasks(tRes.data.results || tRes.data)
      setUsers(uRes.data.results || uRes.data)
    } catch {
      toast.error('Failed to load meetings')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 10000) // Update every 10s for responsiveness
    return () => clearInterval(timer)
  }, [])
  
  const [formData, setFormData] = useState({
    title: '', date: '', start_time: '', end_time: '', 
    description: '', task: '', participant_ids: []
  })

  useEffect(() => {
    fetchData()
  }, [])

  const handleOpenModal = () => {
    setFormData({
      title: '', date: format(new Date(), 'yyyy-MM-dd'), 
      start_time: '10:00', end_time: '11:00', 
      description: '', task: '', participant_ids: []
    })
    setIsModalOpen(true)
  }

  const handleTaskSelect = (taskId) => {
    const task = tasks.find(t => t.id === parseInt(taskId))
    if (!task) {
      setFormData({...formData, task: '', participant_ids: []})
      return
    }
    
    // Auto-populate participants from task
    const pIds = new Set()
    if (task.assignee) pIds.add(task.assignee)
    if (task.supervisor) pIds.add(task.supervisor)
    task.support_members?.forEach(id => pIds.add(id))
    
    setFormData({...formData, task: taskId, participant_ids: Array.from(pIds)})
  }

  const toggleParticipant = (userId) => {
    const ids = new Set(formData.participant_ids)
    if (ids.has(userId)) ids.delete(userId)
    else ids.add(userId)
    setFormData({...formData, participant_ids: Array.from(ids)})
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await meetingsApi.create(formData)
      toast.success('Meeting scheduled successfully')
      setIsModalOpen(false)
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to schedule meeting')
    }
  }

  const handleRate = async (meetingId, rating) => {
    try {
      await meetingsApi.rate(meetingId, { rating })
      toast.success('Rating submitted')
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit rating')
    }
  }

  const getMeetingStatus = (m) => {
    const start = new Date(`${m.date}T${m.start_time}`)
    const end = new Date(`${m.date}T${m.end_time}`)
    const joinWindowStart = new Date(start.getTime() - 5 * 60 * 1000)
    
    if (now < joinWindowStart) return 'upcoming'
    if (now > end) return 'expired'
    return 'active'
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Meetings</h2>
          <p>Schedule and manage team syncs linked to tasks.</p>
        </div>
        {user?.role !== 'employee' && (
          <button className="btn btn-primary" onClick={handleOpenModal}>+ Schedule Meeting</button>
        )}
      </div>

      <div className="grid-3 mb-4">
        {loading ? (
          <div className="loading-center" style={{ gridColumn: '1 / -1' }}><div className="spinner"></div></div>
        ) : meetings.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
            <div className="empty-icon">📅</div>
            <h3>No meetings scheduled</h3>
            <p>Your calendar is clear.</p>
          </div>
        ) : (
          meetings.map(m => {
            const myParticipant = m.participants.find(p => p.user === user?.id)
            return (
              <div key={m.id} className="card flex-col">
                <div className="card-header flex items-center justify-between">
                  <h3 className="truncate" title={m.title}>{m.title}</h3>
                  <span className="badge badge-blue">{m.duration_hours}h</span>
                </div>
                <div className="card-body">
                  <div className="text-sm font-semibold mb-2">🗓️ {format(new Date(m.date), 'MMM dd, yyyy')}</div>
                  <div className="text-xs text-muted mb-4">
                    ⏰ {format(new Date(`${m.date}T${m.start_time}`), 'hh:mm a')} - {format(new Date(`${m.date}T${m.end_time}`), 'hh:mm a')}
                  </div>
                  
                  {m.task_title && (
                    <div className="text-xs mb-4 p-2 bg-gray-50 rounded border border-gray-100">
                      <strong>Task:</strong> {m.task_title}
                    </div>
                  )}

                  <div className="mt-auto">
                    <div className="text-xs text-muted mb-1">Participants ({m.participants.length})</div>
                    <div className="flex gap-1 flex-wrap mb-4">
                      {m.participants.map(p => (
                        <div key={p.id} className="sidebar-avatar" style={{width: 28, height: 28, fontSize: '0.65rem'}} title={p.user_detail?.full_name}>
                          {p.user_detail?.full_name?.charAt(0) || '?'}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-2 border-top pt-3 mt-3">
                      {m.meeting_link && (() => {
                        const status = getMeetingStatus(m)
                        const isActive = status === 'active'
                        return (
                          <a 
                            href={isActive ? m.meeting_link : '#'} 
                            target={isActive ? "_blank" : "_self"}
                            rel="noopener noreferrer" 
                            className={`btn btn-sm flex items-center justify-center gap-2 ${isActive ? 'btn-primary' : 'btn-secondary'}`}
                            style={{ 
                              opacity: isActive ? 1 : 0.6,
                              cursor: isActive ? 'pointer' : 'not-allowed',
                              pointerEvents: isActive ? 'auto' : 'none'
                            }}
                            onClick={(e) => !isActive && e.preventDefault()}
                          >
                            <span>📹</span> {isActive ? 'Join Meeting' : 'Not yet joinable'}
                          </a>
                        )
                      })()}
                      <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold">Meeting Rating:</div>
                        {myParticipant ? (
                          <div className="rating-stars">
                            {[1,2,3,4,5].map(star => (
                              <span 
                                key={star} 
                                className={`star ${star <= (myParticipant.rating || 0) ? 'filled' : 'empty'}`}
                                onClick={() => handleRate(m.id, star)}
                              >★</span>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs flex items-center gap-1">
                            <span className="star filled">★</span> {m.average_rating || 'N/A'} avg
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Schedule Meeting" size="lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Meeting Title <span className="required">*</span></label>
              <input type="text" className="form-control" required 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="form-row mb-4">
              <div className="form-group">
                <label className="form-label">Date <span className="required">*</span></label>
                <input type="date" className="form-control" required
                  value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="form-label">Time <span className="required">*</span></label>
                <div className="flex gap-2">
                  <input type="time" className="form-control" required title="Start Time"
                    value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  <span className="text-muted flex items-center">-</span>
                  <input type="time" className="form-control" required title="End Time"
                    value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Link to Task</label>
              <select className="form-control" value={formData.task} onChange={e => handleTaskSelect(e.target.value)}>
                <option value="">None</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
              <p className="form-hint">Selecting a task will automatically add its members to the invite list.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Participants</label>
              <div className="border border-gray-200 rounded p-3 bg-gray-50 max-h-48 overflow-y-auto grid-2">
                {users.filter(u => u.id !== user.id).map(u => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer text-sm mb-1">
                    <input 
                      type="checkbox" 
                      checked={formData.participant_ids.includes(u.id)}
                      onChange={() => toggleParticipant(u.id)}
                    />
                    {u.full_name} ({u.role})
                  </label>
                ))}
              </div>
            </div>
            
            <div className="form-group mb-0">
              <label className="form-label">Description / Agenda</label>
              <textarea className="form-control" style={{minHeight:'60px'}}
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Schedule Meeting</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

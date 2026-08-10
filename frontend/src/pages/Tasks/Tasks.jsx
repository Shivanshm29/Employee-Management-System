import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { tasksApi, authApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

export default function Tasks() {
  const { user } = useAuth()
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [sprints, setSprints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', search: '', sprint: '' })

  // Sprint management state
  const [isSprintPanelOpen, setIsSprintPanelOpen] = useState(false)
  const [sprintForm, setSprintForm] = useState({ name: '', start_date: '', end_date: '', goal: '', is_active: false })
  const [editingSprint, setEditingSprint] = useState(null)

  // Modal 
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)

  // History Modal
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [taskHistory, setTaskHistory] = useState([])

  // Form State
  const [formData, setFormData] = useState({
    title: '', description: '', status: 'assigned', priority: 'medium',
    assignee: '', supervisor: user?.id || '',
    estimated_hours: 0, end_date: '', reward_amount: 0,
  })
  const [workDescription, setWorkDescription] = useState('')
  const [comments, setComments] = useState([])
  const [commentText, setCommentText] = useState('')

  const fetchSprints = useCallback(async () => {
    try {
      const res = await tasksApi.sprints()
      setSprints(res.data.results || res.data)
    } catch {
      // non-critical
    }
  }, [])

  const handleSprintSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingSprint) {
        await tasksApi.updateSprint(editingSprint.id, sprintForm)
        toast.success('Sprint updated')
      } else {
        await tasksApi.createSprint(sprintForm)
        toast.success('Sprint created')
      }
      setSprintForm({ name: '', start_date: '', end_date: '', goal: '', is_active: false })
      setEditingSprint(null)
      fetchSprints()
      fetchTasks()
    } catch (err) {
      const msg = err.response?.data
      toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg) || 'Failed to save sprint')
    }
  }

  const handleToggleActive = async (sprint) => {
    try {
      await tasksApi.updateSprint(sprint.id, { is_active: !sprint.is_active })
      toast.success(sprint.is_active ? 'Sprint deactivated' : 'Sprint activated')
      fetchSprints()
    } catch {
      toast.error('Failed to update sprint')
    }
  }

  const handleEditSprint = (sprint) => {
    setEditingSprint(sprint)
    setSprintForm({
      name: sprint.name,
      start_date: sprint.start_date,
      end_date: sprint.end_date,
      goal: sprint.goal || '',
      is_active: sprint.is_active,
    })
  }

  const fetchTasks = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.search) params.search = filters.search
      if (filters.sprint) params.sprint = filters.sprint
      const res = await tasksApi.list(params)
      setTasks(res.data.results || res.data) // handle pagination diffs
    } catch {
      toast.error('Failed to fetch tasks')
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
    fetchTasks()
    fetchUsers()
    fetchSprints()
  }, [fetchTasks, fetchUsers, fetchSprints])

  const handleOpenModal = async (task = null) => {
    setSelectedTask(task)
    setComments([])
    setCommentText('')

    if (task) {
      setFormData({
        title: task.title, description: task.description,
        status: task.status, priority: task.priority,
        assignee: task.assignee || '', supervisor: task.supervisor || '',
        estimated_hours: task.estimated_hours, end_date: task.end_date || '',
        reward_amount: task.reward_amount || 0,
        sprint: task.sprint || '',
      })
      setWorkDescription(task.completion_comment || '')
      try {
        const res = await tasksApi.comments(task.id)
        setComments(res.data)
      } catch { 
        // Silently fail for comments load
      }
    } else {
      const activeSprint = sprints.find(s => s.is_active)
      setFormData({
        title: '', description: '', status: 'assigned', priority: 'medium',
        assignee: '', supervisor: user?.id || '',
        estimated_hours: 0, end_date: '', reward_amount: 0,
        sprint: activeSprint?.id || '',
      })
    }
    setIsModalOpen(true)
  }

  const handleAddComment = async () => {
    if (!commentText.trim()) return
    try {
      await tasksApi.addComment(selectedTask.id, { content: commentText })
      setCommentText('')
      const res = await tasksApi.comments(selectedTask.id)
      setComments(res.data)
      toast.success('Comment added')
    } catch {
      toast.error('Failed to add comment')
    }
  }

  const handleManagerReview = async (action) => {
    if (action === 'reassign' && !commentText.trim()) {
      toast.error('Please provide feedback comment for reassignment.')
      return
    }
    try {
      if (action === 'confirm') {
        await tasksApi.complete(selectedTask.id, { comment: commentText || 'Manager Confirmed' })
        toast.success('Task confirmed as completed')
      } else {
        await tasksApi.reassign(selectedTask.id, { comment: commentText })
        toast.success('Task reassigned to employee')
      }
      setIsModalOpen(false)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Review action failed')
    }
  }

  const handleEmployeeSubmit = async () => {
    if (!workDescription.trim()) {
      toast.error('Please describe your work before submitting.')
      return
    }
    try {
      await tasksApi.complete(selectedTask.id, { comment: workDescription })
      toast.success('Task submitted for manager review')
      setIsModalOpen(false)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Submission failed')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (selectedTask) {
        await tasksApi.update(selectedTask.id, formData)
        toast.success('Task updated')
      } else {
        await tasksApi.create(formData)
        toast.success('Task created')
      }
      setIsModalOpen(false)
      fetchTasks()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving task')
    }
  }

  const addToChecklist = async (task) => {
    try {
      await tasksApi.addToChecklist({
        task: task.id,
        date: format(new Date(), 'yyyy-MM-dd'),
        planned_hours: task.estimated_hours || 2
      })
      toast.success('Task added to your daily checklist')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to add to checklist')
    }
  }

  const viewHistory = async (task) => {
    try {
      const res = await tasksApi.history(task.id)
      setTaskHistory(res.data)
      setIsHistoryOpen(true)
    } catch {
      toast.error('Failed to load history')
    }
  }

  const activeSprint = sprints.find(s => s.is_active)

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Task Management</h2>
          <p>Manage, assign, and track tasks
            {activeSprint && (
              <span style={{
                marginLeft: 10, padding: '2px 10px',
                background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                color: '#fff', borderRadius: 'var(--radius-full)',
                fontSize: '0.72rem', fontWeight: 700, verticalAlign: 'middle',
              }}>⚡ {activeSprint.name} active</span>
            )}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {user?.role !== 'employee' && (
            <button className="btn btn-outline btn-sm" onClick={() => setIsSprintPanelOpen(true)}>🏃 Sprints</button>
          )}
          {user?.role !== 'employee' && (
            <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ New Task</button>
          )}
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="filter-row">
            <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
              <span className="search-icon">🔍</span>
              <input
                type="text"
                className="form-control"
                placeholder="Search tasks..."
                value={filters.search}
                onChange={e => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <select
              className="form-control"
              style={{ width: '160px' }}
              value={filters.sprint}
              onChange={e => setFilters({ ...filters, sprint: e.target.value })}
            >
              <option value="">All Sprints</option>
              {sprints.map(s => (
                <option key={s.id} value={s.id}>{s.name}{s.is_active ? ' ⚡' : ''}</option>
              ))}
            </select>
            <select
              className="form-control"
              style={{ width: '150px' }}
              value={filters.status}
              onChange={e => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="pending_review">Pending Review</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <select
              className="form-control"
              style={{ width: '150px' }}
              value={filters.priority}
              onChange={e => setFilters({ ...filters, priority: e.target.value })}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card table-wrapper">
        {loading ? (
          <div className="loading-center"><div className="spinner"></div></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📂</div>
            <h3>No tasks found</h3>
            <p>Try adjusting your filters or create a new task.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title & Info</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>End Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{t.title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                      {t.sprint_name && (
                        <span style={{
                          padding: '1px 8px', borderRadius: 'var(--radius-full)',
                          background: '#ede9fe', color: '#5b21b6',
                          fontSize: '0.68rem', fontWeight: 700,
                        }}>⚡ {t.sprint_name}</span>
                      )}
                      {t.linked_ticket && (
                        <span style={{
                          padding: '1px 8px', borderRadius: 'var(--radius-full)',
                          background: '#dbeafe', color: '#1e40af',
                          fontSize: '0.68rem', fontWeight: 600,
                        }}>🎫 {t.linked_ticket_title}</span>
                      )}
                      {t.reward_amount > 0 && (
                        <span style={{
                          padding: '1px 8px', borderRadius: 'var(--radius-full)',
                          background: '#f0fdf4', border: '1px solid #bbf7d0',
                          fontSize: '0.68rem', fontWeight: 700, color: '#15803d',
                        }}>💰 ₹{Number(t.reward_amount).toLocaleString('en-IN')}</span>
                      )}
                    </div>
                  </td>
                  <td><span className={`badge priority-${t.priority}`}>{t.priority}</span></td>
                  <td><span className={`badge status-${t.status}`}>{t.status.replace('_', ' ')}</span></td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="sidebar-avatar" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
                        {t.assignee_detail?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm">{t.assignee_detail?.full_name || 'Unassigned'}</span>
                    </div>
                  </td>
                  <td className="text-sm">{t.end_date ? format(new Date(t.end_date), 'MMM dd, yyyy') : 'No date'}</td>
                  <td>
                    <div className="flex gap-2">
                      <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal(t)}>Details</button>
                      {user?.role === 'employee' && t.assignee === user?.id && ['assigned', 'in_progress'].includes(t.status) && (
                        <button className="btn btn-outline btn-sm" onClick={() => addToChecklist(t)}>Add to Today</button>
                      )}
                      <button className="btn btn-ghost btn-sm" onClick={() => viewHistory(t)}>History</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTask ? 'Task Management' : 'Create Task'} size="xl">
        <form onSubmit={handleSubmit}>
          <div className="modal-grid">
            {/* Left Column: Details */}
            <div className={`modal-col-left ${user?.role === 'employee' ? 'readonly' : ''}`}>
              <h4 className="section-title">General Information</h4>

              <div className="form-group">
                <label className="form-label">Task Title</label>
                <input type="text" className="form-control" readOnly={user?.role === 'employee'} required
                  value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea className="form-control" readOnly={user?.role === 'employee'} rows="3"
                  value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select className="form-control" disabled={user?.role === 'employee'} value={formData.priority} onChange={e => setFormData({ ...formData, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Target Date</label>
                  <input type="date" className="form-control" readOnly={user?.role === 'employee'}
                    value={formData.end_date} onChange={e => setFormData({ ...formData, end_date: e.target.value })} />
                </div>
              </div>

              {user?.role !== 'employee' && (
                <div className="form-group mb-4">
                  <label className="form-label">⚡ Sprint</label>
                  <select className="form-control" value={formData.sprint} onChange={e => setFormData({ ...formData, sprint: e.target.value })}>
                    <option value="">— No Sprint —</option>
                    {sprints.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name}{s.is_active ? ' ⚡ Active' : ''} ({s.start_date} → {s.end_date})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="form-group">
                  <label className="form-label">Est. Hours</label>
                  <input type="number" step="0.5" min="0" className="form-control" readOnly={user?.role === 'employee'}
                    value={formData.estimated_hours} onChange={e => setFormData({ ...formData, estimated_hours: e.target.value })} />
                </div>
                {user?.role !== 'employee' ? (
                  <div className="form-group">
                    <label className="form-label">Assignee</label>
                    <select className="form-control" value={formData.assignee} onChange={e => setFormData({ ...formData, assignee: e.target.value })}>
                      <option value="">Unassigned</option>
                      {users.filter(u => u.role === 'employee').map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label className="form-label">Reward 💰</label>
                    <input type="text" className="form-control" readOnly
                      value={formData.reward_amount > 0 ? `₹${Number(formData.reward_amount).toLocaleString('en-IN')}` : 'No reward'}
                      style={{ color: formData.reward_amount > 0 ? 'var(--success-600, #16a34a)' : undefined, fontWeight: formData.reward_amount > 0 ? 600 : undefined }}
                    />
                  </div>
                )}
              </div>

              {user.role !== 'employee' && (
                <div className="form-group mb-4">
                  <label className="form-label">Reward Amount (₹)</label>
                  <input
                    type="number" step="0.01" min="0"
                    className="form-control"
                    placeholder="e.g. 500"
                    value={formData.reward_amount}
                    onChange={e => setFormData({ ...formData, reward_amount: e.target.value })}
                  />
                  <small className="text-muted">Credited to employee upon task approval.</small>
                </div>
              )}

              {user.role !== 'employee' && (
                <div className="form-group mb-4">
                  <label className="form-label">Status</label>
                  <select className="form-control" value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })}>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="pending_review">Pending Review</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}

              <div className="form-group border-top pt-4">
                <label className="form-label">Internal Comments & Activity</label>
                <div className="bg-gray-50 p-3 rounded max-h-48 overflow-y-auto mb-3">
                  {comments.length === 0 ? <p className="text-xs text-muted">No activity yet.</p> : (
                    comments.map(c => (
                      <div key={c.id} className="mb-2 pb-2 border-bottom">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-semibold">{c.author_name}</span>
                          <span className="text-muted">{format(new Date(c.created_at), 'MMM dd, HH:mm')}</span>
                        </div>
                        <div className="text-sm">{c.content}</div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex gap-2">
                  <input type="text" className="form-control" placeholder="Add a comment..."
                    value={commentText} onChange={e => setCommentText(e.target.value)} />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddComment}>Add</button>
                </div>
              </div>
            </div>

            {/* Right Column: Workflow Actions */}
            <div className="modal-col-right">
              {selectedTask && user?.role === 'employee' && ['assigned', 'in_progress'].includes(selectedTask.status) && (
                <div className="workflow-card bg-primary-light">
                  <h4>Work Submission</h4>
                  <p className="text-xs text-muted mb-3">Tell your manager what you've accomplished to submit for review.</p>
                  <textarea
                    className="form-control mb-3"
                    placeholder="Describe your work..."
                    rows="5"
                    value={workDescription}
                    onChange={e => setWorkDescription(e.target.value)}
                  />
                  <button type="button" className="btn btn-primary w-full" onClick={handleEmployeeSubmit}>
                    Submit for Manager Review
                  </button>
                </div>
              )}

              {selectedTask && user?.role === 'employee' && selectedTask.status === 'pending_review' && (
                <div className="workflow-card bg-orange-light">
                  <h4>Pending Approval</h4>
                  <p className="text-sm italic mb-2">" {selectedTask.completion_comment} "</p>
                  <p className="text-xs text-muted">Your work description has been sent to the manager. Please wait for confirmation.</p>
                </div>
              )}

              {selectedTask && ['manager', 'admin'].includes(user?.role) && selectedTask.status === 'pending_review' && (
                <div className="workflow-card bg-blue-light">
                  <h4>Review Submission</h4>
                  <div className="mb-4">
                    <label className="text-xs font-semibold uppercase text-muted">Employee's Work Description:</label>
                    <div className="p-3 bg-white border rounded text-sm italic mt-1">
                      {selectedTask.completion_comment || "No description provided."}
                    </div>
                  </div>

                  <label className="form-label">Approval Feedback (if reassigning)</label>
                  <textarea
                    className="form-control mb-3"
                    placeholder="Good job, but please fix..."
                    value={commentText}
                    onChange={e => setCommentText(e.target.value)}
                  />

                  <div className="grid-2 gap-2">
                    <button type="button" className="btn btn-success" onClick={() => handleManagerReview('confirm')}>
                      Confirm Complete
                    </button>
                    <button type="button" className="btn btn-red" onClick={() => handleManagerReview('reassign')}>
                      Request Changes
                    </button>
                  </div>
                </div>
              )}

              {selectedTask && selectedTask.status === 'completed' && (
                <div className="workflow-card bg-green-light">
                  <h4>Task Completed ✅</h4>
                  <p className="text-sm">This task was successfully confirmed by {selectedTask.supervisor_detail?.full_name || 'the manager'}.</p>
                  {selectedTask.completed_at && (
                    <p className="text-xs text-muted mt-2">Finished on {format(new Date(selectedTask.completed_at), 'MMM dd, yyyy')}</p>
                  )}
                  {selectedTask.reward_amount > 0 && (
                    <div className="mt-3 p-3 rounded" style={{ background: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '1px solid #bbf7d0' }}>
                      <div className="flex items-center gap-2">
                        <span style={{ fontSize: '1.25rem' }}>💰</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#16a34a' }}>₹{Number(selectedTask.reward_amount).toLocaleString('en-IN')}</div>
                          <div className="text-xs text-muted">Reward credited to employee</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {!selectedTask && (
                <div className="workflow-card">
                  <h4>Create New Task</h4>
                  <p className="text-sm text-muted">Fill in the details on the left to set up a new assignment.</p>
                  <button type="submit" className="btn btn-primary w-full mt-4">Create Task</button>
                </div>
              )}

              {selectedTask && user?.role !== 'employee' && selectedTask.status !== 'pending_review' && (
                <div className="workflow-card">
                  <h4>Edit Management</h4>
                  <p className="text-sm text-muted mb-4">Update the core details or reassign the task.</p>
                  <button type="submit" className="btn btn-primary w-full">Save Changes</button>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Close</button>
          </div>
        </form>
      </Modal>

      {/* Sprint Management Panel */}
      <Modal isOpen={isSprintPanelOpen} onClose={() => { setIsSprintPanelOpen(false); setEditingSprint(null); setSprintForm({ name: '', start_date: '', end_date: '', goal: '', is_active: false }) }} title="⚡ Sprint Management" size="lg">
        <div style={{ padding: '0 4px' }}>
          {/* Create / Edit form */}
          <div className="card mb-4" style={{ background: 'var(--gray-50)', border: '1px solid var(--border)' }}>
            <div className="card-body">
              <h4 style={{ marginBottom: 14, fontWeight: 700 }}>{editingSprint ? '✏️ Edit Sprint' : '+ Create New Sprint'}</h4>
              <form onSubmit={handleSprintSubmit}>
                <div className="form-group">
                  <label className="form-label">Sprint Name <span style={{ color: 'red' }}>*</span></label>
                  <input type="text" className="form-control" required placeholder="e.g. Sprint 3 — April" value={sprintForm.name} onChange={e => setSprintForm({ ...sprintForm, name: e.target.value })} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-group">
                    <label className="form-label">Start Date <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className="form-control" required value={sprintForm.start_date} onChange={e => setSprintForm({ ...sprintForm, start_date: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date <span style={{ color: 'red' }}>*</span></label>
                    <input type="date" className="form-control" required value={sprintForm.end_date} onChange={e => setSprintForm({ ...sprintForm, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Goal / Description</label>
                  <textarea className="form-control" rows={2} placeholder="What is this sprint's goal?" value={sprintForm.goal} onChange={e => setSprintForm({ ...sprintForm, goal: e.target.value })} />
                </div>
                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input type="checkbox" id="sprint-active" checked={sprintForm.is_active} onChange={e => setSprintForm({ ...sprintForm, is_active: e.target.checked })} />
                  <label htmlFor="sprint-active" style={{ margin: 0, fontWeight: 500, cursor: 'pointer' }}>Mark as Active Sprint</label>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="submit" className="btn btn-primary">{editingSprint ? 'Update Sprint' : 'Create Sprint'}</button>
                  {editingSprint && (
                    <button type="button" className="btn btn-ghost" onClick={() => { setEditingSprint(null); setSprintForm({ name: '', start_date: '', end_date: '', goal: '', is_active: false }) }}>Cancel</button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Sprint List */}
          <h4 style={{ fontWeight: 700, marginBottom: 12 }}>All Sprints ({sprints.length})</h4>
          {sprints.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 24 }}>No sprints yet. Create your first one above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sprints.map(s => (
                <div key={s.id} style={{
                  border: `1.5px solid ${s.is_active ? '#a78bfa' : 'var(--border)'}`,
                  borderRadius: 'var(--radius)',
                  padding: '12px 16px',
                  background: s.is_active ? '#faf5ff' : 'var(--surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.name}</span>
                      {s.is_active && (
                        <span style={{ padding: '1px 8px', borderRadius: 'var(--radius-full)', background: '#6366f1', color: '#fff', fontSize: '0.65rem', fontWeight: 700 }}>ACTIVE</span>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 3 }}>
                      {s.start_date} → {s.end_date} &nbsp;·&nbsp; {s.task_count} task{s.task_count !== 1 ? 's' : ''}
                    </div>
                    {s.goal && <div style={{ fontSize: '0.78rem', marginTop: 2, color: 'var(--text)' }}>{s.goal}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleEditSprint(s)}>✏️ Edit</button>
                    <button
                      className={`btn btn-sm ${s.is_active ? 'btn-danger' : 'btn-outline'}`}
                      onClick={() => handleToggleActive(s)}
                    >
                      {s.is_active ? '⏹ Deactivate' : '▶ Activate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* History Modal */}
      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Task History">
        <div className="modal-body">
          {taskHistory.length === 0 ? (
            <p className="text-muted">No history found for this task.</p>
          ) : (
            <div className="timeline">
              {taskHistory.map(h => (
                <div key={h.id} className="timeline-item">
                  <div className="timeline-dot">📝</div>
                  <div className="timeline-content">
                    <div className="timeline-title">{h.changed_by_name} updated {h.field_name}</div>
                    <div className="timeline-time">{format(new Date(h.timestamp), 'MMM dd, yyyy h:mm a')}</div>
                    <div className="timeline-detail">
                      <del className="text-xs mr-2">{h.old_value}</del>
                      <span className="text-xs font-semibold">→ {h.new_value}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}

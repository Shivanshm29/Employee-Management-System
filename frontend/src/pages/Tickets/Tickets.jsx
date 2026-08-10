import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { ticketsApi, authApi, tasksApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

export default function Tickets() {
  const { user } = useAuth()
  const [tickets, setTickets] = useState([])
  const [users, setUsers] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ status: '', priority: '', type: '', search: '' })

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedTicket, setSelectedTicket] = useState(null)
  
  const [formData, setFormData] = useState({
    title: '', description: '', ticket_type: 'support', priority: 'medium',
    assignee: '', linked_task: '', due_date: ''
  })

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.type) params.ticket_type = filters.type
      if (filters.search) params.search = filters.search
      const res = await ticketsApi.list(params)
      setTickets(res.data.results || res.data)
    } catch {
      toast.error('Failed to fetch tickets')
    } finally {
      setLoading(false)
    }
  }, [filters])

  const fetchDropdownData = useCallback(async () => {
    try {
      const [uRes, tRes] = await Promise.all([authApi.users(), tasksApi.list()])
      setUsers(uRes.data.results || uRes.data)
      setTasks(tRes.data.results || tRes.data)
    } catch {
      // Silently fail for dropdown load
    }
  }, [])

  useEffect(() => {
    fetchTickets()
    fetchDropdownData()
  }, [fetchTickets, fetchDropdownData])

  const handleOpenModal = (ticket = null) => {
    setSelectedTicket(ticket)
    if (ticket) {
      setFormData({
        title: ticket.title, description: ticket.description,
        ticket_type: ticket.ticket_type, priority: ticket.priority,
        assignee: ticket.assignee || '', linked_task: ticket.linked_task || '',
        due_date: ticket.due_date || ''
      })
    } else {
      setFormData({
        title: '', description: '', ticket_type: 'support', priority: 'medium',
        assignee: '', linked_task: '', due_date: ''
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (selectedTicket) {
        await ticketsApi.update(selectedTicket.id, formData)
        toast.success('Ticket updated')
      } else {
        await ticketsApi.create(formData)
        toast.success('Ticket created')
      }
      setIsModalOpen(false)
      fetchTickets()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error saving ticket')
    }
  }

  const handleApprove = async (id) => {
    try {
      await ticketsApi.approve(id)
      toast.success('Ticket approved! Task created automatically.')
      fetchTickets()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve ticket')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Support Tickets</h2>
          <p>Manage, assign, and track technical issues and requests.</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>+ Raise Ticket</button>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="filter-row">
            <div className="search-bar" style={{ flex: 1, minWidth: '200px' }}>
              <span className="search-icon">🔍</span>
              <input 
                type="text" className="form-control" placeholder="Search tickets..." 
                value={filters.search} onChange={e => setFilters({...filters, search: e.target.value})}
              />
            </div>
            <select className="form-control" style={{ width: '150px' }} value={filters.status} onChange={e => setFilters({...filters, status: e.target.value})}>
              <option value="">All Status</option>
              <option value="open">Open</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
            <select className="form-control" style={{ width: '140px' }} value={filters.type} onChange={e => setFilters({...filters, type: e.target.value})}>
              <option value="">All Types</option>
              <option value="bug">Bug</option>
              <option value="feature">Feature</option>
              <option value="support">Support</option>
            </select>
          </div>
        </div>
      </div>

      <div className="card table-wrapper">
        {loading ? (
          <div className="loading-center"><div className="spinner"></div></div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
             <div className="empty-icon">🎫</div>
             <h3>No tickets found</h3>
             <p>All clear! Relax or raise a new ticket.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Title & Meta</th>
                <th>Status</th>
                <th>Assignee</th>
                <th>Creator</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map(t => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {t.title}
                      {t.priority === 'critical' && <span className="badge badge-red ml-2">Critical</span>}
                      {t.priority === 'high' && !['critical'].includes(t.priority) && <span className="badge badge-yellow ml-2">High</span>}
                    </div>
                    <div className="text-xs text-muted mt-1">{t.ticket_type.toUpperCase()} • #{t.id}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${t.status === 'resolved' || t.status === 'approved' ? 'green' : t.status === 'closed' ? 'gray' : 'blue'}`}>
                      {t.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm">{t.assignee_detail?.full_name || 'Unassigned'}</span>
                  </td>
                  <td><span className="text-sm text-muted">{t.created_by_name}</span></td>
                  <td><span className="text-sm">{t.due_date ? format(new Date(t.due_date), 'MMM dd, yyyy') : '-'}</span></td>
                  <td>
                    <div className="flex gap-2">
                       <button className="btn btn-ghost btn-sm" onClick={() => handleOpenModal(t)}>Edit</button>
                       {user?.role !== 'employee' && ['open', 'pending_approval'].includes(t.status) && (
                         <button className="btn btn-outline btn-sm" onClick={() => handleApprove(t.id)}>Approve</button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={selectedTicket ? 'Edit Ticket' : 'Raise Ticket'} size="lg">
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Ticket Title <span className="required">*</span></label>
              <input type="text" className="form-control" required 
                value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>
            
            <div className="form-group">
              <label className="form-label">Description <span className="required">*</span></label>
              <textarea className="form-control" required
                value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>

            <div className="form-row mb-4">
              <div className="form-group">
                <label className="form-label">Type</label>
                <select className="form-control" value={formData.ticket_type} onChange={e => setFormData({...formData, ticket_type: e.target.value})}>
                  <option value="bug">Bug</option>
                  <option value="feature">Feature Request</option>
                  <option value="support">Support</option>
                  <option value="incident">Incident</option>
                  <option value="change">Change Request</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select className="form-control" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>

            <div className="form-row mb-4">
              <div className="form-group">
                <label className="form-label">Assignee</label>
                <select className="form-control" value={formData.assignee} onChange={e => setFormData({...formData, assignee: e.target.value})}>
                  <option value="">Unassigned</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input type="date" className="form-control" 
                  value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})} />
              </div>
            </div>
            
            <div className="form-group">
              <label className="form-label">Link to Task</label>
              <select className="form-control" value={formData.linked_task} onChange={e => setFormData({...formData, linked_task: e.target.value})}>
                <option value="">None</option>
                {tasks.map(t => <option key={t.id} value={t.id}>{t.title} ({t.status.replace('_',' ')})</option>)}
              </select>
              <p className="form-hint">Linking a task will auto-sync status updates.</p>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">{selectedTicket ? 'Save Changes' : 'Submit Ticket'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

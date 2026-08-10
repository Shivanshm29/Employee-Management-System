import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { tasksApi } from '../../api/client'
import Modal from '../../components/Modal'

export default function Approvals() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Review Modal state
  const [selectedTask, setSelectedTask] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [commentText, setCommentText] = useState('')

  const fetchPendingApprovals = async () => {
    setLoading(true)
    try {
      // Fetch only tasks that are pending review
      const res = await tasksApi.list({ status: 'pending_review' })
      setTasks(res.data.results || res.data)
    } catch {
      toast.error('Failed to load pending approvals')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingApprovals()
  }, [])

  const openReviewModal = (task) => {
    setSelectedTask(task)
    setCommentText('')
    setIsModalOpen(true)
  }

  const handleReviewAction = async (action) => {
    if (action === 'reassign' && !commentText.trim()) {
      toast.error('Feedback comment is required when requesting changes.')
      return
    }

    try {
      if (action === 'confirm') {
        await tasksApi.complete(selectedTask.id, { comment: commentText || 'Manager Confirmed' })
        toast.success('Task confirmed as completed')
      } else {
        await tasksApi.reassign(selectedTask.id, { comment: commentText })
        toast.success('Task returned to employee for changes')
      }
      setIsModalOpen(false)
      fetchPendingApprovals()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Review action failed')
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Task Approvals</h2>
          <p>Review and confirm work submitted by your team</p>
        </div>
      </div>

      <div className="card table-wrapper">
        {loading ? (
          <div className="loading-center"><div className="spinner"></div></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">✅</div>
            <h3>All caught up</h3>
            <p>There are no tasks waiting for your approval right now.</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task Title</th>
                <th>Employee</th>
                <th>Submitted On</th>
                <th>Submission Notes</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id}>
                  <td className="font-semibold">{t.title}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="sidebar-avatar" style={{ width: 24, height: 24, fontSize: '0.6rem' }}>
                        {t.assignee_detail?.full_name?.charAt(0) || '?'}
                      </div>
                      <span className="text-sm">{t.assignee_detail?.full_name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="text-sm">
                    {/* fallback to updated_at since pending_review triggers update */}
                    {format(new Date(t.updated_at), 'MMM dd, h:mm a')}
                  </td>
                  <td className="text-sm italic text-gray-600 truncate max-w-xs">
                    "{t.completion_comment || 'No notes provided'}"
                  </td>
                  <td>
                    <button className="btn btn-primary btn-sm" onClick={() => openReviewModal(t)}>
                      Review
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Review Submission">
        {selectedTask && (
          <div className="p-4 space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-lg font-semibold mb-2">{selectedTask.title}</h4>
              <p className="text-sm text-gray-600 mb-4">{selectedTask.description}</p>
              
              <div className="mt-4 pt-4 border-t border-gray-200">
                <label className="text-xs font-semibold uppercase text-gray-500 mb-1 block">
                  Employee's Work Description:
                </label>
                <div className="bg-white p-3 border border-gray-200 rounded italic text-sm">
                  "{selectedTask.completion_comment || 'No description provided'}"
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <label className="text-sm font-semibold text-blue-900 block mb-2">
                Manager's Feedback (Required if requesting changes)
              </label>
              <textarea
                className="form-control w-full"
                rows="3"
                placeholder="Good job! Or: Please fix..."
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
              />
              
              <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                  type="button" 
                  className="btn btn-success py-2" 
                  onClick={() => handleReviewAction('confirm')}
                >
                  Confirm Completed
                </button>
                <button 
                  type="button" 
                  className="btn btn-red py-2" 
                  onClick={() => handleReviewAction('reassign')}
                >
                  Request Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

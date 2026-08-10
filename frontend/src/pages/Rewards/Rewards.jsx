import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { rewardsApi, authApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import Modal from '../../components/Modal'

export default function Rewards() {
  const { user } = useAuth()
  const [leaderboard, setLeaderboard] = useState([])
  const [rewards, setRewards] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    recipient: '', reward_type: 'appreciation', title: '', message: '', points: 10,
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [lbRes, rwRes, uRes] = await Promise.all([
        rewardsApi.leaderboard(),
        rewardsApi.list(),
        authApi.users()
      ])
      setLeaderboard(lbRes.data)
      setRewards(rwRes.data.results || rwRes.data)
      setUsers(uRes.data.results || uRes.data)
    } catch {
      toast.error('Failed to load rewards data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleGiveReward = async (e) => {
    e.preventDefault()
    try {
      if (!formData.recipient) return toast.error('Please select a recipient')
      await rewardsApi.create(formData)
      toast.success('Reward sent successfully!')
      setIsModalOpen(false)
      setFormData({ recipient: '', reward_type: 'appreciation', title: '', message: '', points: 10 })
      fetchData()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send reward')
    }
  }

  const getTrophy = (index) => {
    if (index === 0) return '🏆'
    if (index === 1) return '🥈'
    if (index === 2) return '🥉'
    return `${index + 1}.`
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Rewards & Recognition</h2>
          <p>Celebrate great work and track top performers</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>Give Reward</button>
      </div>

      <div className="grid-2">
        {/* Leaderboard */}
        <div className="card">
          <div className="card-header border-b p-4">
            <h3 className="text-lg font-semibold m-0">Top Performers 🌟</h3>
          </div>
          <div className="card-body p-0">
            {loading ? (
               <div className="p-4 flex-center"><div className="spinner"></div></div>
            ) : leaderboard.length === 0 ? (
               <div className="p-4 text-center text-muted">No points awarded yet</div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                     <tr>
                        <th style={{ width: 60 }}>Rank</th>
                        <th>Employee</th>
                        <th style={{ textAlign: 'right' }}>Total Points</th>
                     </tr>
                  </thead>
                  <tbody>
                     {leaderboard.map((lb, idx) => (
                       <tr key={lb.user_id}>
                         <td className="font-semibold text-lg" style={{ textAlign: 'center' }}>
                            {getTrophy(idx)}
                         </td>
                         <td className="font-medium">{lb.name}</td>
                         <td className="font-bold text-lg" style={{ textAlign: 'right', color: 'var(--primary)' }}>
                            {lb.total_points}
                         </td>
                       </tr>
                     ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="card">
          <div className="card-header border-b p-4">
            <h3 className="text-lg font-semibold m-0">Recent Activity Activity</h3>
          </div>
          <div className="card-body p-4" style={{ maxHeight: '600px', overflowY: 'auto' }}>
             {loading ? (
                <div className="flex-center"><div className="spinner"></div></div>
             ) : rewards.length === 0 ? (
                <div className="text-muted text-center py-4">No recent rewards. Be the first to give one!</div>
             ) : (
                <div className="timeline">
                   {rewards.map(r => (
                      <div key={r.id} className="timeline-item">
                        <div className="timeline-dot" style={{ background: 'var(--primary)', color: 'white' }}>✨</div>
                        <div className="timeline-content">
                           <div className="font-semibold text-base">
                              <span style={{ color: 'var(--primary)' }}>{r.given_by?.full_name || 'System'}</span> 
                              {' awarded '} 
                              <span style={{ color: 'var(--primary)' }}>{r.recipient_name || 'someone'}</span>
                           </div>
                           <div className="text-sm font-semibold mt-1">"{r.title}"</div>
                           <div className="text-sm mt-1">{r.message}</div>
                           <div className="flex items-center gap-2 mt-2">
                              <span className="badge badge-success text-xs">+{r.points} points</span>
                              <span className="badge text-xs" style={{background: 'var(--bg-secondary)'}}>{r.reward_type}</span>
                              <span className="text-xs text-muted ml-auto">
                                 {format(new Date(r.created_at), 'MMM d, yyyy')}
                              </span>
                           </div>
                        </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>
      </div>

      {/* Give Reward Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Give Reward">
        <form onSubmit={handleGiveReward}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Recipient <span className="required">*</span></label>
              <select className="form-control" required value={formData.recipient} onChange={e => setFormData({...formData, recipient: e.target.value})}>
                 <option value="">Select an employee...</option>
                 {users.filter(u => u.id !== user?.id).map(u => (
                    <option key={u.id} value={u.id}>{u.full_name}</option>
                 ))}
              </select>
            </div>
            
            <div className="form-row mb-4">
              <div className="form-group">
                 <label className="form-label">Type</label>
                 <select className="form-control" value={formData.reward_type} onChange={e => setFormData({...formData, reward_type: e.target.value})}>
                    <option value="appreciation">Appreciation</option>
                    <option value="recognition">Recognition</option>
                    <option value="award">Award</option>
                    <option value="bonus">Bonus</option>
                 </select>
              </div>
              <div className="form-group">
                 <label className="form-label">Points</label>
                 <input type="number" min="0" max="500" className="form-control" value={formData.points} onChange={e => setFormData({...formData, points: e.target.value})} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Title <span className="required">*</span></label>
              <input type="text" className="form-control" required placeholder="e.g. Hero of the Week!" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
            </div>

            <div className="form-group">
              <label className="form-label">Message <span className="required">*</span></label>
              <textarea className="form-control" required rows={3} placeholder="Tell them why they are awesome..." value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Send Reward</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

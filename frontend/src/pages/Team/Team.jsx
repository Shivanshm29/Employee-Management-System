import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { authApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import toast from 'react-hot-toast'

export default function Team() {
  const { user } = useAuth()
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchTeam = async () => {
    try {
      const res = await authApi.users({ t: Date.now() })
      // Handle DRF pagination (res.data.results) or raw array (res.data)
      const data = res.data.results || res.data
      setMembers(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchTeam()
    const timer = setInterval(fetchTeam, 30000)
    return () => clearInterval(timer)
  }, [])

  const filteredMembers = members
    .filter(m => m.id !== user?.id)
    .filter(m => 
      `${m.first_name} ${m.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.job_title && m.job_title.toLowerCase().includes(searchTerm.toLowerCase()))
    )

  if (loading) return (
    <div className="h-64 flex flex-col items-center justify-center">
      <div className="spinner mb-4"></div>
      <p className="text-gray-500 font-medium">Gathering your team...</p>
    </div>
  )

  return (
    <div className="space-y-8 fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-100">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 m-0 tracking-tight">My Team 👥</h1>
          <p className="text-sm text-gray-500 m-0 mt-1 font-medium">Overview and management of your department members</p>
        </div>
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="search-bar flex-1 md:w-64">
             <span className="search-icon">🔍</span>
             <input 
               type="text" 
               className="form-control rounded-full bg-gray-50 border-gray-200 focus:bg-white" 
               placeholder="Filter by name, role..." 
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
          </div>
          <div className="bg-brand-50 text-brand-700 px-4 py-2 rounded-full font-bold text-sm border border-brand-100 shadow-sm whitespace-nowrap">
            {filteredMembers.length} Active {filteredMembers.length === 1 ? 'Member' : 'Members'}
          </div>
          <button
            onClick={fetchTeam}
            className="btn btn-ghost btn-sm rounded-full"
            title="Refresh session data"
            style={{ padding: '6px 14px', fontSize: '0.8rem' }}
          >
            🔄 Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredMembers.map((member, idx) => (
          <div 
            key={member.id} 
            className="premium-card fade-in-up p-0 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 group"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="h-2 bg-gradient-to-r from-brand-400 to-brand-600 group-hover:from-brand-500 group-hover:to-brand-700 transition-colors duration-300"></div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 min-w-[56px] rounded-2xl bg-gray-100 flex items-center justify-center text-brand-600 font-extrabold text-xl shadow-inner border border-white relative">
                  {member.first_name?.[0] || '?'}{member.last_name?.[0] || ''}
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${member.active_session ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} title={member.active_session ? "Online" : "Offline"}></div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-lg m-0 truncate text-gray-800 leading-tight">
                    {member.first_name} {member.last_name}
                  </h3>
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-brand-50 text-brand-600 uppercase tracking-widest mt-1.5 inline-block border border-brand-100">
                    {member.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-4 gap-x-2 border-t border-gray-100 pt-5 mt-2">
                <div className="flex items-start gap-2">
                  <span className="text-lg opacity-40 mt-0.5">💼</span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest m-0">Position</p>
                    <p className="text-xs font-semibold text-gray-800 truncate m-0" title={member.job_title}>{member.job_title || 'N/A'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-lg opacity-40 mt-0.5">🏢</span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest m-0">Dept</p>
                    <p className="text-xs font-semibold text-gray-800 truncate m-0" title={member.department_name || member.department?.name}>{member.department_name || member.department?.name || 'Unassigned'}</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-2">
                  <span className="text-lg opacity-40 mt-0.5">📧</span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest m-0">Contact</p>
                    <p className="text-xs font-semibold text-gray-800 truncate m-0" title={member.email}>{member.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <span className="text-lg opacity-40 mt-0.5">⏱️</span>
                  <div className="min-w-0">
                    <p className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest m-0">Total Hours</p>
                    <p className="text-xs font-bold text-brand-600 truncate m-0">{member.work_hours_today || '0h 0m'}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest m-0">Today's Sessions</p>
                </div>
                <div className="space-y-1.5 max-h-24 overflow-y-auto custom-scrollbar pr-1">
                  {member.today_sessions?.length > 0 ? (
                    member.today_sessions.map((session, sidx) => (
                      <div key={sidx} className="flex justify-between items-center bg-gray-50 px-3 py-1.5 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-brand-400"></span>
                          <span className="font-semibold text-gray-700">{session.login}</span>
                        </div>
                        <span className="text-gray-400">→</span>
                        <span className={`font-semibold ${session.logout === 'Active' ? 'text-green-600' : 'text-gray-700'}`}>{session.logout}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-gray-400 italic text-center py-2 bg-gray-50 rounded-lg m-0">No sessions today</p>
                  )}
                </div>
              </div>

              <div className="mt-6 flex gap-2">
                <button 
                  className="btn btn-sm btn-primary flex-1 rounded-xl shadow-md shadow-brand-100"
                  onClick={() => toast('Profile page is under construction', { icon: '🚧' })}
                >
                  Profile
                </button>
                <Link to="/chat" className="btn btn-sm btn-outline flex-1 rounded-xl flex items-center justify-center">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        ))}

        {filteredMembers.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-gray-200 scale-in">
            <div className="text-5xl mb-4 opacity-10">🔍</div>
            <h3 className="text-gray-400 font-bold">No members found</h3>
            <p className="text-sm text-gray-400 px-8">Try adjusting your search terms or filters.</p>
          </div>
        )}
      </div>
    </div>
  )
}


import { useState, useEffect, useRef } from 'react'
import toast from 'react-hot-toast'
import { format, isToday, isYesterday } from 'date-fns'
import { chatApi, createChatSocket, authApi } from '../../api/client'
import { useAuth } from '../../context/AuthContext'

// ─── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?'
}

function getFirstName(fullName = '') {
  return fullName.split(' ')[0] || fullName
}

function formatMsgTime(dateStr) {
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday ' + format(d, 'h:mm a')
  return format(d, 'MMM d, h:mm a')
}

function formatRoomTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isToday(d)) return format(d, 'h:mm a')
  if (isYesterday(d)) return 'Yesterday'
  return format(d, 'MMM d')
}

// ─── Avatar ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 40, color = 'var(--brand-600)', online = false }) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color, color: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 700, fontSize: size * 0.35,
        userSelect: 'none',
      }}>
        {getInitials(name)}
      </div>
      {online && (
        <span style={{
          position: 'absolute', bottom: 1, right: 1,
          width: size * 0.28, height: size * 0.28,
          background: 'var(--success-500)', borderRadius: '50%',
          border: '2px solid #fff',
        }} />
      )}
    </div>
  )
}

// ─── RoomItem ─────────────────────────────────────────────────────────────────

function RoomItem({ room, isActive, onClick }) {
  const isDirect = room.room_type === 'direct'
  const icon = isDirect ? null : room.room_type === 'global' ? '🌐' : '👥'
  const displayName = isDirect ? room.display_name : getFirstName(room.display_name)

  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 'var(--radius)',
      cursor: 'pointer', transition: 'var(--transition)',
      background: isActive ? 'var(--brand-50)' : 'transparent',
      borderLeft: isActive ? '3px solid var(--brand-500)' : '3px solid transparent',
      marginBottom: 2,
    }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'var(--gray-100)' }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
    >
      {isDirect
        ? <Avatar name={room.display_name} size={42} color="var(--gray-400)" online />
        : (
          <div style={{
            width: 42, height: 42, borderRadius: 'var(--radius)',
            background: 'var(--brand-100)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0,
          }}>{icon}</div>
        )
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 4 }}>
          <span style={{
            fontWeight: isActive ? 700 : 600,
            fontSize: '0.9rem', color: isActive ? 'var(--brand-700)' : 'var(--text)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{displayName}</span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            {formatRoomTime(room.last_message?.created_at)}
          </span>
        </div>
        <p style={{
          margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {room.last_message
            ? <>{!isDirect && <b>{getFirstName(room.last_message.sender_name)}: </b>}{room.last_message.content}</>
            : <i>No messages yet</i>
          }
        </p>
      </div>
    </div>
  )
}

// ─── MemberItem ───────────────────────────────────────────────────────────────

function MemberItem({ member, onClick }) {
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 14px', borderRadius: 'var(--radius)',
      cursor: 'pointer', transition: 'var(--transition)',
      marginBottom: 2,
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <Avatar name={member.full_name || `${member.first_name} ${member.last_name}`} size={42} color="var(--brand-500)" online />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {member.first_name} {member.last_name}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
          {member.job_title || member.role}
        </div>
      </div>
      <button style={{
        padding: '4px 10px', borderRadius: 'var(--radius-full)',
        background: 'var(--brand-50)', color: 'var(--brand-600)',
        border: '1px solid var(--brand-200)', fontSize: '0.72rem',
        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
      }}>
        Message
      </button>
    </div>
  )
}

// ─── Message Bubble ──────────────────────────────────────────────────────────

function MessageBubble({ msg, isMe, showName }) {
  if (msg.is_broadcast) {
    return (
      <div style={{ textAlign: 'center', margin: '12px 0' }}>
        <span style={{
          display: 'inline-block', padding: '6px 16px',
          background: '#fef3c7', color: '#92400e',
          borderRadius: 'var(--radius-full)', fontSize: '0.78rem',
          fontWeight: 600, border: '1px solid #fde68a',
        }}>
          📢 Broadcast from {getFirstName(msg.sender_name)}: {msg.content}
        </span>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
      {showName && !isMe && (
        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 3, marginLeft: 4 }}>
          {getFirstName(msg.sender_name)}
        </span>
      )}
      <div style={{ maxWidth: '70%' }}>
        <div style={{
          padding: '9px 14px',
          borderRadius: isMe ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isMe ? 'var(--brand-600)' : 'var(--surface)',
          color: isMe ? '#fff' : 'var(--text)',
          border: isMe ? 'none' : '1px solid var(--border)',
          fontSize: '0.875rem', lineHeight: 1.55,
          boxShadow: 'var(--shadow-sm)',
          wordBreak: 'break-word', whiteSpace: 'pre-wrap',
        }}>
          {msg.content}
        </div>
        <div style={{
          fontSize: '0.68rem', color: 'var(--text-muted)',
          marginTop: 3,
          textAlign: isMe ? 'right' : 'left',
          paddingLeft: isMe ? 0 : 4,
          paddingRight: isMe ? 4 : 0,
        }}>
          {formatMsgTime(msg.created_at)}
        </div>
      </div>
    </div>
  )
}

// ─── Main Chat Component ─────────────────────────────────────────────────────

export default function Chat() {
  const { user } = useAuth()
  const [rooms, setRooms] = useState([])
  const [members, setMembers] = useState([])
  const [activeRoom, setActiveRoom] = useState(null)
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [tab, setTab] = useState('chats') // 'chats' | 'members'
  const [broadcasting, setBroadcasting] = useState(false)
  const [search, setSearch] = useState('')
  const [loadingMessages, setLoadingMessages] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)
  const socketRef = useRef(null)

  // ── Data fetching ──────────────────────────────────────────────────────────

  const loadRooms = async () => {
    try {
      const res = await chatApi.rooms()
      const data = res.data.results || res.data
      const list = Array.isArray(data) ? data : []
      setRooms(list)
      if (list.length > 0) setActiveRoom(list[0])
    } catch {
      toast.error('Could not load chat rooms')
    }
  }

  const loadMessages = async (roomId) => {
    setLoadingMessages(true)
    try {
      const res = await chatApi.messages(roomId)
      const data = res.data.results || res.data
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load messages')
    } finally {
      setLoadingMessages(false)
    }
  }

  const loadMembers = async () => {
    try {
      const res = await authApi.users()
      const data = res.data.results || res.data
      setMembers(Array.isArray(data) ? data : [])
    } catch {
      // Silently fail for members load
    }
  }

  const openSocket = (roomId) => {
    socketRef.current?.close()
    const token = localStorage.getItem('access_token')
    const ws = createChatSocket(roomId, token)
    ws.onopen = () => ws.send(JSON.stringify({ type: 'authenticate', token }))
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.type === 'chat_message' && data.message?.room == roomId) {
        setMessages(prev => [...prev, data.message])
      }
    }
    ws.onerror = (err) => { 
      console.error('Socket error:', err)
    }
    socketRef.current = ws
  }

  useEffect(() => {
    loadRooms()
    loadMembers()
    return () => socketRef.current?.close()
  }, [])

  useEffect(() => {
    if (!activeRoom) return
    loadMessages(activeRoom.id)
    openSocket(activeRoom.id)
    return () => socketRef.current?.close()
  }, [activeRoom])

  // ── Actions ───────────────────────────────────────────────────────────────

  const sendMessage = (e) => {
    e.preventDefault()
    if (!inputText.trim() || !socketRef.current || !activeRoom) return
    socketRef.current.send(JSON.stringify({ type: 'chat_message', room_id: activeRoom.id, content: inputText }))
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const sendBroadcast = async (e) => {
    e.preventDefault()
    if (!inputText.trim()) return
    try {
      await chatApi.broadcast({ content: inputText, room_id: activeRoom?.id })
      setInputText('')
      setBroadcasting(false)
      toast.success('Broadcast sent to all members')
    } catch {
      toast.error('Failed to send broadcast')
    }
  }

  const openDM = async (member) => {
    try {
      const res = await chatApi.getOrCreateDirectRoom(member.id)
      const room = res.data
      setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev])
      setActiveRoom(room)
      setTab('chats')
    } catch {
      toast.error('Could not start conversation')
    }
  }

  const startVideoCall = () => {
    if (!activeRoom) return
    const slug = activeRoom.name.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-')
    window.open(`https://meet.jit.si/ems-${activeRoom.id}-${slug}`, '_blank')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      broadcasting ? sendBroadcast(e) : sendMessage(e)
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    }
  }

  const autoResize = (e) => {
    setInputText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'
  }

  // ── Filtered lists ────────────────────────────────────────────────────────

  const filteredRooms = rooms.filter(r => (r.display_name || r.name)?.toLowerCase().includes(search.toLowerCase()))
  const filteredMembers = members.filter(m =>
    m.id !== user?.id &&
    (`${m.first_name} ${m.last_name}`).toLowerCase().includes(search.toLowerCase())
  )

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 120px)', minHeight: 500,
      background: 'var(--surface)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border)', boxShadow: 'var(--shadow)',
      overflow: 'hidden',
    }}>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{
        width: 300, flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface-2)',
      }}>

        {/* Sidebar header */}
        <div style={{ padding: '18px 16px 12px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Avatar name={`${user?.first_name} ${user?.last_name}`} size={36} color="var(--brand-600)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>Messages</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.first_name} {user?.last_name}</div>
            </div>
          </div>

          {/* Tab switcher */}
            <div style={{
            display: 'flex', background: 'var(--gray-100)',
            borderRadius: 'var(--radius)', padding: 3, marginBottom: 12,
          }}>
            {['chats', 'team'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1, padding: '6px 0', borderRadius: 'var(--radius-sm)',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: '0.8rem', transition: 'var(--transition)',
                background: tab === t ? 'var(--surface)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                textTransform: 'capitalize',
              }}>{t === 'chats' ? 'Chats' : 'Team'}</button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={tab === 'chats' ? 'Search chats...' : 'Search team members...'}
              style={{
                width: '100%', padding: '8px 10px 8px 30px',
                borderRadius: 'var(--radius)', border: '1px solid var(--border)',
                background: 'var(--surface)', fontSize: '0.82rem',
                outline: 'none', color: 'var(--text)',
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
          {tab === 'chats' ? (
            filteredRooms.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px', fontSize: '0.85rem' }}>No conversations found</div>
              : filteredRooms.map(room => (
                <RoomItem key={room.id} room={room} isActive={activeRoom?.id === room.id} onClick={() => setActiveRoom(room)} />
              ))
          ) : (
            filteredMembers.length === 0
              ? <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '32px 16px', fontSize: '0.85rem' }}>No members found</div>
              : filteredMembers.map(m => <MemberItem key={m.id} member={m} onClick={() => openDM(m)} />)
          )}
        </div>
      </div>

      {/* ── MAIN CHAT AREA ── */}
      {activeRoom ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

          {/* Chat header */}
          <div style={{
            padding: '0 20px', height: 68, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid var(--border)',
            background: 'var(--surface)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {activeRoom.room_type === 'direct'
                ? <Avatar name={activeRoom.display_name} size={40} color="var(--gray-400)" online />
                : (
                  <div style={{
                    width: 40, height: 40, borderRadius: 'var(--radius)',
                    background: 'var(--brand-100)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: 20,
                  }}>
                    {activeRoom.room_type === 'global' ? '🌐' : '👥'}
                  </div>
                )
              }
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                  {activeRoom.room_type === 'direct' ? activeRoom.display_name : getFirstName(activeRoom.display_name)}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-500)', display: 'inline-block' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {activeRoom.room_type === 'direct' ? 'Direct Message' : activeRoom.room_type === 'global' ? 'All Members' : 'Team Channel'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                onClick={startVideoCall}
                title="Start Video Call"
                style={{
                  padding: '7px 14px', borderRadius: 'var(--radius)',
                  border: '1px solid var(--border)', background: 'var(--surface)',
                  cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6,
                  transition: 'var(--transition)',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-100)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}
              >
                📹 Call
              </button>
              {user?.role !== 'employee' && (
                <button
                  onClick={() => setBroadcasting(b => !b)}
                  style={{
                    padding: '7px 14px', borderRadius: 'var(--radius)',
                    border: `1px solid ${broadcasting ? 'var(--danger-500)' : 'var(--border)'}`,
                    background: broadcasting ? '#fef2f2' : 'var(--surface)',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
                    color: broadcasting ? 'var(--danger-500)' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', gap: 6,
                    transition: 'var(--transition)',
                  }}
                >
                  📢 {broadcasting ? 'Cancel' : 'Broadcast'}
                </button>
              )}
            </div>
          </div>

          {/* Messages area */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 2,
            background: 'var(--gray-50)',
          }}>
            {loadingMessages ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="spinner" />
              </div>
            ) : messages.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', opacity: 0.45 }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>💬</div>
                <div style={{ fontWeight: 600, color: 'var(--text-muted)' }}>No messages yet</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>Be the first to say something!</div>
              </div>
            ) : (
              messages.map(msg => (
                <MessageBubble
                  key={msg.id}
                  msg={msg}
                  isMe={msg.sender === user?.id}
                  showName={activeRoom.room_type !== 'direct'}
                />
              ))
            )}
            <div ref={bottomRef} />
          </div>

          {/* Broadcast banner */}
          {broadcasting && (
            <div style={{
              padding: '8px 20px',
              background: '#fef3c7', borderTop: '1px solid #fde68a',
              fontSize: '0.78rem', fontWeight: 600, color: '#92400e',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📢 Broadcast mode — this message will be sent to all members
            </div>
          )}

          {/* Input area */}
          <div style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            background: 'var(--surface)',
            flexShrink: 0,
          }}>
            <form onSubmit={broadcasting ? sendBroadcast : sendMessage} style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              background: 'var(--surface-2)',
              border: `1.5px solid ${broadcasting ? 'var(--warning-500)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-lg)', padding: '8px 12px',
              transition: 'var(--transition)',
            }}>
              <textarea
                ref={textareaRef}
                rows={1}
                value={inputText}
                onChange={autoResize}
                onKeyDown={handleKeyDown}
                placeholder={broadcasting ? 'Type broadcast message... (Enter to send)' : 'Type a message... (Enter to send)'}
                style={{
                  flex: 1, resize: 'none', border: 'none', outline: 'none',
                  background: 'transparent', fontSize: '0.875rem',
                  color: 'var(--text)', fontFamily: 'var(--font)',
                  lineHeight: 1.5, maxHeight: 140, overflowY: 'auto',
                  paddingTop: 4,
                }}
              />
              <button
                type="submit"
                disabled={!inputText.trim()}
                style={{
                  width: 38, height: 38, borderRadius: 'var(--radius)',
                  border: 'none', cursor: inputText.trim() ? 'pointer' : 'not-allowed',
                  background: !inputText.trim()
                    ? 'var(--gray-200)'
                    : broadcasting ? 'var(--warning-500)' : 'var(--brand-600)',
                  color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '1rem', transition: 'var(--transition)',
                }}
              >
                ➤
              </button>
            </form>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 6, paddingLeft: 4 }}>
              Press <kbd style={{ background: 'var(--gray-100)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Enter</kbd> to send · <kbd style={{ background: 'var(--gray-100)', padding: '1px 5px', borderRadius: 3, fontFamily: 'monospace' }}>Shift+Enter</kbd> for new line
            </div>
          </div>
        </div>
      ) : (
        /* Empty state */
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: 'var(--gray-50)',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: 'var(--radius-lg)',
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '2.5rem', marginBottom: 16, boxShadow: 'var(--shadow)',
          }}>💬</div>
          <h3 style={{ margin: 0, fontWeight: 700, fontSize: '1.25rem', color: 'var(--text)' }}>Select a Conversation</h3>
          <p style={{ marginTop: 8, color: 'var(--text-muted)', fontSize: '0.875rem', textAlign: 'center', maxWidth: 280 }}>
            Choose a chat from the left panel or find a team member in the Directory tab to start messaging.
          </p>
        </div>
      )}
    </div>
  )
}

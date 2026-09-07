import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import {
  createMeeting,
  getMyMeetings,
  joinMeeting,
} from './lib/meetingService'
import MeetingRoom from './components/MeetingRoom'
import './App.css'

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return <div className="app">Loading...</div>
  }

  if (!session) {
    return <Auth />
  }

  return <Dashboard session={session} />
}

function Auth() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setMessage('')
    setLoading(true)

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setMessage(error.message)
      } else {
        setMessage(
          'Account created. Check your email if confirmation is required.'
        )
      }
    }

    setLoading(false)
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-dot" />
          <h1>Meeting Intelligence</h1>
        </div>

        <p className="subtitle">
          Real-time intelligence. User-controlled memory.
        </p>

        <h2>{isLogin ? 'Welcome back' : 'Create your account'}</h2>

        <form onSubmit={handleSubmit}>
          <label>Email</label>

          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <label>Password</label>

          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            minLength={6}
            required
          />

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : isLogin
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        {message && <p className="message">{message}</p>}

        <button
          className="switch-button"
          onClick={() => {
            setIsLogin((current) => !current)
            setMessage('')
          }}
        >
          {isLogin
            ? "Don't have an account? Create one"
            : 'Already have an account? Sign in'}
        </button>
      </div>
    </main>
  )
}

function Dashboard({ session }) {
  const [meetings, setMeetings] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState(null)
  const [activeMeeting, setActiveMeeting] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  async function loadMeetings() {
    try {
      const data = await getMyMeetings()
      setMeetings(data)
    } catch (error) {
      setMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadMeetings()
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
  }

  function handleCreated(meeting) {
    setShowCreate(false)
    setMeetings((current) => [meeting, ...current])
    setSelectedMeeting(meeting)
  }

  function handleJoined(meeting) {
    setShowJoin(false)
    setSelectedMeeting(meeting)
  }

  function enterMeeting(meeting) {
    setSelectedMeeting(null)
    setActiveMeeting(meeting)
  }

  if (activeMeeting) {
    return (
      <MeetingRoom
        meeting={activeMeeting}
        session={session}
        onExit={() => {
          setActiveMeeting(null)
          loadMeetings()
        }}
      />
    )
  }

  return (
    <main className="dashboard">
      <header className="dashboard-header">
        <div>
          <p className="eyebrow">MEETING INTELLIGENCE</p>
          <h1>Your workspace</h1>
        </div>

        <button onClick={handleLogout}>Log out</button>
      </header>

      <section className="hero-card">
        <div>
          <p className="hero-label">WELCOME BACK</p>

          <h2>{session.user.email}</h2>

          <p>
            Start a meeting, invite others, and let the intelligence
            layer assist without automatically remembering everything.
          </p>
        </div>
      </section>

      {message && <p className="message">{message}</p>}

      <section className="action-grid">
        <button
          className="action-card"
          onClick={() => setShowCreate(true)}
        >
          <span>01</span>

          <h3>Create meeting</h3>

          <p>
            Start a new secure meeting session.
          </p>
        </button>

        <button
          className="action-card"
          onClick={() => setShowJoin(true)}
        >
          <span>02</span>

          <h3>Join meeting</h3>

          <p>
            Enter a meeting code and join.
          </p>
        </button>

        <div className="action-card">
          <span>03</span>

          <h3>Meeting memory</h3>

          <p>
            Control what your assistant remembers.
          </p>
        </div>
      </section>

      <section className="meetings-section">
        <div className="section-heading">
          <div>
            <p className="eyebrow">YOUR MEETINGS</p>

            <h2>Meeting history</h2>
          </div>
        </div>

        {loading ? (
          <p className="muted">
            Loading meetings...
          </p>
        ) : meetings.length === 0 ? (
          <div className="empty-state">
            <h3>No meetings yet</h3>

            <p>
              Create your first meeting to begin.
            </p>
          </div>
        ) : (
          <div className="meeting-list">
            {meetings.map((meeting) => (
              <button
                className="meeting-row"
                key={meeting.id}
                onClick={() => setSelectedMeeting(meeting)}
              >
                <div>
                  <strong>{meeting.title}</strong>

                  <span>
                    {meeting.meeting_code}
                  </span>
                </div>

                <div className="meeting-meta">
                  <span>
                    {meeting.memory_mode}
                  </span>

                  <span>
                    {meeting.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {showCreate && (
        <CreateMeetingModal
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}

      {showJoin && (
        <JoinMeetingModal
          onClose={() => setShowJoin(false)}
          onJoined={handleJoined}
        />
      )}

      {selectedMeeting && (
        <MeetingDetailsModal
          meeting={selectedMeeting}
          onClose={() => setSelectedMeeting(null)}
          onEnter={() => enterMeeting(selectedMeeting)}
        />
      )}
    </main>
  )
}

function CreateMeetingModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [memoryMode, setMemoryMode] = useState('private')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const meeting = await createMeeting(
        title,
        memoryMode
      )

      onCreated(meeting)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Create meeting"
      onClose={onClose}
    >
      <form onSubmit={handleCreate}>
        <label>Meeting title</label>

        <input
          value={title}
          onChange={(event) =>
            setTitle(event.target.value)
          }
          placeholder="e.g. Project planning"
          required
        />

        <label>Memory mode</label>

        <select
          value={memoryMode}
          onChange={(event) =>
            setMemoryMode(event.target.value)
          }
        >
          <option value="ephemeral">
            Ephemeral — don't retain after meeting
          </option>

          <option value="private">
            Private — encrypted persistent memory
          </option>

          <option value="persistent">
            Persistent — save meeting intelligence
          </option>
        </select>

        {error && (
          <p className="error">{error}</p>
        )}

        <button
          className="primary-button"
          disabled={loading}
        >
          {loading
            ? 'Creating...'
            : 'Create meeting'}
        </button>
      </form>
    </Modal>
  )
}

function JoinMeetingModal({ onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleJoin(event) {
    event.preventDefault()

    setError('')
    setLoading(true)

    try {
      const meeting = await joinMeeting(code)

      onJoined(meeting)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      title="Join meeting"
      onClose={onClose}
    >
      <form onSubmit={handleJoin}>
        <label>Meeting code</label>

        <input
          value={code}
          onChange={(event) =>
            setCode(
              event.target.value.toUpperCase()
            )
          }
          placeholder="XXXXXXXX"
          maxLength={8}
          required
        />

        {error && (
          <p className="error">{error}</p>
        )}

        <button
          className="primary-button"
          disabled={loading}
        >
          {loading
            ? 'Joining...'
            : 'Join meeting'}
        </button>
      </form>
    </Modal>
  )
}

function MeetingDetailsModal({
  meeting,
  onClose,
  onEnter,
}) {
  return (
    <Modal
      title={meeting.title}
      onClose={onClose}
    >
      <div className="meeting-details">
        <div>
          <span>Meeting code</span>

          <strong>
            {meeting.meeting_code}
          </strong>
        </div>

        <div>
          <span>Status</span>

          <strong>
            {meeting.status}
          </strong>
        </div>

        <div>
          <span>Memory mode</span>

          <strong>
            {meeting.memory_mode}
          </strong>
        </div>
      </div>

      <button
        className="primary-button"
        onClick={onEnter}
      >
        Enter meeting
      </button>
    </Modal>
  )
}

function Modal({
  title,
  onClose,
  children,
}) {
  return (
    <div
      className="modal-backdrop"
      onMouseDown={onClose}
    >
      <div
        className="modal"
        onMouseDown={(event) =>
          event.stopPropagation()
        }
      >
        <div className="modal-header">
          <h2>{title}</h2>

          <button
            className="close-button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  )
}

export default App
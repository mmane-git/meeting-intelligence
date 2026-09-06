import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
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
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
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
          'Account created. Check your email if email confirmation is required.'
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
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
            setIsLogin(!isLogin)
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
  async function handleLogout() {
    await supabase.auth.signOut()
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

      <section className="welcome-card">
        <p>Authenticated as</p>
        <h2>{session.user.email}</h2>
        <p>
          Your meeting intelligence workspace is ready. Meeting creation,
          live assistance and privacy-controlled memory are coming next.
        </p>
      </section>

      <section className="feature-grid">
        <div className="feature-card">
          <span>01</span>
          <h3>Create meeting</h3>
          <p>Start a secure meeting session.</p>
        </div>

        <div className="feature-card">
          <span>02</span>
          <h3>Join meeting</h3>
          <p>Join a meeting using its session ID.</p>
        </div>

        <div className="feature-card">
          <span>03</span>
          <h3>Meeting memory</h3>
          <p>Control what your assistant remembers.</p>
        </div>
      </section>
    </main>
  )
}

export default App
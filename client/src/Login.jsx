import { useState } from 'react'

export default function Login({ onLogin, onGoRegister, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      onLogin(data)
    } catch {
      setError('Conexiune eșuată')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2 className="auth-title">Autentificare</h2>
        <p className="auth-sub">Accesul la adevăr necesită identificare</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="text"
            placeholder="Utilizator"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoFocus
          />
          <input
            className="auth-input"
            type="password"
            placeholder="Parolă"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <p className={`auth-error${error.includes('suspendat') ? ' auth-banned' : ''}`}>{error}</p>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Se verifică...' : 'Intră'}
          </button>
        </form>
        <p className="auth-switch">
          Nu ai cont?{' '}
          <button className="auth-link" onClick={onGoRegister}>Înregistrează-te</button>
        </p>
        <p className="auth-switch">
          <button className="auth-link" onClick={onBack}>← Înapoi fără cont</button>
        </p>
      </div>
    </div>
  )
}

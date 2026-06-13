import { useState } from 'react'

const ROLES = [
  { value: 'user', label: 'Utilizator' },
  { value: 'journalist', label: 'Jurnalist' },
  { value: 'editor', label: 'Editor' },
]

export default function Register({ onRegister, onGoLogin, onBack }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('user')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onRegister(data)
    } catch {
      setError('Conexiune eșuată')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-box">
        <h2 className="auth-title">Înregistrare</h2>
        <p className="auth-sub">Alătură-te rețelei de informatori</p>
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
          <select
            className="auth-input auth-select"
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            {ROLES.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {error && <p className="auth-error">{error}</p>}
          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? 'Se creează...' : 'Creează cont'}
          </button>
        </form>
        <p className="auth-switch">
          Ai deja cont?{' '}
          <button className="auth-link" onClick={onGoLogin}>Autentifică-te</button>
        </p>
        <p className="auth-switch">
          <button className="auth-link" onClick={onBack}>← Înapoi fără cont</button>
        </p>
      </div>
    </div>
  )
}

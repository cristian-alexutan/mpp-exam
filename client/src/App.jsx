import { useState, useEffect } from 'react'
import Login from './Login'
import Register from './Register'
import './App.css'

const ROLE_COLOR = {
  admin:      'rgba(160, 0, 0, 0.18)',
  editor:     'rgba(160, 130, 0, 0.18)',
  journalist: 'rgba(0, 80, 180, 0.18)',
  user:       'rgba(0, 120, 0, 0.18)',
}

function Logo() {
  return (
    <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="22" stroke="#c8a84b" strokeWidth="2" />
      <circle cx="24" cy="24" r="4" fill="#c8a84b" />
      <line x1="24" y1="2" x2="24" y2="12" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="24" y1="36" x2="24" y2="46" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="2" y1="24" x2="12" y2="24" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="36" y1="24" x2="46" y2="24" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="7" y1="7" x2="14" y2="14" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="34" y1="34" x2="41" y2="41" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="41" y1="7" x2="34" y2="14" stroke="#c8a84b" strokeWidth="1.5" />
      <line x1="14" y1="34" x2="7" y2="41" stroke="#c8a84b" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="10" stroke="#c8a84b" strokeWidth="1" strokeDasharray="2 3" />
    </svg>
  )
}

function Sidebar({ articles, selectedId, onSelect, user, onLogin, onLogout }) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header" style={{ background: user ? ROLE_COLOR[user.role] : undefined }}>
        <Logo />
        <div className="brand">
          <h1 className="brand-title">Teoria Transpirației</h1>
          <p className="brand-sub">Adevărul pe care nu vor să-l știi</p>
        </div>
      </div>
      <div className="user-bar">
        {user ? (
          <>
            <span className={`user-role role-${user.role}`}>{user.role}</span>
            <span className="user-name">{user.username}</span>
            <button className="logout-btn" onClick={onLogout}>Ieși</button>
          </>
        ) : (
          <button className="login-btn" onClick={onLogin}>Intră în cont</button>
        )}
      </div>
      <nav className="article-list">
        {articles.map(a => (
          <button
            key={a.id}
            className={`article-item${selectedId === a.id ? ' active' : ''}`}
            onClick={() => onSelect(a.id)}
          >
            <span className="article-item-title">{a.title}</span>
            <span className="article-item-date">{a.date}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

function Landing() {
  return (
    <div className="landing">
      <div className="landing-logo">
        <Logo />
        <Logo />
        <Logo />
      </div>
      <h2 className="landing-headline">Teoria Transpirației</h2>
      <p className="landing-tagline">
        Jurnalism independent. Surse anonime. Adevăruri incomode.
      </p>
      <p className="landing-desc">
        Într-o lume în care mass-media mainstream repetă același script, noi punem
        întrebările pe care altora le e frică să le rostească. Selectați un articol
        din stânga pentru a începe să vedeți imaginea de ansamblu.
      </p>
      <div className="landing-warning">
        ⚠ Conținutul acestui ziar poate provoca trezire la realitate. Citiți pe propria răspundere.
      </div>
    </div>
  )
}

function ArticleDetail({ id, onBack }) {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/articles/${id}`)
      .then(r => r.json())
      .then(data => { setArticle(data); setLoading(false) })
  }, [id])

  if (loading) return <div className="loading">Se încarcă...</div>

  return (
    <article className="detail">
      <button className="back-btn" onClick={onBack}>← Înapoi</button>
      <p className="detail-date">{article.date}</p>
      <h2 className="detail-title">{article.title}</h2>
      <p className="detail-summary">{article.summary}</p>
      <hr className="detail-divider" />
      <div className="detail-body">
        {article.body.split('\n\n').map((para, i) => (
          <p key={i}>{para}</p>
        ))}
      </div>
    </article>
  )
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tt_user')) } catch { return null }
  })
  const [view, setView] = useState('app')
  const [articles, setArticles] = useState([])
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    fetch('/api/articles')
      .then(r => r.json())
      .then(setArticles)
  }, [])

  function handleLogin(userData) {
    localStorage.setItem('tt_user', JSON.stringify(userData))
    setUser(userData)
    setView('app')
  }

  function handleLogout() {
    localStorage.removeItem('tt_user')
    setUser(null)
    setSelectedId(null)
  }

  if (view === 'login') {
    return <Login onLogin={handleLogin} onGoRegister={() => setView('register')} onBack={() => setView('app')} />
  }
  if (view === 'register') {
    return <Register onRegister={handleLogin} onGoLogin={() => setView('login')} onBack={() => setView('app')} />
  }

  return (
    <div className="layout">
      <Sidebar
        articles={articles}
        selectedId={selectedId}
        onSelect={setSelectedId}
        user={user}
        onLogin={() => setView('login')}
        onLogout={handleLogout}
      />
      <main className="main">
        {selectedId
          ? <ArticleDetail id={selectedId} onBack={() => setSelectedId(null)} />
          : <Landing />
        }
      </main>
    </div>
  )
}

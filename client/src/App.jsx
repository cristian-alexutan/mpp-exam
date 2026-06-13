import { useState, useEffect } from 'react'
import Login from './Login'
import Register from './Register'
import Editor from './Editor'
import Dashboard from './Dashboard'
import { apiFetch } from './api'
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

function Sidebar({ articles, selectedId, onSelect, user, onLogin, onLogout, onOpenEditor, onOpenDashboard }) {
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
            {user.role === 'admin' && (
              <button className="logout-btn" onClick={onOpenDashboard} title="Dashboard">⊞</button>
            )}
            {(user.role === 'editor' || user.role === 'admin' || user.role === 'journalist') && (
              <button className="logout-btn" onClick={onOpenEditor} title="Redacție">✎</button>
            )}
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
            <div className="article-item-meta">
              <span className="article-item-date">{a.date}</span>
              <span className={`article-status-dot status-${a.status}`} title={a.status} />
            </div>
          </button>
        ))}
      </nav>
    </aside>
  )
}

function Recommendations({ user, onSelect }) {
  const [recs, setRecs] = useState([])

  useEffect(() => {
    if (!user || user.role !== 'user') return
    apiFetch('/api/recommendations')
      .then(r => r.ok ? r.json() : [])
      .then(setRecs)
  }, [user])

  if (!user || user.role !== 'user' || recs.length === 0) return null

  return (
    <div className="recommendations">
      <h3 className="recommendations-title">Recomandate pentru tine</h3>
      <div className="recommendations-list">
        {recs.map(a => (
          <button key={a.id} className="recommendation-item" onClick={() => onSelect(a.id)}>
            {a.title}
          </button>
        ))}
      </div>
    </div>
  )
}

function Landing({ user, onSelect }) {
  return (
    <div className="landing">
      <div className="landing-logo"><Logo /><Logo /><Logo /></div>
      <h2 className="landing-headline">Teoria Transpirației</h2>
      <p className="landing-tagline">Jurnalism independent. Surse anonime. Adevăruri incomode.</p>
      <p className="landing-desc">
        Într-o lume în care mass-media mainstream repetă același script, noi punem
        întrebările pe care altora le e frică să le rostească. Selectați un articol
        din stânga pentru a începe să vedeți imaginea de ansamblu.
      </p>
      <div className="landing-warning">
        ⚠ Conținutul acestui ziar poate provoca trezire la realitate. Citiți pe propria răspundere.
      </div>
      <Recommendations user={user} onSelect={onSelect} />
    </div>
  )
}

function UserComments({ articleId, canPost }) {
  const [comments, setComments] = useState([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [posting, setPosting] = useState(false)

  useEffect(() => {
    apiFetch(`/api/articles/${articleId}/user-comments`)
      .then(r => r.ok ? r.json() : [])
      .then(setComments)
  }, [articleId])

  async function submit(e) {
    e.preventDefault()
    if (!text.trim()) { setError('Comentariul nu poate fi gol'); return }
    setError('')
    setPosting(true)
    const res = await apiFetch(`/api/articles/${articleId}/user-comments`, {
      method: 'POST', body: { text },
    })
    setPosting(false)
    if (res.ok) {
      const c = await res.json()
      setComments(prev => [...prev, c])
      setText('')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Eroare la postare')
    }
  }

  return (
    <div className="user-comments">
      <h3 className="user-comments-title">Comentarii ({comments.length})</h3>
      <div className="user-comments-list">
        {comments.length === 0 && (
          <p className="user-comments-empty">Fii primul care comentează.</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="user-comment">
            <div className="user-comment-meta">
              <span className="user-comment-author">{c.author}</span>
              <span className="user-comment-date">{c.created_at}</span>
              {c.sentiment && (
                <span className={`sentiment-badge sentiment-${c.sentiment}`}>{c.sentiment}</span>
              )}
            </div>
            <p className="user-comment-text">{c.text}</p>
          </div>
        ))}
      </div>
      {canPost && (
        <form className="user-comment-form" onSubmit={submit}>
          <textarea
            className="user-comment-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Lasă un comentariu..."
            rows={3}
            maxLength={1000}
          />
          {error && <p className="field-error">{error}</p>}
          <button className="editor-btn" type="submit" disabled={posting}>
            {posting ? 'Se analizează...' : 'Trimite'}
          </button>
        </form>
      )}
    </div>
  )
}

function ArticleDetail({ id, user, onBack }) {
  const [article, setArticle] = useState(null)
  const [loading, setLoading] = useState(true)

  const canReact = user?.role === 'user'

  useEffect(() => {
    setLoading(true)
    apiFetch(`/api/articles/${id}`)
      .then(r => r.json())
      .then(data => { setArticle(data); setLoading(false) })
  }, [id])

  async function react(type) {
    const res = await apiFetch(`/api/articles/${id}/react`, { method: 'POST', body: { type } })
    if (res.ok) {
      const data = await res.json()
      setArticle(a => ({ ...a, likes: data.likes, dislikes: data.dislikes, userReaction: data.userReaction }))
    }
  }

  if (loading) return <div className="loading">Se încarcă...</div>

  return (
    <article className="detail">
      <button className="back-btn" onClick={onBack}>← Înapoi</button>
      <p className="detail-date">{article.date}</p>
      <h2 className="detail-title">{article.title}</h2>
      <hr className="detail-divider" />
      <div className="detail-body">
        {article.paragraphs.map((para, i) => (
          <div key={para.id}>
            <p className={i === 0 ? 'detail-summary' : ''}>{para.text}</p>
            {para.images.length > 0 && (
              <div className="detail-images">
                {para.images.map(img => (
                  <img key={img.id} src={`/uploads/${img.path}`} alt="" className="detail-image" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {article.journalists.length > 0 && (
        <p className="detail-journalists">
          Jurnaliști: {article.journalists.map(j => j.username).join(', ')}
        </p>
      )}
      <div className="reaction-bar">
        <button
          className={`reaction-btn like${article.userReaction === 'like' ? ' active' : ''}`}
          onClick={() => canReact && react('like')}
          disabled={!canReact}
          title={canReact ? 'Apreciez' : ''}
        >
          👍 <span className="reaction-count">{article.likes}</span>
        </button>
        <button
          className={`reaction-btn dislike${article.userReaction === 'dislike' ? ' active' : ''}`}
          onClick={() => canReact && react('dislike')}
          disabled={!canReact}
          title={canReact ? 'Nu apreciez' : ''}
        >
          👎 <span className="reaction-count">{article.dislikes}</span>
        </button>
      </div>
      {user && <UserComments articleId={id} canPost={user.role === 'user'} />}
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
    if (view === 'app') {
      apiFetch('/api/articles').then(r => r.json()).then(setArticles)
    }
  }, [view])

  function handleLogin(userData) {
    localStorage.setItem('tt_user', JSON.stringify(userData))
    setUser(userData)
    setView('app')
  }

  function handleLogout() {
    localStorage.removeItem('tt_user')
    setUser(null)
    setSelectedId(null)
    setView('app')
  }

  useEffect(() => {
    function onAuthExpired() {
      localStorage.removeItem('tt_user')
      setUser(null)
      setSelectedId(null)
      setView('login')
    }
    window.addEventListener('auth:expired', onAuthExpired)
    return () => window.removeEventListener('auth:expired', onAuthExpired)
  }, [])

  const sidebarProps = {
    articles,
    selectedId,
    onSelect: setSelectedId,
    user,
    onLogin: () => setView('login'),
    onLogout: handleLogout,
    onOpenEditor: () => setView('editor'),
    onOpenDashboard: () => setView('dashboard'),
  }

  if (view === 'login') return <Login onLogin={handleLogin} onGoRegister={() => setView('register')} onBack={() => setView('app')} />
  if (view === 'register') return <Register onRegister={handleLogin} onGoLogin={() => setView('login')} onBack={() => setView('app')} />
  if (view === 'editor') return (
    <div className="layout">
      <Sidebar {...sidebarProps} selectedId={null} onSelect={() => {}} />
      <main className="main"><Editor user={user} onBack={() => setView('app')} /></main>
    </div>
  )
  if (view === 'dashboard') return (
    <div className="layout">
      <Sidebar {...sidebarProps} selectedId={null} onSelect={() => {}} />
      <main className="main"><Dashboard onBack={() => setView('app')} /></main>
    </div>
  )

  return (
    <div className="layout">
      <Sidebar {...sidebarProps} />
      <main className="main">
        {selectedId
          ? <ArticleDetail id={selectedId} user={user} onBack={() => setSelectedId(null)} />
          : <Landing user={user} onSelect={setSelectedId} />
        }
      </main>
    </div>
  )
}

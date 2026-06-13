import { useState, useEffect } from 'react'
import ArticleEditor from './ArticleEditor'
import { apiFetch } from './api'

const STATUS_LABEL = { started: 'Început', pending: 'În așteptare', finished: 'Finalizat' }

export default function Editor({ onBack }) {
  const [articles, setArticles] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (!editingId && !creating) {
      apiFetch('/api/articles').then(r => r.json()).then(setArticles)
    }
  }, [editingId, creating])

  if (creating) {
    return <ArticleEditor articleId={null} onBack={() => setCreating(false)} />
  }

  if (editingId !== null) {
    return <ArticleEditor articleId={editingId} onBack={() => setEditingId(null)} />
  }

  return (
    <div className="editor-list">
      <div className="editor-list-header">
        <h2 className="editor-list-title">Redacție</h2>
        <div className="editor-list-actions">
          <button className="editor-btn" onClick={() => setCreating(true)}>+ Articol nou</button>
          <button className="editor-btn secondary" onClick={onBack}>Înapoi la ziar</button>
        </div>
      </div>

      <div className="editor-article-list">
        {articles.length === 0 && <p className="editor-empty">Nu există articole.</p>}
        {articles.map(a => (
          <button key={a.id} className="editor-article-row" onClick={() => setEditingId(a.id)}>
            <div className="editor-article-info">
              <span className="editor-article-title">{a.title}</span>
              <span className="editor-article-date">{a.date}</span>
            </div>
            <span className={`editor-status-badge status-${a.status}`}>{STATUS_LABEL[a.status]}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

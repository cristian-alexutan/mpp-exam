import { useState, useEffect } from 'react'
import { apiFetch } from './api'

function ImageList({ images, paragraphId, onDelete }) {
  return (
    <div className="image-list">
      {images.map(img => (
        <div key={img.id} className="image-item">
          <img src={`/uploads/${img.path}`} alt="" className="thumb" />
          <button className="img-delete-btn" onClick={() => onDelete(paragraphId, img.id)}>✕</button>
        </div>
      ))}
    </div>
  )
}

function CommentSection({ paragraphId, initialComments, readOnly }) {
  const [comments, setComments] = useState(initialComments || [])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  async function addComment() {
    if (!text.trim()) { setError('Comentariul nu poate fi gol'); return }
    setError('')
    const res = await apiFetch(`/api/paragraphs/${paragraphId}/comments`, {
      method: 'POST', body: { text },
    })
    if (res.ok) {
      const comment = await res.json()
      setComments(c => [...c, comment])
      setText('')
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Eroare la adăugare comentariu')
    }
  }

  async function resolveComment(id, currentStatus) {
    const res = await apiFetch(`/api/comments/${id}/resolve`, { method: 'PATCH' })
    if (res.ok) {
      const data = await res.json()
      setComments(c => c.map(c => c.id === id ? { ...c, status: data.status } : c))
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Eroare la actualizare status')
    }
  }

  async function deleteComment(id) {
    const res = await apiFetch(`/api/comments/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Eroare la ștergere comentariu')
      return
    }
    setComments(c => c.filter(c => c.id !== id))
  }

  if (comments.length === 0 && readOnly) return null

  return (
    <div className="comment-section">
      <p className="comment-section-title">Comentarii redacție ({comments.length})</p>
      {comments.map(c => (
        <div key={c.id} className={`comment-item${c.status === 'resolved' ? ' comment-resolved' : ''}`}>
          <div className="comment-meta">
            <span className="comment-author">{c.author}</span>
            <span className="comment-date">{c.created_at}</span>
            <span className={`comment-status-badge ${c.status === 'resolved' ? 'resolved' : 'unresolved'}`}>
              {c.status === 'resolved' ? 'Rezolvat' : 'Nerezolvat'}
            </span>
            {!readOnly && (
              <>
                <button
                  className={`comment-resolve-btn ${c.status === 'resolved' ? 'unresolve' : 'resolve'}`}
                  onClick={() => resolveComment(c.id, c.status)}
                  title={c.status === 'resolved' ? 'Marchează ca nerezolvat' : 'Marchează ca rezolvat'}
                >
                  {c.status === 'resolved' ? '↩' : '✓'}
                </button>
                <button className="comment-delete" onClick={() => deleteComment(c.id)}>✕</button>
              </>
            )}
          </div>
          <p className="comment-text">{c.text}</p>
        </div>
      ))}
      {error && <p className="field-error">{error}</p>}
      {!readOnly && (
        <div className="comment-add">
          <input
            className="editor-input comment-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Adaugă comentariu..."
            onKeyDown={e => e.key === 'Enter' && addComment()}
          />
          <button className="editor-btn" onClick={addComment}>Adaugă</button>
        </div>
      )}
    </div>
  )
}

function ParagraphRow({ para, articleId, onUpdate, onDelete, onMove, isFirst, isLast, isJournalist }) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(para.text)
  const [textError, setTextError] = useState('')
  const [uploading, setUploading] = useState(false)

  async function saveText() {
    if (!text.trim()) { setTextError('Textul nu poate fi gol'); return; }
    setTextError('')
    const res = await apiFetch(`/api/paragraphs/${para.id}`, { method: 'PUT', body: { text } })
    if (res.ok) {
      onUpdate(para.id, text); setEditing(false)
    } else {
      const data = await res.json().catch(() => ({}))
      setTextError(data.error || 'Eroare la salvare')
    }
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { alert('Selectați un fișier imagine'); return }
    if (file.size > 5 * 1024 * 1024) { alert('Imaginea trebuie să fie sub 5MB'); return }

    setUploading(true)
    const fd = new FormData()
    fd.append('image', file)
    const res = await apiFetch(`/api/paragraphs/${para.id}/images`, { method: 'POST', body: fd })
    if (res.ok) {
      const img = await res.json()
      onUpdate(para.id, null, [...para.images, img])
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Eroare la încărcare imagine')
    }
    setUploading(false)
    e.target.value = ''
  }

  async function handleDeleteImage(paragraphId, imageId) {
    if (!confirm('Ștergeți imaginea?')) return
    const res = await apiFetch(`/api/images/${imageId}`, { method: 'DELETE' })
    if (res.ok) {
      onUpdate(para.id, null, para.images.filter(i => i.id !== imageId))
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Eroare la ștergere imagine')
    }
  }

  return (
    <div className="para-row">
      <div className="para-header">
        <div className="para-order-btns">
          {!isJournalist && (
            <button className="para-order-btn" onClick={() => onMove(para.id, 'up')} disabled={isFirst} title="Mută sus">▲</button>
          )}
          <span className="para-index">§ {para.order_index + 1}</span>
          {!isJournalist && (
            <button className="para-order-btn" onClick={() => onMove(para.id, 'down')} disabled={isLast} title="Mută jos">▼</button>
          )}
        </div>
        <div className="para-actions">
          {!editing && <button className="para-btn" onClick={() => setEditing(true)}>Editează</button>}
          <button className="para-btn danger" onClick={() => onDelete(para.id)}>Șterge</button>
        </div>
      </div>

      {editing ? (
        <div className="para-edit">
          <textarea
            className="para-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            rows={4}
          />
          {textError && <p className="field-error">{textError}</p>}
          <div className="para-edit-actions">
            <button className="editor-btn" onClick={saveText}>Salvează</button>
            <button className="editor-btn secondary" onClick={() => { setEditing(false); setText(para.text); setTextError('') }}>Anulează</button>
          </div>
        </div>
      ) : (
        <p className="para-preview">{para.text}</p>
      )}

      <ImageList images={para.images} paragraphId={para.id} onDelete={handleDeleteImage} />

      <label className="img-upload-label">
        {uploading ? 'Se încarcă...' : '+ Adaugă imagine'}
        <input type="file" accept="image/*" onChange={handleImageUpload} disabled={uploading} style={{ display: 'none' }} />
      </label>

      {para.comments !== undefined && (
        <CommentSection
          paragraphId={para.id}
          initialComments={para.comments}
          readOnly={isJournalist}
        />
      )}
    </div>
  )
}

export default function ArticleEditor({ articleId: initialId, onBack, user }) {
  const [article, setArticle] = useState(null)
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState('')
  const [newParaText, setNewParaText] = useState('')
  const [newParaError, setNewParaError] = useState('')
  const [actionError, setActionError] = useState('')
  const [journalists, setJournalists] = useState([])
  const [saving, setSaving] = useState(false)

  const isNew = !initialId
  const isJournalist = user?.role === 'journalist'

  useEffect(() => {
    if (!isJournalist) {
      apiFetch('/api/users/journalists').then(r => r.json()).then(setJournalists)
    }
    if (!isNew) {
      apiFetch(`/api/articles/${initialId}`).then(r => r.json()).then(a => {
        setArticle(a)
        setTitle(a.title)
      })
    } else {
      setArticle(null)
    }
  }, [initialId])

  function validateTitle() {
    if (!title.trim()) { setTitleError('Titlul este obligatoriu'); return false }
    if (title.trim().length > 200) { setTitleError('Titlul trebuie să aibă sub 200 de caractere'); return false }
    setTitleError('')
    return true
  }

  async function createArticle() {
    if (!validateTitle()) return
    setSaving(true)
    const res = await apiFetch('/api/articles', { method: 'POST', body: { title } })
    const data = await res.json()
    if (!res.ok) { setTitleError(data.error); setSaving(false); return }
    setArticle(data)
    setSaving(false)
  }

  async function saveHeader() {
    if (!validateTitle()) return
    setSaving(true)
    const res = await apiFetch(`/api/articles/${article.id}`, { method: 'PUT', body: { title } })
    if (res.ok) {
      const data = await res.json()
      setArticle(a => ({ ...a, title: data.title, date: data.date }))
    } else {
      const data = await res.json().catch(() => ({}))
      setTitleError(data.error || 'Eroare la salvare titlu')
    }
    setSaving(false)
  }

  async function changeStatus(status) {
    setActionError('')
    const res = await apiFetch(`/api/articles/${article.id}/status`, { method: 'PATCH', body: { status } })
    if (res.ok) {
      const data = await res.json()
      setArticle(a => ({ ...a, status: data.status, date: data.date }))
    } else {
      const data = await res.json().catch(() => ({}))
      setActionError(data.error || 'Eroare la schimbare status')
    }
  }

  async function toggleJournalist(jid) {
    setActionError('')
    const current = article.journalists.map(j => j.id)
    const next = current.includes(jid) ? current.filter(id => id !== jid) : [...current, jid]
    const res = await apiFetch(`/api/articles/${article.id}/journalists`, {
      method: 'PUT', body: { journalistIds: next }
    })
    if (res.ok) {
      setArticle(a => ({
        ...a,
        journalists: next.map(id => journalists.find(j => j.id === id)).filter(Boolean)
      }))
    } else {
      const data = await res.json().catch(() => ({}))
      setActionError(data.error || 'Eroare la actualizare jurnaliști')
    }
  }

  async function addParagraph() {
    if (!newParaText.trim()) { setNewParaError('Textul paragrafului este obligatoriu'); return }
    setNewParaError('')
    const res = await apiFetch(`/api/articles/${article.id}/paragraphs`, {
      method: 'POST', body: { text: newParaText }
    })
    if (res.ok) {
      const para = await res.json()
      setArticle(a => ({ ...a, paragraphs: [...a.paragraphs, para] }))
      setNewParaText('')
    } else {
      const data = await res.json().catch(() => ({}))
      setNewParaError(data.error || 'Eroare la adăugare paragraf')
    }
  }

  async function moveParagraph(paraId, direction) {
    const res = await apiFetch(`/api/paragraphs/${paraId}/move`, { method: 'PATCH', body: { direction } })
    if (res.ok) {
      setArticle(a => {
        const paras = a.paragraphs.map(p => ({ ...p }))
        const idx = paras.findIndex(p => p.id === paraId)
        const swapIdx = direction === 'up' ? idx - 1 : idx + 1
        const tmp = paras[idx].order_index
        paras[idx].order_index = paras[swapIdx].order_index
        paras[swapIdx].order_index = tmp
        paras.sort((a, b) => a.order_index - b.order_index)
        return { ...a, paragraphs: paras }
      })
    } else {
      const data = await res.json().catch(() => ({}))
      setActionError(data.error || 'Eroare la mutare paragraf')
    }
  }

  function updateParagraph(paraId, newText, newImages) {
    setArticle(a => ({
      ...a,
      paragraphs: a.paragraphs.map(p => p.id === paraId
        ? { ...p, ...(newText !== null ? { text: newText } : {}), ...(newImages !== undefined ? { images: newImages } : {}) }
        : p
      )
    }))
  }

  async function deleteParagraph(paraId) {
    if (!confirm('Ștergeți paragraful și imaginile sale?')) return
    const res = await apiFetch(`/api/paragraphs/${paraId}`, { method: 'DELETE' })
    if (res.ok) {
      setArticle(a => ({ ...a, paragraphs: a.paragraphs.filter(p => p.id !== paraId) }))
    } else {
      const data = await res.json().catch(() => ({}))
      setActionError(data.error || 'Eroare la ștergere paragraf')
    }
  }

  return (
    <div className="article-editor">
      <button className="back-btn" onClick={onBack}>← Înapoi la articole</button>

      {actionError && <p className="field-error" style={{ marginBottom: '1rem' }}>{actionError}</p>}

      <div className="editor-section">
        <h3 className="editor-section-title">{isNew && !article ? 'Articol nou' : 'Detalii articol'}</h3>

        {isJournalist ? (
          <p className="editor-date-display">
            <span className="editor-label">Titlu: </span>{article?.title}
          </p>
        ) : (
          <div className="editor-field">
            <label className="editor-label">Titlu</label>
            <input className="editor-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="Titlul articolului" />
            {titleError && <p className="field-error">{titleError}</p>}
          </div>
        )}

        {article && (
          <p className="editor-date-display">
            <span className="editor-label">Ultima modificare: </span>{article.date}
          </p>
        )}

        {!isJournalist && (
          !article ? (
            <button className="editor-btn" onClick={createArticle} disabled={saving}>
              {saving ? 'Se creează...' : 'Creează articol'}
            </button>
          ) : (
            <button className="editor-btn" onClick={saveHeader} disabled={saving}>
              {saving ? 'Se salvează...' : 'Salvează titlu'}
            </button>
          )
        )}
      </div>

      {article && (
        <>
          {!isJournalist && (
            <div className="editor-section">
              <h3 className="editor-section-title">Status</h3>
              <div className="status-row">
                {['started', 'pending', 'finished'].map(s => (
                  <button
                    key={s}
                    className={`status-btn ${article.status === s ? 'active' : ''} status-${s}`}
                    onClick={() => changeStatus(s)}
                  >
                    {s === 'started' ? 'Început' : s === 'pending' ? 'În așteptare' : 'Finalizat'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {!isJournalist && journalists.length > 0 && (
            <div className="editor-section">
              <h3 className="editor-section-title">Jurnaliști asignați</h3>
              <div className="journalist-list">
                {journalists.map(j => {
                  const checked = article.journalists.some(aj => aj.id === j.id)
                  const atLimit = article.journalists.length >= 2
                  return (
                    <label key={j.id} className={`journalist-check${!checked && atLimit ? ' disabled' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!checked && atLimit}
                        onChange={() => toggleJournalist(j.id)}
                      />
                      {j.username}
                    </label>
                  )
                })}
              </div>
            </div>
          )}

          <div className="editor-section">
            <h3 className="editor-section-title">Paragrafe</h3>
            {article.paragraphs.map((para, i) => (
              <ParagraphRow
                key={para.id}
                para={para}
                articleId={article.id}
                onUpdate={updateParagraph}
                onDelete={deleteParagraph}
                onMove={moveParagraph}
                isFirst={i === 0}
                isLast={i === article.paragraphs.length - 1}
                isJournalist={isJournalist}
              />
            ))}
            <div className="new-para">
              <textarea
                className="para-textarea"
                placeholder="Text paragraf nou..."
                value={newParaText}
                onChange={e => setNewParaText(e.target.value)}
                rows={3}
              />
              {newParaError && <p className="field-error">{newParaError}</p>}
              <button className="editor-btn" onClick={addParagraph}>+ Adaugă paragraf</button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
